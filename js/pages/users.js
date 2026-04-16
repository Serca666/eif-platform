/* ================================================================
   EIF Platform — Gestión de Usuarios Page
   ================================================================ */

function renderUsers(container) {
  const users = Store.users;

  let html = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Gestión de Usuarios</h2>
        <p class="page-description">${users.length} usuarios registrados</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" onclick="document.getElementById('csv-file').click()">${icon('upload', 16)} Importar CSV (Masivo)</button>
        <input type="file" id="csv-file" accept=".csv" style="display:none" onchange="handleCSVUpload(event)">
        <button class="btn btn-primary" onclick="showCreateUserModal()">${icon('plus', 16)} Nuevo Usuario</button>
      </div>
    </div>
  `;

  // Stats rápidos
  html += `
    <div class="grid-cols-4 stagger-children mb-6">
      <div class="kpi-card kpi-primary">
        <div class="kpi-value">${users.length}</div>
        <div class="kpi-label">Total Usuarios</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-value">${users.filter(u => u.rol === 'colaborador').length}</div>
        <div class="kpi-label">Colaboradores</div>
      </div>
      <div class="kpi-card kpi-accent">
        <div class="kpi-value">${users.filter(u => u.rol === 'capacitador').length}</div>
        <div class="kpi-label">Capacitadores</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-value">${users.filter(u => u.rol.includes('gerente')).length}</div>
        <div class="kpi-label">Gerentes</div>
      </div>
    </div>
  `;

  // Filtros
  html += `
    <div class="filter-bar mb-4">
      <div class="filter-search">
        <span class="filter-search-icon">${icon('search', 16)}</span>
        <input type="text" class="filter-search-input form-input" placeholder="Buscar usuario..." oninput="searchUsers(this.value)">
      </div>
      <select class="form-input" style="max-width:200px" onchange="filterUsersByRole(this.value)">
        <option value="">Todos los roles</option>
        ${Object.entries(EIF_CONFIG.ROLE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>
  `;

  // Tabla de usuarios
  html += `
    <div class="data-table-wrapper">
      <table class="data-table" id="users-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Nivel</th>
            <th>Sucursal</th>
            <th>Región</th>
            <th>Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  users.forEach(u => {
    const sucursal = Store.getSucursalById(u.sucursal_id);
    const region = Store.getRegionById(u.region_id);
    const level = EIF_CONFIG.HIERARCHY_LEVELS.find(l => l.id === u.nivel_jerarquico);

    html += `
          <tr data-role="${u.rol}" data-name="${u.nombre.toLowerCase()}">
            <td>
              <div class="flex items-center gap-3">
                <div class="avatar avatar-sm">${Auth.getInitials(u.nombre)}</div>
                <div>
                  <div class="font-medium text-primary">${u.nombre}</div>
                  <div class="text-xs text-tertiary">${u.email}</div>
                </div>
              </div>
            </td>
            <td><span class="badge badge-primary">${EIF_CONFIG.ROLE_LABELS[u.rol] || u.rol}</span></td>
            <td>${level?.name || u.nivel_jerarquico}</td>
            <td>${sucursal?.name || '—'}</td>
            <td>${region?.name || '—'}</td>
            <td class="text-tertiary">${new Date(u.created_at).toLocaleDateString('es-AR')}</td>
            <td>
              <div class="flex gap-1">
                <button class="btn btn-ghost btn-icon btn-sm" data-tooltip="Ver perfil" onclick="Router.navigate('records')">${icon('eye', 14)}</button>
                <button class="btn btn-ghost btn-icon btn-sm" data-tooltip="Editar" onclick="Toast.show('Editar', 'Edición de usuario próximamente.', 'info')">${icon('edit', 14)}</button>
              </div>
            </td>
          </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <div class="data-table-pagination">
        <span>Mostrando ${users.length} de ${users.length} usuarios</span>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" disabled>${icon('chevronLeft', 14)}</button>
          <button class="btn btn-ghost btn-sm" disabled>${icon('chevronRight', 14)}</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function searchUsers(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#users-table tbody tr').forEach(row => {
    row.style.display = row.dataset.name.includes(q) ? '' : 'none';
  });
}

function filterUsersByRole(role) {
  document.querySelectorAll('#users-table tbody tr').forEach(row => {
    row.style.display = !role || row.dataset.role === role ? '' : 'none';
  });
}

function showCreateUserModal() {
  showModal('Nuevo Usuario', `
    <div class="grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label required">Nombre</label>
        <input type="text" id="new-user-name" class="form-input" placeholder="Nombre completo">
      </div>
      <div class="form-group">
        <label class="form-label required">Email</label>
        <input type="email" id="new-user-email" class="form-input" placeholder="email@empresa.com">
      </div>
    </div>
    <div class="grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label required">Rol</label>
        <select class="form-input" id="new-user-rol">
          ${Object.entries(EIF_CONFIG.ROLE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label required">Nivel Jerárquico</label>
        <select class="form-input" id="new-user-nivel">
          ${EIF_CONFIG.HIERARCHY_LEVELS.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label">Sucursal</label>
        <select class="form-input" id="new-user-sucursal">
          <option value="">Sin asignar</option>
          ${Store.sucursales.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Región</label>
        <select class="form-input" id="new-user-region">
          ${Store.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-check">
        <input type="checkbox" id="send-invite" checked>
        <span class="form-check-label">Enviar invitación por email al nuevo usuario</span>
      </label>
    </div>
  `, () => {
    // Lectura de los valores desde el DOM
    const nombre = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const rol = document.getElementById('new-user-rol').value;
    const nivel = document.getElementById('new-user-nivel').value;
    const suc = document.getElementById('new-user-sucursal').value;
    const reg = document.getElementById('new-user-region').value;

    if (!nombre || !email) {
      Toast.show('Error', 'Nombre y Email son obligatorios', 'warning');
      return;
    }

    const newUser = {
      id: 'pending_' + Date.now(), // El ID real lo asignará Supabase Auth al registrarse
      nombre: nombre,
      email: email,
      rol: rol,
      nivel_jerarquico: parseInt(nivel),
      sucursal_id: suc || null,
      region_id: reg || null,
      avatar_url: null,
      created_at: new Date().toISOString()
    };

    // En un flujo real de Supabase, deberíamos invitar al usuario vía Auth
    // Por ahora, lo guardamos en Profiles si se tiene el ID, o lo registramos.
    // Como esta es una demo técnica, simulamos la inserción enprofiles.
    
    Store.users.unshift(newUser);
    
    if (window.db) {
      Toast.show('Registrando...', 'Creando perfil en Supabase.', 'info');
      // Nota: En producción, usar supabase.auth.admin.createUser para asignar el ID real
      Store.persist('profiles', newUser).then(success => {
        if (success) {
          Toast.show('Usuario subido', 'Perfil sincronizado en la nube.', 'success');
        }
      });
    }

    Store.saveToStorage();

    Toast.show('Usuario creado', 'El usuario ha sido registrado (Local + Nube).', 'success');
    closeModal();
    renderUsers(document.getElementById('app-content'));
  }, 'Crear Usuario');
}

// ── Carga Masiva CSV ──
function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const text = e.target.result;
    const lines = text.split('\n').filter(l => l.trim() !== '');
    
    // Ignorar encabezados simples y parsear
    let creados = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 2) {
        Store.users.push({
          id: 'usr_' + Date.now() + i,
          nombre: parts[0] || 'Desconocido',
          email: parts[1] || `user${i}@empresa.com`,
          rol: parts[2] || 'colaborador',
          nivel_jerarquico: parseInt(parts[3]) || 1,
          region_id: parts[4] || 'r1',
          sucursal_id: parts[5] || null,
          avatar_url: ''
        });
        creados++;
      }
    }
    
    await Store.saveToStorage();
    Toast.show('Importación Masiva Exitosa', `Se han importado ${creados} usuarios desde el archivo CSV.`, 'success');
    
    // Recargar vista
    setTimeout(() => { Router.render('users'); }, 1000);
  };
  
  reader.readAsText(file);
}
