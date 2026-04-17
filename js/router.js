/* ================================================================
   EIF Platform — Router SPA
   ================================================================ */

const Router = {
  routes: {},
  currentRoute: null,

  register(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path) {
    if (this.currentRoute === path) return;
    this.currentRoute = path;
    window.history.pushState({ path }, '', `#${path}`);
    this.render(path);
  },

  render(path) {
    const handler = this.routes[path];
    const content = document.getElementById('app-content');
    if (!content) return;

    // Animación de salida
    content.classList.add('page-exit');
    setTimeout(() => {
      content.classList.remove('page-exit');
      
      console.log(`[Router] Navegando a: ${path}`);
      
      if (handler) {
        try {
          handler(content);
        } catch (err) {
          console.error(`[Router] Error renderizando la página ${path}:`, err);
          content.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">⚠️</div>
              <h3 class="empty-state-title">Error al cargar la página</h3>
              <p class="empty-state-text">Ocurrió un error inesperado al renderizar esta sección. Revisá la consola para más detalles.</p>
              <button class="btn btn-outline btn-sm mt-4" onclick="window.location.reload()">Recargar Aplicación</button>
            </div>
          `;
        }
      } else {
        console.warn(`[Router] Ruta no registrada: ${path}`);
        content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚧</div><h3 class="empty-state-title">Página no encontrada</h3><p class="empty-state-text">La sección "${path}" que buscás no existe o no tenés permisos.</p></div>`;
      }
      content.classList.add('page-enter');
      // Actualizar sidebar activo
      document.querySelectorAll('.sidebar-link').forEach(el => {
        el.classList.toggle('active', el.dataset.page === path);
      });
      // Actualizar mobile nav
      document.querySelectorAll('.mobile-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === path);
      });
      // Actualizar título
      Store.setState({ currentPage: path });
      updateHeaderTitle(path);

      setTimeout(() => content.classList.remove('page-enter'), 400);
    }, 150);
  },

  init() {
    window.addEventListener('popstate', (e) => {
      const path = e.state?.path || 'dashboard';
      this.currentRoute = path;
      this.render(path);
    });
    // Hash routing
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(hash);
  }
};

function updateHeaderTitle(page) {
  const titles = {
    dashboard: 'Dashboard',
    onboarding: 'Onboarding',
    elearning: 'Centro de Capacitación',
    evaluations: 'Evaluaciones',
    mystery: 'Mystery Shopper',
    records: 'Legajo Digital',
    users: 'Gestión de Usuarios',
    settings: 'Configuración'
  };
  const el = document.getElementById('header-page-title');
  if (el) el.textContent = titles[page] || page;
}
