/* ================================================================
   EIF Platform — Dashboard Page
   ================================================================ */

function renderDashboard(container) {
  const user = Auth.currentUser;
  const role = user.rol;
  const stats = Store.dashboardStats;

  let html = '';

  // Banner de bienvenida
  html += `
    <div class="welcome-banner animate-fade-in">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 class="welcome-title">¡Buen día, ${user.nombre.split(' ')[0]}! 👋</h2>
          <p class="welcome-text">Bienvenido al Ecosistema Integrado de Formación. Acá podés ver el resumen de tu actividad${role === 'admin' ? ' y la de toda la organización' : ''}.</p>
        </div>
        <div class="welcome-stats">
  `;

  if (role === 'admin') {
    html += `
          <div class="welcome-stat"><span class="welcome-stat-value">${stats.admin.totalUsers}</span><span class="welcome-stat-label">Usuarios</span></div>
          <div class="welcome-stat"><span class="welcome-stat-value">${stats.admin.completionRate}%</span><span class="welcome-stat-label">Tasa de Completitud</span></div>
          <div class="welcome-stat"><span class="welcome-stat-value">${stats.admin.avgScore}</span><span class="welcome-stat-label">Nota Promedio</span></div>
    `;
  } else {
    html += `
          <div class="welcome-stat"><span class="welcome-stat-value">${stats.colaborador.progressPercent}%</span><span class="welcome-stat-label">Progreso</span></div>
          <div class="welcome-stat"><span class="welcome-stat-value">${stats.colaborador.avgScore}</span><span class="welcome-stat-label">Nota Promedio</span></div>
          <div class="welcome-stat"><span class="welcome-stat-value">${stats.colaborador.pendingEvals}</span><span class="welcome-stat-label">Eval. Pendientes</span></div>
    `;
  }

  html += `</div></div></div>`;

  // KPI Cards
  html += '<div class="dashboard-grid stagger-children mt-6">';

  if (role === 'admin' || role === 'gerente_regional' || role === 'gerente_sucursal') {
    html += `
      <div class="kpi-card kpi-primary">
        <div class="kpi-header">
          <div class="kpi-icon primary">${icon('users', 22)}</div>
          <span class="kpi-trend up">${icon('trendUp', 12)} +12%</span>
        </div>
        <div class="kpi-value">${stats.admin.totalUsers}</div>
        <div class="kpi-label">Colaboradores Activos</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-header">
          <div class="kpi-icon success">${icon('onboarding', 22)}</div>
          <span class="kpi-trend up">${icon('trendUp', 12)} +5%</span>
        </div>
        <div class="kpi-value">${stats.admin.activeOnboarding}</div>
        <div class="kpi-label">Onboarding en Curso</div>
      </div>
      <div class="kpi-card kpi-accent">
        <div class="kpi-header">
          <div class="kpi-icon accent">${icon('evaluations', 22)}</div>
          <span class="kpi-trend up">${icon('trendUp', 12)} +3%</span>
        </div>
        <div class="kpi-value">${stats.admin.completionRate}%</div>
        <div class="kpi-label">Tasa de Completitud</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-header">
          <div class="kpi-icon warning">${icon('mystery', 22)}</div>
          <span class="kpi-trend down">${icon('trendDown', 12)} -2%</span>
        </div>
        <div class="kpi-value">${stats.admin.msThisMonth}</div>
        <div class="kpi-label">Mystery Shopper / Mes</div>
      </div>
    `;
  } else {
    // Colaborador / Capacitador KPIs
    html += `
      <div class="kpi-card kpi-primary">
        <div class="kpi-header">
          <div class="kpi-icon primary">${icon('elearning', 22)}</div>
        </div>
        <div class="kpi-value">${stats.colaborador.modulesCompleted}/${stats.colaborador.modulesTotal}</div>
        <div class="kpi-label">Módulos Completados</div>
        <div class="progress progress-sm mt-3"><div class="progress-bar" style="width: ${(stats.colaborador.modulesCompleted / stats.colaborador.modulesTotal) * 100}%"></div></div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-header">
          <div class="kpi-icon success">${icon('evaluations', 22)}</div>
        </div>
        <div class="kpi-value">${stats.colaborador.avgScore}</div>
        <div class="kpi-label">Nota Promedio</div>
      </div>
      <div class="kpi-card kpi-accent">
        <div class="kpi-header">
          <div class="kpi-icon accent">${icon('clock', 22)}</div>
        </div>
        <div class="kpi-value">${stats.colaborador.pendingEvals}</div>
        <div class="kpi-label">Evaluaciones Pendientes</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-header">
          <div class="kpi-icon warning">${icon('calendar', 22)}</div>
        </div>
        <div class="kpi-value">${new Date(stats.colaborador.nextDeadline).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</div>
        <div class="kpi-label">Próximo Vencimiento</div>
      </div>
    `;
  }

  // Chart: Rendimiento por sucursal (admin/gerente)
  if (role === 'admin' || role === 'gerente_regional') {
    html += `
      <div class="chart-container col-span-2">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">Rendimiento por Sucursal</h3>
            <p class="chart-subtitle">Comparativa de puntaje promedio por sede</p>
          </div>
          <div class="tabs-pill">
            <span class="tab-pill active">Mes</span>
            <span class="tab-pill">Trimestre</span>
            <span class="tab-pill">Año</span>
          </div>
        </div>
        <div class="ranking-list">
    `;

    Store.sucursalPerformance.forEach((s, i) => {
      const posClass = i < 3 ? `top-${i + 1}` : '';
      html += `
          <div class="ranking-item">
            <span class="ranking-position ${posClass}">${i + 1}</span>
            <div class="ranking-info">
              <div class="ranking-name">${s.sucursal}</div>
              <div class="ranking-meta">${s.trend}</div>
            </div>
            <div style="flex:1; max-width: 200px;">
              <div class="progress progress-sm"><div class="progress-bar" style="width:${s.score}%"></div></div>
            </div>
            <span class="ranking-score">${s.score}%</span>
          </div>
      `;
    });

    html += '</div></div>';
  }

  // Actividad Reciente
  html += `
    <div class="chart-container ${role === 'admin' || role === 'gerente_regional' ? 'col-span-2' : 'col-span-full'}">
      <div class="chart-header">
        <h3 class="chart-title">Actividad Reciente</h3>
        <button class="btn btn-ghost btn-sm">Ver todo</button>
      </div>
      <div class="activity-list">
  `;

  const activities = [
    { icon: '🎓', title: 'Diego Ramírez completó el onboarding', desc: 'Nota final: 8.5 — Capacitador: Lucía Torres', time: 'Hace 2 horas', color: 'rgba(99, 102, 241, 0.12)' },
    { icon: '📋', title: 'Nueva evaluación de Mystery Shopper', desc: 'Ana Belén Soto — Resultado: En proceso', time: 'Hace 5 horas', color: 'rgba(245, 158, 11, 0.12)' },
    { icon: '✅', title: 'Valentina Ruiz aprobó "Atención al Cliente"', desc: 'Nota: 9.0 — 1er intento', time: 'Hace 1 día', color: 'rgba(16, 185, 129, 0.12)' },
    { icon: '📚', title: 'Nuevo módulo publicado: "Indicadores de Gestión"', desc: 'Nivel: Jefe de Sucursal — Estado: Activo', time: 'Hace 2 días', color: 'rgba(59, 130, 246, 0.12)' },
    { icon: '🔄', title: 'Refuerzo asignado a Ana Belén Soto', desc: 'Módulo: Manejo de Quejas y Reclamos', time: 'Hace 2 días', color: 'rgba(245, 158, 11, 0.12)' }
  ];

  activities.forEach(a => {
    html += `
        <div class="activity-item">
          <div class="activity-icon" style="background:${a.color}"><span style="font-size:18px">${a.icon}</span></div>
          <div class="activity-content">
            <div class="activity-title">${a.title}</div>
            <div class="activity-description">${a.desc}</div>
          </div>
          <span class="activity-time">${a.time}</span>
        </div>
    `;
  });

  html += '</div></div>';

  // Módulos Pendientes (colaborador)
  if (role === 'colaborador' || role === 'capacitador') {
    html += `
      <div class="chart-container col-span-full">
        <div class="chart-header">
          <h3 class="chart-title">Mis Módulos en Progreso</h3>
          <button class="btn btn-primary btn-sm" onclick="Router.navigate('elearning')">Ver todos ${icon('chevronRight', 14)}</button>
        </div>
        <div class="module-grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
    `;

    Store.modules.filter(m => m.progress > 0 && m.progress < 100).forEach(m => {
      const typeInfo = EIF_CONFIG.CONTENT_TYPES[m.tipo_contenido];
      html += `
          <div class="card card-interactive" onclick="Router.navigate('elearning')">
            <div class="flex items-center gap-3 mb-4">
              <span style="font-size:24px">${typeInfo?.icon || '📄'}</span>
              <div>
                <div class="font-semibold text-md">${m.titulo}</div>
                <div class="text-xs text-tertiary">${m.duracion_estimada}</div>
              </div>
            </div>
            <div class="progress progress-sm"><div class="progress-bar" style="width:${m.progress}%"></div></div>
            <div class="text-xs text-tertiary mt-2">${m.progress}% completo</div>
          </div>
      `;
    });

    html += '</div></div>';
  }

  html += '</div>'; // close dashboard-grid

  container.innerHTML = html;
}
