/* ================================================================
   EIF Platform — Mystery Shopper Page
   ================================================================ */

let msCurrentStep = 0;
let msFormData = { colaborador_id: '', sucursal_id: '', ratings: {}, notes: {} };

function renderMystery(container) {
  const user = Auth.currentUser;
  const isEvaluador = user.rol === 'evaluador_ms';
  const isAdmin = user.rol === 'admin';

  let html = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Mystery Shopper</h2>
        <p class="page-description">${isEvaluador ? 'Evaluaciones en campo' : 'Gestión de evaluaciones Mystery Shopper'}</p>
      </div>
      <div class="page-actions">
        ${isEvaluador || isAdmin ? `<button class="btn btn-primary" onclick="startMSEvaluation()">${icon('plus', 16)} Nueva Evaluación</button>` : ''}
      </div>
    </div>
  `;

  // KPIs
  html += `
    <div class="grid-cols-3 stagger-children mb-6">
      <div class="kpi-card kpi-primary">
        <div class="kpi-header"><div class="kpi-icon primary">${icon('mystery', 22)}</div></div>
        <div class="kpi-value">${Store.msEvaluations.length}</div>
        <div class="kpi-label">Evaluaciones Realizadas</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-header"><div class="kpi-icon success">⭐</div></div>
        <div class="kpi-value">${Store.msEvaluations.filter(e => e.resultado_global === 'Superó' || e.resultado_global === 'Alcanzó').length}</div>
        <div class="kpi-label">Resultados Positivos</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-header"><div class="kpi-icon warning">🔄</div></div>
        <div class="kpi-value">${Store.msEvaluations.filter(e => e.resultado_global === 'En proceso').length}</div>
        <div class="kpi-label">En Proceso (Refuerzo)</div>
      </div>
    </div>
  `;

  // Lista de evaluaciones
  html += `
    <div class="chart-container">
      <div class="chart-header">
        <h3 class="chart-title">Evaluaciones Recientes</h3>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm">${icon('filter', 14)} Filtrar</button>
        </div>
      </div>
      <div class="data-table-wrapper" style="border:none">
        <table class="data-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Sucursal</th>
              <th>Fecha</th>
              <th>Resultado</th>
              <th>Evaluador</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
  `;

  Store.msEvaluations.forEach(ev => {
    const colab = Store.getUserById(ev.colaborador_id);
    const evaluador = Store.getUserById(ev.evaluador_id);
    const sucursal = Store.getSucursalById(ev.sucursal_id);
    const resultClass = ev.resultado_global === 'Superó' ? 'success' : ev.resultado_global === 'Alcanzó' ? 'info' : 'warning';

    html += `
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <div class="avatar avatar-sm">${Auth.getInitials(colab?.nombre)}</div>
                <div>
                  <div class="font-medium text-primary">${colab?.nombre || '—'}</div>
                  <div class="text-xs text-tertiary">${colab?.email || ''}</div>
                </div>
              </div>
            </td>
            <td>${sucursal?.name || '—'}</td>
            <td>${new Date(ev.fecha).toLocaleDateString('es-AR')}</td>
            <td><span class="badge badge-${resultClass} badge-dot">${ev.resultado_global}</span></td>
            <td>${evaluador?.nombre || '—'}</td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="viewMSDetail('${ev.id}')">${icon('eye', 14)} Ver</button>
            </td>
          </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Criterios y mapeo de refuerzo (admin)
  if (isAdmin) {
    html += `
      <div class="chart-container mt-6">
        <div class="chart-header">
          <h3 class="chart-title">Criterios de Evaluación y Mapeo de Refuerzo</h3>
          <button class="btn btn-outline btn-sm">${icon('edit', 14)} Editar</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Criterio</th><th>Descripción</th><th>Módulo de Refuerzo</th></tr></thead>
          <tbody>
    `;
    Store.msCriteria.forEach(c => {
      const mod = Store.getModuleById(c.module_refuerzo);
      html += `
            <tr>
              <td class="font-medium text-primary">${c.name}</td>
              <td class="text-tertiary">${c.description}</td>
              <td><span class="badge badge-primary">${mod?.titulo || '—'}</span></td>
            </tr>
      `;
    });
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}

function startMSEvaluation() {
  msCurrentStep = 0;
  msFormData = { colaborador_id: '', sucursal_id: '', ratings: {}, notes: {} };
  renderMSForm();
}

function renderMSForm() {
  const container = document.getElementById('app-content');

  let html = `
    <div class="ms-form-container animate-fade-in">
      <div class="flex items-center gap-3 mb-6">
        <button class="btn btn-ghost btn-icon" onclick="renderMystery(document.getElementById('app-content'))">${icon('chevronLeft', 20)}</button>
        <h2 class="page-title">Nueva Evaluación Mystery Shopper</h2>
      </div>

      <div class="ms-step-indicator">
        ${['Datos', 'Evaluación', 'Revisión'].map((label, i) => `
          <div class="ms-step ${i < msCurrentStep ? 'completed' : ''} ${i === msCurrentStep ? 'active' : ''}">
            <div class="ms-step-dot">${i < msCurrentStep ? icon('check', 12) : i + 1}</div>
          </div>
          ${i < 2 ? '<div class="ms-step-line"></div>' : ''}
        `).join('')}
      </div>
  `;

  if (msCurrentStep === 0) {
    html += renderMSStep1();
  } else if (msCurrentStep === 1) {
    html += renderMSStep2();
  } else {
    html += renderMSStep3();
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderMSStep1() {
  return `
    <div class="card animate-fade-in-up">
      <h3 class="card-title mb-6">Datos de la Evaluación</h3>
      <div class="form-group">
        <label class="form-label required">Colaborador Evaluado</label>
        <select class="form-input" id="ms-colaborador" onchange="msFormData.colaborador_id = this.value">
          <option value="">Seleccionar colaborador...</option>
          ${Store.users.filter(u => u.rol === 'colaborador').map(u =>
            `<option value="${u.id}" ${msFormData.colaborador_id === u.id ? 'selected' : ''}>${u.nombre}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label required">Sucursal</label>
        <select class="form-input" id="ms-sucursal" onchange="msFormData.sucursal_id = this.value">
          <option value="">Seleccionar sucursal...</option>
          ${Store.sucursales.map(s =>
            `<option value="${s.id}" ${msFormData.sucursal_id === s.id ? 'selected' : ''}>${s.name}</option>`
          ).join('')}
        </select>
      </div>
      <div class="flex justify-end mt-6">
        <button class="btn btn-primary" onclick="if(msFormData.colaborador_id && msFormData.sucursal_id){msCurrentStep=1;renderMSForm()}else{Toast.show('Completá los campos','Seleccioná colaborador y sucursal.','warning')}">
          Siguiente ${icon('chevronRight', 16)}
        </button>
      </div>
    </div>
  `;
}

function renderMSStep2() {
  let html = '<div class="criteria-list animate-fade-in-up">';

  Store.msCriteria.forEach((c, i) => {
    const rating = msFormData.ratings[c.id];
    html += `
      <div class="criteria-card expanded">
        <div class="criteria-header">
          <span class="criteria-number">${i + 1}</span>
          <span class="criteria-title">${c.name}</span>
          ${rating ? `<span class="badge badge-${rating === 3 ? 'success' : rating === 2 ? 'info' : 'warning'}">${rating === 3 ? 'Superó' : rating === 2 ? 'Alcanzó' : 'En proceso'}</span>` : ''}
        </div>
        <div class="criteria-body">
          <p class="text-sm text-tertiary mb-4">${c.description}</p>
          <div class="ms-rating-buttons">
            <div class="ms-rating-btn supero ${rating === 3 ? 'selected' : ''}" onclick="setMSRating('${c.id}', 3, this)">
              <span class="ms-rating-emoji">⭐</span>
              <span class="ms-rating-label">Superó</span>
            </div>
            <div class="ms-rating-btn alcanzo ${rating === 2 ? 'selected' : ''}" onclick="setMSRating('${c.id}', 2, this)">
              <span class="ms-rating-emoji">✅</span>
              <span class="ms-rating-label">Alcanzó</span>
            </div>
            <div class="ms-rating-btn en-proceso ${rating === 1 ? 'selected' : ''}" onclick="setMSRating('${c.id}', 1, this)">
              <span class="ms-rating-emoji">🔄</span>
              <span class="ms-rating-label">En proceso</span>
            </div>
          </div>
          <div class="form-group mt-3">
            <label class="form-label">Notas (opcional)</label>
            <textarea class="form-input" rows="2" placeholder="Observaciones sobre este criterio..."
              oninput="msFormData.notes['${c.id}'] = this.value">${msFormData.notes[c.id] || ''}</textarea>
          </div>
          <div class="evidence-section">
            <label class="form-label">Evidencias</label>
            <div class="evidence-grid">
              <div class="evidence-add" onclick="Toast.show('Cámara', 'Captura de evidencia fotográfica.', 'info')">
                <span class="evidence-add-icon">${icon('camera', 20)}</span>
                <span>Foto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';

  html += `
    <div class="flex justify-between mt-6">
      <button class="btn btn-outline" onclick="msCurrentStep=0;renderMSForm()">${icon('chevronLeft', 16)} Anterior</button>
      <button class="btn btn-primary" onclick="validateMSStep2()">Revisar ${icon('chevronRight', 16)}</button>
    </div>
  `;

  return html;
}

function setMSRating(criterioId, value, el) {
  msFormData.ratings[criterioId] = value;
  // Actualizar UI
  const parent = el.parentElement;
  parent.querySelectorAll('.ms-rating-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  // Actualizar badge
  const card = el.closest('.criteria-card');
  const header = card.querySelector('.criteria-header');
  let badge = header.querySelector('.badge');
  const badgeClass = value === 3 ? 'success' : value === 2 ? 'info' : 'warning';
  const badgeText = value === 3 ? 'Superó' : value === 2 ? 'Alcanzó' : 'En proceso';
  if (badge) {
    badge.className = `badge badge-${badgeClass}`;
    badge.textContent = badgeText;
  } else {
    header.insertAdjacentHTML('beforeend', `<span class="badge badge-${badgeClass}">${badgeText}</span>`);
  }
}

function validateMSStep2() {
  const allRated = Store.msCriteria.every(c => msFormData.ratings[c.id]);
  if (!allRated) {
    Toast.show('Evaluación incompleta', 'Calificá todos los criterios antes de continuar.', 'warning');
    return;
  }
  msCurrentStep = 2;
  renderMSForm();
}

function renderMSStep3() {
  const colab = Store.getUserById(msFormData.colaborador_id);
  const sucursal = Store.getSucursalById(msFormData.sucursal_id);

  const values = Object.values(msFormData.ratings);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const globalResult = avg >= 2.5 ? 'Superó' : avg >= 1.5 ? 'Alcanzó' : 'En proceso';
  const resultClass = globalResult === 'Superó' ? 'supero' : globalResult === 'Alcanzó' ? 'alcanzo' : 'en-proceso';

  let html = `
    <div class="ms-summary animate-fade-in-up">
      <div class="ms-summary-header">
        <div>
          <h3 class="text-lg font-bold">Resumen de Evaluación</h3>
          <p class="text-sm text-tertiary mt-1">${colab?.nombre} — ${sucursal?.name} — ${new Date().toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      <div class="ms-summary-result ${resultClass}">
        <span style="font-size:28px">${globalResult === 'Superó' ? '⭐' : globalResult === 'Alcanzó' ? '✅' : '🔄'}</span>
        <div>
          <div class="font-bold text-lg">${globalResult}</div>
          <div class="text-sm text-tertiary">Resultado global (promedio: ${avg.toFixed(1)})</div>
        </div>
      </div>

      <table class="data-table mb-4">
        <thead><tr><th>Criterio</th><th>Calificación</th><th>Notas</th></tr></thead>
        <tbody>
  `;

  Store.msCriteria.forEach(c => {
    const r = msFormData.ratings[c.id];
    const rLabel = r === 3 ? 'Superó' : r === 2 ? 'Alcanzó' : 'En proceso';
    const rClass = r === 3 ? 'success' : r === 2 ? 'info' : 'warning';
    html += `
          <tr>
            <td class="font-medium">${c.name}</td>
            <td><span class="badge badge-${rClass}">${rLabel}</span></td>
            <td class="text-tertiary text-sm">${msFormData.notes[c.id] || '—'}</td>
          </tr>
    `;
  });

  html += `</tbody></table>`;

  // Alertas de refuerzo
  const enProceso = Store.msCriteria.filter(c => msFormData.ratings[c.id] === 1);
  if (enProceso.length > 0) {
    html += `
      <div class="card-glow p-5 mt-4">
        <h4 class="text-md font-bold mb-3">🔄 Refuerzos Recomendados</h4>
        <p class="text-sm text-tertiary mb-3">Se generarán las siguientes recomendaciones automáticas:</p>
        <ul style="list-style:none">
    `;
    enProceso.forEach(c => {
      const mod = Store.getModuleById(c.module_refuerzo);
      html += `<li class="flex items-center gap-2 py-2 text-sm"><span class="badge badge-warning">${c.name}</span> → <span class="badge badge-primary">${mod?.titulo || 'Módulo de refuerzo'}</span></li>`;
    });
    html += '</ul></div>';
  }

  html += `
    </div>
    <div class="flex justify-between mt-6">
      <button class="btn btn-outline" onclick="msCurrentStep=1;renderMSForm()">${icon('chevronLeft', 16)} Editar</button>
      <button class="btn btn-success btn-lg" onclick="submitMSEvaluation()">Enviar Evaluación ${icon('check', 16)}</button>
    </div>
  `;

  return html;
}

function submitMSEvaluation() {
  const user = Auth.currentUser;
  const colab = Store.getUserById(msFormData.colaborador_id);
  const sucursal = Store.getSucursalById(msFormData.sucursal_id);

  const values = Object.values(msFormData.ratings);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const globalResult = avg >= 2.5 ? 'Superó' : avg >= 1.5 ? 'Alcanzó' : 'En proceso';

  // 1. Registro detallado de la evaluación MS (Mock local por ahora, requiere tabla ms_evaluations para real)
  const newMSEval = {
    id: 'ms' + Date.now(),
    evaluador_id: user.id,
    colaborador_id: msFormData.colaborador_id,
    sucursal_id: msFormData.sucursal_id,
    fecha: new Date().toISOString().split('T')[0],
    resultado_global: globalResult,
    criterios: Object.keys(msFormData.ratings).map(cid => ({
      criterio_id: cid,
      rating: msFormData.ratings[cid]
    })),
    notas: msFormData.notes
  };

  Store.msEvaluations.unshift(newMSEval);

  // 2. Registro en Legajo Digital (Persistencia Real en Supabase)
  const newRecord = {
    user_id: msFormData.colaborador_id,
    tipo_evento: 'MYSTERY',
    referencia_id: newMSEval.id,
    resultado: globalResult,
    nota: parseFloat(avg.toFixed(1)),
    fecha: new Date().toISOString(),
    generado_por: user.id
  };

  Store.digitalRecords.unshift(newRecord);
  
  // Persistir en Supabase (si está disponible)
  Store.persist('digital_records', newRecord).then(success => {
    if (success) {
      console.log('✅ Resultado Mystery Shopper persistido en la nube.');
    } else {
      console.warn('⚠️ Error persistiendo en la nube, guardado localmente.');
    }
  });

  Store.saveToStorage();
  Toast.show('Evaluación enviada', 'El resultado fue registrado en el legajo del colaborador.', 'success');
  renderMystery(document.getElementById('app-content'));
}

function viewMSDetail(evalId) {
  const ev = Store.msEvaluations.find(e => e.id === evalId);
  if (!ev) return;
  const colab = Store.getUserById(ev.colaborador_id);
  const sucursal = Store.getSucursalById(ev.sucursal_id);

  // Poblar datos y mostrar resumen
  msFormData.colaborador_id = ev.colaborador_id;
  msFormData.sucursal_id = ev.sucursal_id;
  msFormData.ratings = {};
  msFormData.notes = {};
  ev.criterios.forEach(c => { msFormData.ratings[c.criterio_id] = c.rating; });
  msFormData.notes = {};

  msCurrentStep = 2;
  renderMSForm();
}
