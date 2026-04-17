/* ================================================================
   EIF Platform — E-learning / Centro de Capacitación
   ================================================================ */

function renderElearning(container) {
  const user = Auth.currentUser;
  const isAdmin = user.rol === 'admin' || user.rol === 'capacitador';
  const modules = isAdmin ? Store.modules : Store.getModulesByLevel(user.nivel_jerarquico);

  let html = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Centro de Capacitación</h2>
        <p class="page-description">${isAdmin ? `${modules.length} módulos en total` : `${modules.length} módulos asignados a tu nivel`}</p>
      </div>
      <div class="page-actions">
        ${isAdmin ? `
          <button class="btn btn-outline" onclick="ExcelUtils.downloadModuleTemplate()">${icon('download', 16)} Plantilla Excel</button>
          <button class="btn btn-outline" onclick="document.getElementById('module-excel-file').click()">${icon('upload', 16)} Importar Excel</button>
          <input type="file" id="module-excel-file" accept=".xlsx, .xls" style="display:none" onchange="handleModuleExcelUpload(event)">
          <button class="btn btn-primary" onclick="showCreateModuleModal()">${icon('plus', 16)} Nuevo Módulo</button>
        ` : ''}
      </div>
    </div>
  `;

  // Filtros
  html += `
    <div class="filter-bar">
      <div class="tabs-pill">
        <span class="tab-pill active" onclick="filterModules('all', this)">Todos</span>
        <span class="tab-pill" onclick="filterModules('pending', this)">Pendientes</span>
        <span class="tab-pill" onclick="filterModules('progress', this)">En Progreso</span>
        <span class="tab-pill" onclick="filterModules('completed', this)">Completados</span>
      </div>
      <div class="filter-search">
        <span class="filter-search-icon">${icon('search', 16)}</span>
        <input type="text" class="filter-search-input form-input" placeholder="Buscar módulo..." oninput="searchModules(this.value)">
      </div>
    </div>
  `;

  // IA Card (admin only)
  if (isAdmin) {
    html += `
      <div class="ia-card mb-6 animate-fade-in">
        <div class="ia-card-badge">${icon('sparkle', 12)} Inteligencia Artificial</div>
        <h4 class="text-lg font-bold mb-2" style="position:relative">Generación Automática de Contenido</h4>
        <p class="text-sm text-secondary mb-4" style="position:relative">Generá e-books y presentaciones profesionales a partir del contenido cargado con ayuda de IA.</p>
        <div class="flex gap-3" style="position:relative">
          <button class="btn btn-outline btn-sm" onclick="Toast.show('IA', 'Funcionalidad disponible próximamente.', 'info')">📘 Generar E-book</button>
          <button class="btn btn-outline btn-sm" onclick="Toast.show('IA', 'Funcionalidad disponible próximamente.', 'info')">📊 Generar Presentación</button>
        </div>
      </div>
    `;
  }

  // Grid de módulos
  html += '<div class="module-grid" id="modules-grid">';

  modules.forEach(m => {
    const typeInfo = EIF_CONFIG.CONTENT_TYPES[m.tipo_contenido];
    const statusBadge = m.estado === 'borrador'
      ? '<span class="badge badge-warning">Borrador</span>'
      : m.estado === 'archivado'
        ? '<span class="badge badge-neutral">Archivado</span>'
        : '';

    html += `
      <div class="module-card" data-status="${getModuleFilter(m)}" data-title="${m.titulo.toLowerCase()}" onclick="openModuleDetail('${m.id}')">
        <div class="module-card-thumbnail">
          <div class="module-card-thumbnail-placeholder type-${m.tipo_contenido.toLowerCase()}">
            ${typeInfo?.icon || '📄'}
          </div>
          ${statusBadge ? `<div class="module-card-badge">${statusBadge}</div>` : ''}
          ${m.tipo_contenido === 'VIDEO' ? `<div class="module-card-play">▶</div>` : ''}
        </div>
        <div class="module-card-body">
          <h4 class="module-card-title">${m.titulo}</h4>
          <p class="module-card-description line-clamp-2">${m.descripcion}</p>
          <div class="module-card-meta">
            <span class="module-card-meta-item">${icon('clock', 12)} ${m.duracion_estimada}</span>
            <span class="module-card-meta-item">${typeInfo?.icon || '📄'} ${typeInfo?.label || m.tipo_contenido}</span>
            <span class="module-card-meta-item">Nivel ${m.nivel_objetivo}</span>
          </div>
        </div>
        <div class="module-card-footer">
          <div class="module-card-progress">
            <div class="module-card-progress-text">${m.progress}% completado</div>
            <div class="progress progress-sm"><div class="progress-bar" style="width:${m.progress}%"></div></div>
          </div>
          ${m.progress === 100
            ? '<span class="badge badge-success">✓</span>'
            : m.progress > 0
              ? '<span class="badge badge-primary">En curso</span>'
              : '<span class="badge badge-neutral">Pendiente</span>'
          }
        </div>
      </div>
    `;
  });

  html += '</div>';

  container.innerHTML = html;
}

function getModuleFilter(m) {
  if (m.progress === 100) return 'completed';
  if (m.progress > 0) return 'progress';
  return 'pending';
}

function filterModules(filter, btn) {
  // Actualizar tabs
  document.querySelectorAll('.tabs-pill .tab-pill').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  document.querySelectorAll('.module-card').forEach(card => {
    if (filter === 'all') {
      card.style.display = '';
    } else {
      card.style.display = card.dataset.status === filter ? '' : 'none';
    }
  });
}

function searchModules(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.module-card').forEach(card => {
    card.style.display = card.dataset.title.includes(q) ? '' : 'none';
  });
}

function openModuleDetail(moduleId) {
  const m = Store.getModuleById(moduleId);
  if (!m) return;
  const typeInfo = EIF_CONFIG.CONTENT_TYPES[m.tipo_contenido];

  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div class="animate-fade-in">
      <div class="flex items-center gap-3 mb-6">
        <button class="btn btn-ghost btn-icon" onclick="renderElearning(document.getElementById('app-content'))">${icon('chevronLeft', 20)}</button>
        <div>
          <h2 class="page-title">${m.titulo}</h2>
          <p class="page-description">${typeInfo?.label || m.tipo_contenido} · ${m.duracion_estimada}</p>
        </div>
      </div>

      <div class="module-detail">
        <div class="module-viewer">
          <div class="module-viewer-header">
            <div class="flex items-center gap-2">
              <span>${typeInfo?.icon || '📄'}</span>
              <span class="font-semibold text-sm">Contenido del Módulo</span>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" onclick="downloadEbook('${m.titulo}')">${icon('download', 14)} Descargar</button>
            </div>
          </div>
          <div class="module-viewer-content" style="padding:0; background:#000; height:600px; display:flex; flex-direction:column; overflow:hidden; border-radius: 0 0 16px 16px;">
            ${m.tipo_contenido === 'PDF' ? `
              <object data="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" type="application/pdf" width="100%" height="100%">
                <p>Tu navegador no posee un plugin de PDF. <a href="#">Descargar E-book</a></p>
              </object>
            ` : m.tipo_contenido === 'VIDEO' ? `
              <iframe width="100%" height="100%" src="https://www.youtube.com/embed/QHQg1u68yYc?rel=0" frameborder="0" allowfullscreen></iframe>
            ` : m.tipo_contenido === 'PPTX' ? `
              <iframe src="https://docs.google.com/presentation/d/e/2PACX-1vT1oXfH-H3I-_38GIfc5Q8nOh8_F8E-eO-0Kk_QyFwR3C-c94uX1A7/embed?start=false&loop=false&delayms=3000" frameborder="0" width="100%" height="100%" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
            ` : `
              <div class="rich-text-viewer" style="background:#fff; padding:40px; color:#333; height:100%; overflow-y:auto; text-align:left;">
                <h1 style="font-size:28px; margin-bottom:16px;">${m.titulo}</h1>
                <div style="font-size:16px; line-height:1.6; white-space:pre-wrap">${m.contenido_texto || "Estimado colaborador, este módulo aún no tiene contenido de texto cargado."}</div>
              </div>
            `}
          </div>
        </div>

        <div class="module-sidebar">
          <div class="module-info-card">
            <h4 class="text-md font-semibold mb-4">Información</h4>
            <div class="module-info-row">
              <span class="module-info-label">Tipo</span>
              <span class="module-info-value">${typeInfo?.icon} ${typeInfo?.label}</span>
            </div>
            <div class="module-info-row">
              <span class="module-info-label">Duración</span>
              <span class="module-info-value">${m.duracion_estimada}</span>
            </div>
            <div class="module-info-row">
              <span class="module-info-label">Nivel</span>
              <span class="module-info-value">${EIF_CONFIG.HIERARCHY_LEVELS.find(l => l.id === m.nivel_objetivo)?.name || 'N/A'}</span>
            </div>
            <div class="module-info-row">
              <span class="module-info-label">Estado</span>
              <span class="module-info-value"><span class="badge badge-${m.estado === 'activo' ? 'success' : 'warning'}">${m.estado}</span></span>
            </div>
            <div class="module-info-row">
              <span class="module-info-label">Vigencia</span>
              <span class="module-info-value">${new Date(m.fecha_vigencia).toLocaleDateString('es-AR')}</span>
            </div>
          </div>

          <div class="module-info-card">
            <h4 class="text-md font-semibold mb-4">Tu Progreso</h4>
            <div class="flex items-center justify-center p-4">
              <div style="position:relative; width:120px; height:120px;">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <defs><linearGradient id="gradient-progress" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#6366F1"/><stop offset="100%" style="stop-color:#8B5CF6"/>
                  </linearGradient></defs>
                  <circle cx="60" cy="60" r="50" class="progress-circle-track" stroke-width="8" fill="none" stroke="rgba(255,255,255,0.06)"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="url(#gradient-progress)" stroke-width="8" stroke-linecap="round"
                    stroke-dasharray="${314}" stroke-dashoffset="${314 - (314 * m.progress / 100)}" transform="rotate(-90 60 60)" style="transition: stroke-dashoffset 1s ease"/>
                </svg>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                  <span class="text-2xl font-bold">${m.progress}%</span>
                </div>
              </div>
            </div>
            ${m.progress < 100
              ? `<button class="btn btn-primary w-full mt-4" onclick="Toast.show('Evaluación', 'Navegando a la evaluación...', 'info'); setTimeout(()=>Router.navigate('evaluations'), 1000)">Rendir Evaluación</button>`
              : '<div class="text-center"><span class="badge badge-success badge-dot">Módulo completado</span></div>'
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function showCreateModuleModal() {
  showModal('Nuevo Módulo de Aprendizaje', `
    <div class="form-group">
      <label class="form-label required">Título</label>
      <input type="text" id="new-module-title" class="form-input" placeholder="Nombre del módulo">
    </div>
    <div class="form-group">
      <label class="form-label required">Descripción</label>
      <textarea id="new-module-desc" class="form-input" placeholder="Descripción detallada del módulo..."></textarea>
    </div>
    <div class="grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label required">Tipo de Contenido</label>
        <select id="new-module-type" class="form-input">
          <option value="PDF">PDF</option>
          <option value="PPTX">Presentación (PPTX)</option>
          <option value="VIDEO">Video</option>
          <option value="TEXT">Texto Enriquecido</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label required">Nivel Jerárquico</label>
        <select class="form-input">
          ${EIF_CONFIG.HIERARCHY_LEVELS.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label">Duración Estimada</label>
        <input type="text" class="form-input" placeholder="ej: 45 min">
      </div>
      <div class="form-group">
        <label class="form-label">Fecha de Vigencia</label>
        <input type="date" class="form-input">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Contenido Escrito (Opcional si usas Archivo)</label>
      <textarea id="new-module-content" class="form-input" placeholder="Escribe aquí el temario o contenido completo. Al visualizarse, este texto se renderizará y podrá descargarse como E-book PDF." style="height: 120px"></textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">Archivo</label>
      <div class="upload-zone" onclick="Toast.show('Upload', 'Funcionalidad de carga disponible con Supabase Storage.', 'info')">
        <div class="upload-zone-icon">${icon('upload', 24)}</div>
        <div class="upload-zone-title">Arrastrá un archivo o hacé clic para seleccionar</div>
        <div class="upload-zone-text">PDF, PPTX, MP4 — Máximo 50 MB</div>
      </div>
    </div>
  `, () => {
    
    const titulo = document.getElementById('new-module-title').value || 'Sin título';
    const desc = document.getElementById('new-module-desc').value || '';
    const contenido = document.getElementById('new-module-content').value || '';
    const tipo = document.getElementById('new-module-type').value || 'TEXT';
    
    Store.modules.push({
      id: 'mod_' + Date.now(),
      titulo: titulo,
      descripcion: desc,
      nivel_objetivo: 1,
      estado: 'borrador',
      tipo_contenido: tipo,
      contenido_texto: contenido
    });
    Store.saveToStorage();

    Toast.show('Módulo creado', 'El nuevo módulo fue guardado como borrador.', 'success');
    closeModal();
    Router.render('elearning');
  }, 'Crear Módulo');
}

function downloadEbook(titulo) {
  Toast.show('Descargando Ebook', 'El archivo PDF se está generando y en breve se iniciará la descarga...', 'info');
  const element = document.querySelector('.module-viewer-content');
  const opt = {
    margin:       10,
    filename:     `${titulo.replace(/\s+/g, '_')}_Ebook.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };
  
  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save().then(() => {
    });
  } else {
    Toast.show('Error', 'El plugin de PDF no está cargado.', 'warning');
  }
}
// ── Carga Masiva Módulos Excel ──
async function handleModuleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  Toast.show('Importando...', 'Cargando módulos desde Excel...', 'info');
  
  try {
    const result = await ExcelUtils.importModules(file);
    Toast.show('Importación Exitosa', `Se han cargado ${result.added} nuevos módulos como borradores.`, 'success');
    
    // Recargar vista
    setTimeout(() => { Router.render('elearning'); }, 1000);
  } catch (err) {
    console.error(err);
    Toast.show('Error de Importación', 'Asegúrate de usar la plantilla de módulos correcta.', 'danger');
  }
}
