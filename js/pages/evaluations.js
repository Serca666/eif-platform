/* ================================================================
   EIF Platform — Motor de Evaluaciones
   ================================================================ */

let currentExam = null;
let currentQuestionIndex = 0;

function renderEvaluations(container) {
  const user = Auth.currentUser;
  const isAdmin = user.rol === 'admin' || user.rol === 'capacitador';

  let html = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Evaluaciones</h2>
        <p class="page-description">${isAdmin ? 'Gestión de casos situacionales y simulaciones' : 'Tus evaluaciones asignadas'}</p>
      </div>
      ${isAdmin ? `
      <div class="page-actions">
        <button class="btn btn-outline" onclick="showCaseBank()">${icon('records', 16)} Banco de Casos (PBi)</button>
        <button class="btn btn-primary" onclick="showGenerateLink()">${icon('link', 16)} Generar Enlace</button>
      </div>` : ''}
    </div>
  `;

  // Evaluaciones disponibles
  const modules = Store.getModulesByLevel(user.nivel_jerarquico || 5);

  html += `
    <div class="grid-auto-fit stagger-children">
  `;

  modules.filter(m => m.estado === 'activo').forEach(m => {
    const typeInfo = EIF_CONFIG.CONTENT_TYPES[m.tipo_contenido];
    const attempted = m.progress > 0;
    const passed = m.progress === 100;

    html += `
      <div class="card ${passed ? '' : 'card-interactive'}" ${!passed ? `onclick="startExam('${m.id}')"` : ''}>
        <div class="flex items-center gap-4 mb-4">
          <div class="kpi-icon ${passed ? 'success' : attempted ? 'accent' : 'primary'}" style="width:48px;height:48px;border-radius:12px;font-size:24px">
            ${passed ? '✅' : typeInfo?.icon || '📋'}
          </div>
          <div class="flex-1">
            <h4 class="text-md font-semibold">${m.titulo}</h4>
            <p class="text-xs text-tertiary">${m.duracion_estimada} · 15 preguntas</p>
          </div>
          ${passed
        ? '<span class="badge badge-success">Aprobado</span>'
        : attempted
          ? '<span class="badge badge-primary">1 intento usado</span>'
          : '<span class="badge badge-neutral">Sin intentos</span>'
      }
        </div>
        <p class="text-sm text-tertiary mb-4 line-clamp-2">${m.descripcion}</p>
        <div class="flex items-center justify-between">
          <div class="text-xs text-tertiary">Máx. ${EIF_CONFIG.EXAM_DEFAULT_MAX_ATTEMPTS} intentos · TTL ${EIF_CONFIG.EXAM_LINK_TTL_HOURS}h</div>
          ${!passed ? `<button class="btn btn-primary btn-sm">Comenzar ${icon('chevronRight', 14)}</button>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';

  container.innerHTML = html;
}

// Generador de exámenes vía IA
async function startExam(moduleId) {
  const container = document.getElementById('app-content');
  const m = Store.getModuleById(moduleId);
  
  // Buscar si hay un caso relacionado en el banco de casos (por título o keyword)
  const relatedCase = Store.caseBank.find(c => 
    c.titulo.toLowerCase().includes(m.titulo.toLowerCase().split(' ')[0]) || 
    m.descripcion.toLowerCase().includes(c.titulo.toLowerCase())
  ) || Store.caseBank[0]; // Fallback al primer caso si no hay match

  // Pantalla de carga IA
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-screen text-center animate-fade-in">
      <div>
        <div class="spinner mb-4" style="border-width:3px; border-top-color:var(--color-primary-500); width:48px; height:48px;"></div>
        <h3 class="text-xl font-bold mb-2">Generando Evaluación Situacional...</h3>
        <p class="text-sm text-tertiary">Analizando el tablero "${relatedCase?.titulo || 'General'}" para diseñar tu desafío.</p>
      </div>
    </div>
  `;

  let generatedQuestions = [];
  const apiKey = EIF_CONFIG.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');

  try {
    if (apiKey && apiKey.length > 10) {
      const base64Content = relatedCase?.imagen_url ? relatedCase.imagen_url.split(',')[1] : null;

      const prompt = `Actúa como un experto en capacitación para Megatlon. 
Estamos evaluando el módulo: "${m?.titulo}".
Contexto Situacional (CASO): ${relatedCase?.titulo}.
Descripción del Caso: ${relatedCase?.descripcion}.

Tu tarea: Generar exactamente 5 preguntas de opción múltiple de alta complejidad sobre cómo resolver esta situación o interpretar los datos del tablero.
Instrucciones:
1. Las preguntas deben ser CRÍTICAS y DECISIONALES.
2. Devuelve ÚNICAMENTE un array JSON puro. Sin explicaciones ni markdown.
3. Formato requerido: [{"id":"q1","tipo":"single","dificultad":"alta","enunciado":"¿...?","opciones":["A","B","C","D"],"respuesta_correcta":0}]`;

      const parts = [{ text: prompt }];
      if (base64Content) {
        parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Content } });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        let textResponse = data.candidates[0].content.parts[0].text;
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').replace(/^JSON/i, '').trim();
        generatedQuestions = JSON.parse(cleanJson);
      } else {
        throw new Error("Respuesta de IA vacía");
      }
    } else {
      // Fallback: Generador Mock Aleatorio (Si no hay IA)
      await new Promise(r => setTimeout(r, 1500));
      for (let i = 0; i < 5; i++) {
        generatedQuestions.push({
          id: 'ai_q_' + i, tipo: 'single', dificultad: 'media',
          enunciado: `Pregunta de Simulación ${i + 1}: Sobre el caso "${relatedCase?.titulo}", ¿cuál es el impacto principal en los KPIs?`,
          opciones: ['Impacto Negativo en Retención', 'Mejora en la satisfacción', 'Neutral', 'Requiere más datos'],
          respuesta_correcta: 0
        });
      }
    }
  } catch (error) {
    console.error("Error IA:", error);
    generatedQuestions = Store.getQuestionsForModule(moduleId, 5);
  }

  currentExam = { 
    moduleId, 
    questions: generatedQuestions, 
    answers: {}, 
    startTime: Date.now(),
    caseData: relatedCase // Guardamos el caso para mostrar la imagen en el examen
  };
  currentQuestionIndex = 0;

  setTimeout(() => renderExamQuestion(), 500);
}

function renderExamQuestion() {
  const container = document.getElementById('app-content');
  const exam = currentExam;
  if (!exam) return;

  const q = exam.questions[currentQuestionIndex];
  const total = exam.questions.length;
  const elapsed = Math.floor((Date.now() - exam.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  let html = `
    <div class="exam-container animate-fade-in">
      <div class="exam-header">
        <div class="exam-progress-info">
          <span class="exam-question-counter">Pregunta <span>${currentQuestionIndex + 1}</span> de ${total}</span>
          <div class="exam-progress-bar">
            <div class="progress progress-sm"><div class="progress-bar" style="width:${((currentQuestionIndex + 1) / total) * 100}%"></div></div>
          </div>
        </div>
        <div class="exam-timer">
          ${icon('clock', 16)}
          <span>${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>
        </div>
      </div>

      <div class="question-card">
        <div class="question-number">${icon('evaluations', 14)} Pregunta ${currentQuestionIndex + 1}</div>
        
        ${exam.caseData && exam.caseData.imagen_url ? `
          <div class="exam-case-image-container mb-4">
            <p class="text-xs font-bold text-tertiary mb-2 uppercase">Análisis de Tablero: ${exam.caseData.titulo}</p>
            <img src="${exam.caseData.imagen_url}" class="exam-case-image">
          </div>
        ` : ''}

        <p class="question-text">${q.enunciado || 'Pregunta sin enunciado'}</p>
  `;

  if (q.tipo === 'caso') {
    html += `
        <textarea class="case-study-textarea" placeholder="Escribí tu respuesta aquí..."
          oninput="currentExam.answers['${q.id}'] = this.value">${exam.answers[q.id] || ''}</textarea>
        <div class="case-study-counter"><span id="char-count">${(exam.answers[q.id] || '').length}</span> caracteres</div>
    `;
  } else {
    html += '<div class="answer-options">';
    const letters = ['A', 'B', 'C', 'D', 'E'];
    (q.opciones || []).forEach((opt, i) => {
      const isSelected = q.tipo === 'single'
        ? exam.answers[q.id] === i
        : (exam.answers[q.id] || []).includes(i);

      html += `
          <div class="answer-option ${isSelected ? 'selected' : ''}" onclick="selectAnswer('${q.id}', ${i}, '${q.tipo}')">
            <span class="answer-letter">${letters[i] || '?'}</span>
            <span class="answer-text">${opt}</span>
          </div>
      `;
    });
    html += '</div>';
    if (q.tipo === 'multiple') {
      html += '<p class="text-xs text-tertiary mt-3">💡 Seleccioná todas las opciones correctas</p>';
    }
  }

  html += '</div>'; // close question-card

  // Navigation
  html += `
      <div class="question-nav">
        <button class="btn btn-outline" ${currentQuestionIndex === 0 ? 'disabled' : ''} onclick="prevQuestion()">
          ${icon('chevronLeft', 16)} Anterior
        </button>
        <div class="question-dots">
  `;

  for (let i = 0; i < total; i++) {
    const isAnswered = exam.answers[exam.questions[i].id] !== undefined;
    const dotClass = i === currentQuestionIndex ? 'current' : isAnswered ? 'answered' : '';
    html += `<span class="question-dot ${dotClass}" onclick="goToQuestion(${i})">${i + 1}</span>`;
  }

  html += `
        </div>
        ${currentQuestionIndex === total - 1
      ? `<button class="btn btn-success" onclick="submitExam()">Enviar Evaluación ${icon('check', 16)}</button>`
      : `<button class="btn btn-primary" onclick="nextQuestion()">Siguiente ${icon('chevronRight', 16)}</button>`
    }
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function selectAnswer(questionId, optionIndex, type) {
  if (type === 'single') {
    currentExam.answers[questionId] = optionIndex;
  } else {
    const current = currentExam.answers[questionId] || [];
    if (current.includes(optionIndex)) {
      currentExam.answers[questionId] = current.filter(i => i !== optionIndex);
    } else {
      currentExam.answers[questionId] = [...current, optionIndex];
    }
  }
  renderExamQuestion();
}

function nextQuestion() {
  if (currentQuestionIndex < currentExam.questions.length - 1) {
    currentQuestionIndex++;
    renderExamQuestion();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderExamQuestion();
  }
}

function goToQuestion(index) {
  currentQuestionIndex = index;
  renderExamQuestion();
}

function submitExam() {
  const exam = currentExam;
  const total = exam.questions.length;
  let correct = 0;

  exam.questions.forEach(q => {
    const ans = exam.answers[q.id];
    if (q.tipo === 'single' && ans === q.respuesta_correcta) correct++;
    if (q.tipo === 'multiple' && q.respuesta_correcta) {
      const expected = q.respuesta_correcta.sort().join(',');
      const given = (ans || []).sort().join(',');
      if (expected === given) correct++;
    }
    if (q.tipo === 'caso' && ans && ans.length > 20) correct++;
  });

  const score = Math.round((correct / total) * 10 * 10) / 10;
  const passed = score >= 7;
  const result = passed ? 'Aprobado' : 'Reprobado';

  // 2. Registrar en Legajo Digital (Persistencia Real)
  const user = Auth.currentUser;
  const newRecord = {
    user_id: user.id,
    tipo_evento: 'EVALUACION',
    referencia_id: exam.moduleId,
    resultado: result,
    nota: score,
    fecha: new Date().toISOString(),
    generado_por: 'Sistema'
  };

  // Guardar localmente para UI inmediata
  Store.digitalRecords.unshift(newRecord);

  // Persistir en Supabase (si está disponible)
  Store.persist('digital_records', newRecord).then(success => {
    if (success) {
      console.log('✅ Resultado de evaluación persistido en la nube.');
    } else {
      console.warn('⚠️ Error persistiendo en la nube, guardado localmente.');
    }
  });

  if (passed) {
    const mod = Store.modules.find(m => m.id === exam.moduleId);
    if (mod) mod.progress = 100;
  }

  Store.saveToStorage();
  showExamResults(score, correct, total, passed, exam);
  currentExam = null;
}

function showExamResults(score, correct, total, passed, exam) {
  const container = document.getElementById('app-content');
  const elapsed = Math.floor((Date.now() - exam.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);

  container.innerHTML = `
    <div class="results-container animate-scale-in">
      <div class="results-card ${passed ? 'passed' : 'failed'}">
        <div class="results-icon ${passed ? 'passed' : 'failed'}">
          ${passed ? '🎉' : '📚'}
        </div>
        <h2 class="results-title">${passed ? '¡Felicitaciones!' : 'Seguí practicando'}</h2>
        <p class="results-subtitle">${passed ? 'Aprobaste la evaluación con éxito.' : 'No alcanzaste el puntaje mínimo esta vez.'}</p>

        <div class="results-score ${passed ? 'passed' : 'failed'}">${score}</div>
        <p class="text-sm text-tertiary">de 10 puntos</p>

        <div class="results-stats">
          <div>
            <div class="stat-value text-xl">${correct}/${total}</div>
            <div class="stat-label">Correctas</div>
          </div>
          <div>
            <div class="stat-value text-xl">${minutes} min</div>
            <div class="stat-label">Duración</div>
          </div>
          <div>
            <div class="stat-value text-xl">1/2</div>
            <div class="stat-label">Intentos</div>
          </div>
        </div>

        <div class="flex gap-3 justify-center mt-8">
          <button class="btn btn-outline" onclick="Router.navigate('evaluations')">Volver a Evaluaciones</button>
          ${passed ? '' : '<button class="btn btn-primary" onclick="Router.navigate(\'elearning\')">Repasar Contenido</button>'}
        </div>
      </div>
    </div>
  `;
}

// ── Banco de Casos (Admin) ──
function showCaseBank() {
  const container = document.getElementById('app-content');
  let html = `
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-icon" onclick="renderEvaluations(document.getElementById('app-content'))">${icon('chevronLeft', 20)}</button>
      <div>
        <h2 class="page-title">Banco de Casos Situacionales</h2>
        <p class="page-description">${Store.caseBank.length} escenarios cargados</p>
      </div>
      <div class="flex-1"></div>
      <button class="btn btn-primary" onclick="showCreateCaseModal()">${icon('plus', 16)} Nuevo Caso (IA)</button>
    </div>
  `;

  Store.caseBank.forEach((c, i) => {
    html += `
      <div class="case-bank-item animate-fade-in" style="animation-delay:${i * 50}ms">
        <div class="case-bank-preview">
          ${c.imagen_url ? `<img src="${c.imagen_url}" style="width:100%; height:100%; object-fit:cover; border-radius:8px">` : icon('records', 24)}
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-primary mb-1">${c.titulo}</h4>
          <p class="text-xs text-tertiary line-clamp-1 mb-2">${c.descripcion}</p>
          <div class="flex gap-2">
            ${c.variantes.map((v, idx) => `<span class="badge badge-neutral">v${idx + 1}</span>`).join('')}
          </div>
        </div>
        <div class="case-bank-actions">
          <button class="btn btn-ghost btn-icon btn-sm">${icon('edit', 14)}</button>
          <button class="btn btn-ghost btn-icon btn-sm" style="color:var(--color-danger-400)" onclick="deleteCase('${c.id}')">${icon('trash', 14)}</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function showCreateCaseModal() {
  const modalId = showModal('Nuevo Caso con IA Vision', `
    <div class="form-group">
      <label class="form-label required">Título del Caso</label>
      <input type="text" id="case-title" class="form-input" placeholder="Ej: Análisis de Bajas Microcentro">
      <div id="error-title" class="text-xs text-danger mt-1 hidden">El título es obligatorio.</div>
    </div>
    <div class="form-group">
      <label class="form-label required">Descripción / Contexto</label>
      <textarea id="case-desc" class="form-input" placeholder="Describe brevemente la situación o deja que la IA lo haga por ti al subir la imagen..." style="height:80px"></textarea>
      <div id="error-desc" class="text-xs text-danger mt-1 hidden">La descripción es obligatoria.</div>
    </div>
    <div class="form-group">
      <label class="form-label required">Imagen del Tablero PBi</label>
      <div class="upload-zone" id="case-upload-zone" onclick="document.getElementById('case-image-input').click()">
        <input type="file" id="case-image-input" accept="image/*" style="display:none" onchange="previewCaseImage(event)">
        <div id="case-preview-container" class="flex flex-col items-center">
          <div class="upload-zone-icon">${icon('upload', 24)}</div>
          <div class="upload-zone-title">Haz clic para subir captura de Power BI</div>
        </div>
      </div>
      <div id="error-image" class="text-xs text-danger mt-1 hidden">Debes subir una imagen para analizar.</div>
    </div>
    <div id="ai-variants-section" class="hidden mt-4">
      <h5 class="text-xs font-bold uppercase text-tertiary mb-3 flex items-center gap-1">${icon('sparkle', 12)} Análisis y Variantes por IA</h5>
      <div id="ai-variants-loader" class="text-center p-4">
        <div class="spinner m-auto" style="width:24px;height:24px;border-width:2px;border-top-color:var(--color-primary-500)"></div>
        <p class="text-xs mt-2">Gemini analizando el tablero y sugiriendo contexto...</p>
      </div>
      <div id="ai-variants-list" class="flex flex-col gap-2"></div>
      <div id="error-variants" class="text-xs text-danger mt-1 hidden">Debes esperar a que la IA genere las variantes.</div>
    </div>
  `, async () => {
    const title = document.getElementById('case-title').value;
    const desc = document.getElementById('case-desc').value;
    const imgUrl = document.getElementById('case-preview-img')?.src;
    
    // Reset errores
    ['title', 'desc', 'image', 'variants'].forEach(id => document.getElementById('error-'+id).classList.add('hidden'));

    // Recoger variantes
    const variantInputs = document.querySelectorAll('.ai-variant-input');
    const variantes = Array.from(variantInputs).map((inp, idx) => ({
      id: 'v' + (idx + 1),
      enunciado: inp.value
    }));

    // Validaciones detalladas
    let hasError = false;
    if (!title) { document.getElementById('error-title').classList.remove('hidden'); hasError = true; }
    if (!desc) { document.getElementById('error-desc').classList.remove('hidden'); hasError = true; }
    if (!imgUrl) { document.getElementById('error-image').classList.remove('hidden'); hasError = true; }
    if (variantes.length === 0) { document.getElementById('error-variants').classList.remove('hidden'); hasError = true; }

    if (hasError) return;

    const newCase = {
      id: 'c_' + Date.now(),
      titulo: title,
      descripcion: desc,
      imagen_url: imgUrl,
      variantes: variantes,
      created_at: new Date().toISOString()
    };

    Store.caseBank.push(newCase);
    Store.saveToStorage();
    Toast.show('Caso Creado', 'El caso situacional ha sido añadido al banco.', 'success');
    closeModal();
    showCaseBank();
  }, 'Guardar Caso');
}

let lastUploadedBase64 = null;

async function previewCaseImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    lastUploadedBase64 = e.target.result;
    document.getElementById('case-preview-container').innerHTML = `
      <img src="${lastUploadedBase64}" id="case-preview-img" style="max-height:150px; border-radius:8px; margin-bottom:10px; shadow:var(--shadow-lg)">
      <div class="text-xs text-primary font-bold">Cambiar imagen</div>
    `;
    
    // Disparar generación automática de variantes
    document.getElementById('ai-variants-section').classList.remove('hidden');
    generateCaseVariants(lastUploadedBase64);
  };
  reader.readAsDataURL(file);
}

async function generateCaseVariants(base64Image) {
  const loader = document.getElementById('ai-variants-loader');
  const list = document.getElementById('ai-variants-list');
  const titleInput = document.getElementById('case-title');
  const descInput = document.getElementById('case-desc');
  const saveBtn = document.querySelector('.modal-footer .btn-primary');

  if (saveBtn) saveBtn.disabled = true;
  loader.style.display = 'block';
  list.innerHTML = '';

  const apiKey = EIF_CONFIG.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    Toast.show('Error', 'API Key de Gemini no configurada.', 'danger');
    return;
  }

  try {
    const base64Content = base64Image.split(',')[1];

    const prompt = `Analiza este tablero de Power BI de Megatlon. 
    Tu tarea es:
    1. Sugerir un TÍTULO corto y profesional.
    2. Sugerir una DESCRIPCIÓN del contexto observado en 2 líneas.
    3. Generar 3 variantes de preguntas situacionales para una evaluación.
    
    Devuelve ÚNICAMENTE un objeto JSON puro con este formato:
    {"titulo": "...", "descripcion": "...", "variantes": ["v1", "v2", "v3"]}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Content } }
          ]
        }]
      })
    });

    const data = await response.json();
    loader.style.display = 'none';
    if (saveBtn) saveBtn.disabled = false;

    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const text = data.candidates[0].content.parts[0].text;
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').replace(/^JSON/i, '').trim();
      const result = JSON.parse(cleanJson);

      // Auto-llenar si están vacíos
      if (!titleInput.value) titleInput.value = result.titulo;
      if (!descInput.value) descInput.value = result.descripcion;

      result.variantes.forEach((v, i) => {
        list.innerHTML += `
          <div class="flex items-center gap-2 animate-fade-in" style="animation-delay:${i * 100}ms">
            <span class="text-xs font-bold text-tertiary">#${i + 1}</span>
            <input type="text" class="form-input ai-variant-input" value="${v}" style="font-size:13px; padding:8px">
          </div>
        `;
      });
    }
  } catch (err) {
    console.error(err);
    loader.style.display = 'none';
    if (saveBtn) saveBtn.disabled = false;
    Toast.show('Error IA', 'No se pudieron generar las variantes automáticas.', 'warning');
    // Fallback manual
    for (let i = 1; i <= 3; i++) {
      list.innerHTML += `<div class="flex gap-2"><input type="text" class="form-input ai-variant-input" placeholder="Variante ${i}" style="margin-bottom:5px"></div>`;
    }
  }
}

function deleteCase(id) {
  if (confirm('¿Eliminar este caso permanentemente?')) {
    Store.caseBank = Store.caseBank.filter(c => c.id !== id);
    Store.saveToStorage();
    showCaseBank();
  }
}

function showGenerateLink() {
  showModal('Generar Enlace de Evaluación', `
    <div class="form-group">
      <label class="form-label required">Módulo</label>
      <select class="form-input">
        ${Store.modules.filter(m => m.estado === 'activo').map(m => `<option value="${m.id}">${m.titulo}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label required">Destinatario</label>
      <select class="form-input">
        ${Store.users.filter(u => u.rol === 'colaborador').map(u => `<option value="${u.id}">${u.nombre} — ${u.email}</option>`).join('')}
      </select>
    </div>
    <div class="grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label">TTL (horas)</label>
        <input type="number" class="form-input" value="${EIF_CONFIG.EXAM_LINK_TTL_HOURS}">
      </div>
      <div class="form-group">
        <label class="form-label">Intentos máximos</label>
        <input type="number" class="form-input" value="${EIF_CONFIG.EXAM_DEFAULT_MAX_ATTEMPTS}">
      </div>
    </div>
    <div class="link-card mt-4">
      <h5 class="text-sm font-semibold mb-2">Enlace generado</h5>
      <p class="text-xs text-tertiary mb-3">Compartí este enlace vía WhatsApp o email. Expira en ${EIF_CONFIG.EXAM_LINK_TTL_HOURS}h.</p>
      <div class="link-url">
        <span class="link-url-text">https://eif.empresa.com/eval/tk_${Math.random().toString(36).substring(7)}</span>
        <button class="btn btn-ghost btn-sm" onclick="Toast.show('Enlace copiado', '', 'success')">${icon('copy', 14)}</button>
      </div>
    </div>
  `, null, null);
}
