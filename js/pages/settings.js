/* ================================================================
   EIF Platform — Settings Page
   ================================================================ */

function renderSettings(container) {
  let html = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Configuración</h2>
        <p class="page-description">Ajustes generales de la plataforma EIF</p>
      </div>
    </div>

    <div class="grid-cols-3 gap-6">
      <div class="col-span-2">
        <!-- Sección: General -->
        <div class="card mb-6">
          <h3 class="card-title mb-6">General</h3>
          <div class="form-group">
            <label class="form-label">Nombre de la Organización</label>
            <input type="text" class="form-input" value="Mi Empresa S.A.">
          </div>
          <div class="grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Zona Horaria</label>
              <select class="form-input">
                <option selected>America/Argentina/Buenos_Aires (UTC-3)</option>
                <option>America/Sao_Paulo (UTC-3)</option>
                <option>America/Santiago (UTC-4)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Idioma</label>
              <select class="form-input">
                <option selected>Español (Argentina)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Sección: Evaluaciones -->
        <div class="card mb-6">
          <h3 class="card-title mb-6">Evaluaciones</h3>
          <div class="grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Preguntas por evaluación</label>
              <input type="number" class="form-input" value="${EIF_CONFIG.EXAM_QUESTIONS_COUNT}">
              <span class="form-hint">Cantidad de preguntas seleccionadas del banco</span>
            </div>
            <div class="form-group">
              <label class="form-label">Intentos máximos</label>
              <input type="number" class="form-input" value="${EIF_CONFIG.EXAM_DEFAULT_MAX_ATTEMPTS}">
              <span class="form-hint">Cantidad de intentos por evaluación</span>
            </div>
            <div class="form-group">
              <label class="form-label">TTL del enlace (horas)</label>
              <input type="number" class="form-input" value="${EIF_CONFIG.EXAM_LINK_TTL_HOURS}">
              <span class="form-hint">Tiempo de vida del enlace de evaluación</span>
            </div>
            <div class="form-group">
              <label class="form-label">Tamaño mínimo del banco</label>
              <input type="number" class="form-input" value="${EIF_CONFIG.EXAM_MIN_BANK_SIZE}">
              <span class="form-hint">Para garantizar variabilidad real</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nota mínima de aprobación</label>
            <input type="number" class="form-input" value="7" min="1" max="10" style="max-width:100px">
            <span class="form-hint">Puntaje mínimo para aprobar (escala 1-10)</span>
          </div>
        </div>

        <!-- Sección: Sesiones -->
        <div class="card mb-6">
          <h3 class="card-title mb-6">Seguridad y Sesiones</h3>
          <div class="grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Timeout de sesión (horas)</label>
              <input type="number" class="form-input" value="${EIF_CONFIG.SESSION_TIMEOUT_HOURS}">
              <span class="form-hint">Expiración por inactividad</span>
            </div>
            <div class="form-group">
              <label class="form-label">Retención de backups (días)</label>
              <input type="number" class="form-input" value="30">
            </div>
          </div>
          <div class="form-group mt-2">
            <label class="form-check">
              <input type="checkbox" checked>
              <span class="form-check-label">Cifrar datos sensibles en reposo</span>
            </label>
          </div>
          <div class="form-group">
            <label class="form-check">
              <input type="checkbox" checked>
              <span class="form-check-label">Backups automáticos diarios</span>
            </label>
          </div>
        </div>

        <!-- Sección: Notificaciones -->
        <div class="card mb-6">
          <h3 class="card-title mb-6">Notificaciones</h3>
          <div class="form-group">
            <div class="flex items-center justify-between mb-4">
              <div>
                <div class="font-semibold">WhatsApp Business API</div>
                <div class="text-xs text-tertiary">Envío de enlaces y recordatorios por WhatsApp</div>
              </div>
              <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
            </div>
            <div class="flex items-center justify-between mb-4">
              <div>
                <div class="font-semibold">Notificaciones por Email</div>
                <div class="text-xs text-tertiary">Envío de evaluaciones y refuerzos por email</div>
              </div>
              <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <div class="font-semibold">Alertas de Mystery Shopper</div>
                <div class="text-xs text-tertiary">Notificar gerente y colaborador al completar evaluación</div>
              </div>
              <label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label>
            </div>
          </div>
        </div>

        <!-- Sección: Inteligencia Artificial (Gemini) -->
        <div class="card mb-6">
          <h3 class="card-title mb-4" style="display:flex;align-items:center;gap:8px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            Inteligencia Artificial
          </h3>
          <p class="text-sm text-tertiary mb-6">La IA se utiliza para generar e-books educativos y crear preguntas algorítmicas aleatorias en las evaluaciones.</p>
          <div class="form-group">
            <label class="form-label">Google Gemini — API Key</label>
            <input type="password" id="gemini-api-key" class="form-input" placeholder="AIzaSy..." value="${localStorage.getItem('gemini_api_key') || ''}">
            <span class="form-hint">Obtené tu clave gratuita en <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--color-primary-400)">Google AI Studio</a>.</span>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button class="btn btn-outline">Cancelar</button>
          <button class="btn btn-primary" onclick="guardarAjustes()">Guardar Cambios</button>
        </div>
      </div>

      <script>
        function guardarAjustes() {
          const key = document.getElementById('gemini-api-key').value;
          localStorage.setItem('gemini_api_key', key);
          Toast.show('Configuración guardada', 'Los ajustes fueron guardados localmente.', 'success');
        }
      </script>

      <!-- Sidebar info -->
      <div>
        <div class="card mb-4">
          <h4 class="card-title mb-4">Conexión a Supabase</h4>
          <div class="flex items-center gap-2 mb-3">
            <span class="notification-dot" style="position:static;width:8px;height:8px;background:var(--color-warning-500)"></span>
            <span class="text-sm text-warning">No configurado</span>
          </div>
          <p class="text-xs text-tertiary mb-4">Configurá tu proyecto Supabase para habilitar la sincronización de datos en tiempo real.</p>
          <div class="form-group">
            <label class="form-label">URL del proyecto</label>
            <input type="text" class="form-input" placeholder="https://xxx.supabase.co" value="${EIF_CONFIG.SUPABASE_URL}">
          </div>
          <div class="form-group">
            <label class="form-label">Anon Key</label>
            <input type="password" class="form-input" placeholder="eyJ..." value="••••••••••">
          </div>
          <button class="btn btn-outline btn-sm w-full" onclick="Toast.show('Supabase', 'Conexión de prueba enviada.', 'info')">Probar Conexión</button>
        </div>

        <div class="card">
          <h4 class="card-title mb-4">Sobre EIF</h4>
          <div class="module-info-row">
            <span class="module-info-label">Versión</span>
            <span class="module-info-value">${EIF_CONFIG.APP_VERSION}</span>
          </div>
          <div class="module-info-row">
            <span class="module-info-label">Usuarios</span>
            <span class="module-info-value">${Store.users.length} registrados</span>
          </div>
          <div class="module-info-row">
            <span class="module-info-label">Módulos</span>
            <span class="module-info-value">${Store.modules.length} activos</span>
          </div>
          <div class="module-info-row">
            <span class="module-info-label">Banco</span>
            <span class="module-info-value">${Store.questionBank.length} preguntas</span>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}
