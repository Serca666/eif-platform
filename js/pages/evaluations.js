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
        <p class="page-description">${isAdmin ? 'Gestión de evaluaciones y banco de preguntas' : 'Tus evaluaciones asignadas'}</p>
      </div>
      ${isAdmin ? `
      <div class="page-actions">
        <button class="btn btn-outline" onclick="showQuestionBank()">${icon('elearning', 16)} Banco de Preguntas</button>
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

  // Pantalla de carga IA
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-screen text-center animate-fade-in">
      <div>
        <div class="spinner mb-4" style="border-width:3px; border-top-color:var(--color-primary-500); width:48px; height:48px;"></div>
        <h3 class="text-xl font-bold mb-2">Generando Evaluación...</h3>
        <p class="text-sm text-tertiary">Nuestra IA está analizando el módulo y diseñando preguntas exclusivas.</p>
      </div>
    </div>
  `;

  let generatedQuestions = [];
  const apiKey = EIF_CONFIG.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');

  try {
    if (apiKey && apiKey.length > 10) {
      // Usar Google Gemini API Real
      // Usar Google Gemini API Real con un prompt optimizado
      const prompt = `Actúa como un experto en capacitación corporativa para Megatlon (cadena de gimnasios líder). 
Tu tarea es generar un examen de 5 preguntas de opción múltiple de alta calidad sobre el módulo: "${m?.titulo}".
Descripción del tema: ${m?.descripcion}.

Instrucciones críticas:
1. Las preguntas deben ser situacionales y profesionales.
2. Devuelve ÚNICAMENTE un array JSON puro. Sin explicaciones, sin markdown (no incluyas \`\`\`json).
3. Formato requerido:
[{"id":"q1","tipo":"single","dificultad":"media","enunciado":"¿...?","opciones":["A","B","C","D"],"respuesta_correcta":0}]

Genera las preguntas ahora:`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        let textResponse = data.candidates[0].content.parts[0].text;
        // Limpiar posible markdown si la IA ignora las instrucciones
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').replace(/^JSON/i, '').trim();
        generatedQuestions = JSON.parse(cleanJson);
      } else {
        throw new Error("Respuesta de IA vacía o inválida");
      }
    } else {
      // Fallback: Generador Mock Aleatorio "Estilo IA"
      await new Promise(r => setTimeout(r, 2000));
      const verbos = ['Analizar', 'Comprender', 'Identificar', 'Resolver', 'Supervisar'];
      const sustantivos = ['la situación', 'el protocolo', 'la norma', 'la consulta', 'el conflicto'];

      for (let i = 0; i < 5; i++) {
        generatedQuestions.push({
          id: 'ai_q_' + i,
          tipo: 'single',
          dificultad: 'media',
          enunciado: `Pregunta Dinámica ${i + 1} generada: Al ${verbos[Math.floor(Math.random() * verbos.length)].toLowerCase()} ${sustantivos[Math.floor(Math.random() * sustantivos.length)]} en el marco de ${m?.titulo || 'este módulo'}, ¿qué paso se debe priorizar?`,
          opciones: ['Priorizar la agilidad del proceso', 'Consultar el manual de procedimientos', 'Ignorar la directriz general', 'Delegar inmediatamente al supervisor'],
          respuesta_correcta: 1
        });
      }
    }
  } catch (error) {
    console.error("Error IA:", error);
    generatedQuestions = Store.getQuestionsForModule(moduleId, 5);
  }

  currentExam = { moduleId, questions: generatedQuestions, answers: {}, startTime: Date.now() };
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

function showQuestionBank() {
  const container = document.getElementById('app-content');
  let html = `
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-icon" onclick="renderEvaluations(document.getElementById('app-content'))">${icon('chevronLeft', 20)}</button>
      <div>
        <h2 class="page-title">Banco de Preguntas</h2>
        <p class="page-description">${Store.questionBank.length} preguntas en total</p>
      </div>
      <div class="flex-1"></div>
      <button class="btn btn-primary" onclick="Toast.show('Pregunta', 'Formulario de nueva pregunta próximamente.', 'info')">${icon('plus', 16)} Nueva Pregunta</button>
    </div>
  `;

  Store.questionBank.forEach((q, i) => {
    const module = Store.getModuleById(q.module_id);
    const typeLabels = { single: 'Opción única', multiple: 'Opción múltiple', caso: 'Caso práctico' };
    const diffColors = { facil: 'success', media: 'warning', alta: 'danger' };

    html += `
      <div class="question-bank-item animate-fade-in" style="animation-delay:${i * 50}ms">
        <div class="question-bank-number">${i + 1}</div>
        <div class="question-bank-content">
          <div class="question-bank-text">${q.enunciado}</div>
          <div class="question-bank-meta">
            <span class="badge badge-neutral">${typeLabels[q.tipo]}</span>
            <span class="badge badge-${diffColors[q.dificultad]}">${q.dificultad}</span>
            <span class="text-xs text-tertiary">${module?.titulo || 'Módulo desconocido'}</span>
          </div>
        </div>
        <div class="question-bank-actions">
          <button class="btn btn-ghost btn-icon btn-sm">${icon('edit', 14)}</button>
          <button class="btn btn-ghost btn-icon btn-sm" style="color:var(--color-danger-400)">${icon('trash', 14)}</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
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
