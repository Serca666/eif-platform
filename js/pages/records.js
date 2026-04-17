/* ================================================================
   EIF Platform — Legajo Digital Page
   ================================================================ */

function renderRecords(container) {
  const user = Auth.currentUser;
  const isAdmin = user.rol === 'admin';
  const isGerente = user.rol === 'gerente_sucursal' || user.rol === 'gerente_regional';

  // Determinar qué registros mostrar
  let targetUserId = user.id;
  let targetUser = user;

  if (isAdmin || isGerente) {
    const firstColab = Store.users.find(u => u.rol === 'colaborador');
    targetUserId = firstColab ? firstColab.id : user.id;
    targetUser = Store.getUserById(targetUserId);
  }

  const records = Store.getRecordsForUser(targetUserId);

  let html = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Legajo Digital</h2>
        <p class="page-description">Historial formativo completo del colaborador</p>
      </div>
    </div>
  `;

  // Selector de colaborador (admin/gerente)
  if (isAdmin || isGerente) {
    html += `
      <div class="card mb-6">
        <div class="flex items-center gap-4 flex-wrap">
          <label class="form-label" style="margin-bottom:0">Colaborador:</label>
          <select class="form-input" style="max-width:300px" onchange="changeRecordUser(this.value)">
            ${Store.users.filter(u => u.rol === 'colaborador').map(u =>
              `<option value="${u.id}" ${u.id === targetUserId ? 'selected' : ''}>${u.nombre}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;
  }

  // Perfil del colaborador
  html += `
    <div class="card-glow mb-6 animate-fade-in">
      <div class="flex items-center gap-5">
        <div class="avatar avatar-xl">${Auth.getInitials(targetUser.nombre)}</div>
        <div class="flex-1">
          <h3 class="text-xl font-bold">${targetUser.nombre}</h3>
          <p class="text-sm text-tertiary">${targetUser.email}</p>
          <div class="flex gap-3 mt-2 flex-wrap">
            <span class="badge badge-primary">${EIF_CONFIG.ROLE_LABELS[targetUser.rol]}</span>
            <span class="badge badge-neutral">Nivel ${targetUser.nivel_jerarquico} — ${EIF_CONFIG.HIERARCHY_LEVELS.find(l => l.id === targetUser.nivel_jerarquico)?.name || ''}</span>
            <span class="badge badge-neutral">${Store.getSucursalById(targetUser.sucursal_id)?.name || '—'}</span>
          </div>
        </div>
        <div class="flex gap-6">
          <div class="text-center">
            <div class="stat-value text-xl">${records.length}</div>
            <div class="stat-label">Registros</div>
          </div>
          <div class="text-center">
            <div class="stat-value text-xl">${records.filter(r => r.nota).length > 0 ? (records.filter(r => r.nota).reduce((a, r) => a + r.nota, 0) / records.filter(r => r.nota).length).toFixed(1) : '—'}</div>
            <div class="stat-label">Nota Prom.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Filtros
  html += `
    <div class="legajo-filters">
      <span class="legajo-filter-chip active" onclick="filterRecords('all', this)">Todos (${records.length})</span>
      <span class="legajo-filter-chip" onclick="filterRecords('ONBOARDING', this)">🎓 Onboarding</span>
      <span class="legajo-filter-chip" onclick="filterRecords('EVALUACION', this)">📋 Evaluaciones</span>
      <span class="legajo-filter-chip" onclick="filterRecords('MYSTERY', this)">🕵️ Mystery Shopper</span>
      <span class="legajo-filter-chip" onclick="filterRecords('REFUERZO', this)">🔄 Refuerzos</span>
      <span class="legajo-filter-chip" onclick="filterRecords('CAPACITACION', this)">📚 Capacitación</span>
    </div>
  `;

  // Timeline
  html += '<div class="legajo-timeline" id="legajo-timeline">';

  records.forEach(r => {
    const typeInfo = EIF_CONFIG.RECORD_TYPES[r.tipo_evento];
    const module = Store.getModuleById(r.referencia_id);
    const generador = r.generado_por === 'Sistema' ? 'Sistema' : Store.getUserById(r.generado_por)?.nombre || r.generado_por;

    const resultClass = r.resultado === 'Aprobado' || r.resultado === 'Completado' || r.resultado === 'Superó'
      ? 'success'
      : r.resultado === 'Alcanzó' ? 'info'
      : r.resultado === 'En proceso' ? 'warning'
      : r.resultado === 'Pendiente' ? 'neutral'
      : 'neutral';

    html += `
      <div class="legajo-entry" data-type="${r.tipo_evento}">
        <div class="legajo-dot ${r.tipo_evento.toLowerCase()}"></div>
        <div class="legajo-card">
          <div class="legajo-date">${new Date(r.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div class="flex items-center gap-2 mb-2">
            <span>${typeInfo?.icon || '📄'}</span>
            <h4 class="legajo-title" style="margin:0">${typeInfo?.label || r.tipo_evento}${module ? ': ' + module.titulo : ''}</h4>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <span class="badge badge-${resultClass}">${r.resultado}</span>
            ${r.nota !== null ? `<span class="text-sm font-semibold">Nota: ${r.nota}</span>` : ''}
          </div>
          <div class="legajo-meta mt-3">
            <span class="legajo-meta-item">${icon('users', 12)} ${generador}</span>
            <span class="legajo-meta-item">${icon('calendar', 12)} ${new Date(r.fecha).toLocaleDateString('es-AR')}</span>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Solo lectura notice
  if (!isAdmin) {
    html += `
      <div class="flex items-center gap-2 mt-6 text-xs text-tertiary">
        ${icon('lock', 12)} Este legajo es de solo lectura. Contactá al administrador para correcciones.
      </div>
    `;
  }

  container.innerHTML = html;
}

function filterRecords(type, btn) {
  document.querySelectorAll('.legajo-filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.legajo-entry').forEach(entry => {
    entry.style.display = type === 'all' || entry.dataset.type === type ? '' : 'none';
  });
}

function changeRecordUser(userId) {
  const user = Store.getUserById(userId);
  if (user) {
    renderRecordsForUser(userId);
  }
}

function renderRecordsForUser(userId) {
  const container = document.getElementById('app-content');
  renderRecords(container);
  setTimeout(() => {
    const sel = container.querySelector('select');
    if (sel) sel.value = userId;
  }, 50);
}
