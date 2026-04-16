/* ================================================================
   EIF Platform — Autenticación (Supabase Híbrida)
   ================================================================ */

const Auth = {
  currentUser: null,

  // Login de Usuario (Híbrido)
  async login(email, password) {
    if (window.db) {
      try {
        // 1. Autenticación en Supabase Auth
        const { data: authData, error: authError } = await window.db.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        // 2. Obtener Perfil extendido del usuario
        const { data: profile, error: profError } = await window.db
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profError) {
          console.warn('⚠️ Perfil no encontrado, creando uno por defecto...');
          // Trigger fallback manual si el trigger de DB fallase (poco común)
          const newProfile = {
            id: authData.user.id,
            email: email,
            nombre: authData.user.user_metadata?.nombre || 'Usuario Nuevo',
            rol: authData.user.user_metadata?.rol || 'colaborador',
            nivel_jerarquico: parseInt(authData.user.user_metadata?.nivel_jerarquico || '1')
          };
          await window.db.from('profiles').insert(newProfile);
          this.currentUser = newProfile;
        } else {
          this.currentUser = profile;
        }

        this._saveSession(this.currentUser);
        return this.currentUser;
      } catch (error) {
        console.error('Error de login Supabase:', error);
        throw error;
      }
    } else {
      // Fallback a Mock (Solo para Desarrollo local)
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const user = Store.users.find(u => u.email === email);
          if (user) {
            this.currentUser = user;
            this._saveSession(user);
            resolve(user);
          } else {
            reject(new Error('Credenciales inválidas (Modo Demo)'));
          }
        }, 800);
      });
    }
  },

  async logout() {
    if (window.db) {
      await window.db.auth.signOut();
    }
    this.currentUser = null;
    Store.setState({ currentUser: null });
    localStorage.removeItem('eif_user');
    localStorage.removeItem('eif_login_time');
    window.location.href = 'index.html';
  },

  // Restaurar sesión persistente
  restoreSession() {
    const stored = localStorage.getItem('eif_user');
    const loginTime = localStorage.getItem('eif_login_time');

    if (stored && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime);
      const maxAge = EIF_CONFIG.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;

      if (elapsed < maxAge) {
        this.currentUser = JSON.parse(stored);
        Store.setState({ currentUser: this.currentUser });
        
        // Verificar sesión de Supabase asincrónicamente
        if (window.db) {
          window.db.auth.getSession().then(({ data }) => {
            if (!data.session) {
              console.warn('⚠️ Sesión de Supabase expirada o inválida.');
              // Opcional: Cerrar sesión local si la de Supabase no es válida
            }
          });
        }
        return this.currentUser;
      } else {
        this.logout();
      }
    }
    return null;
  },

  _saveSession(user) {
    Store.setState({ currentUser: user });
    localStorage.setItem('eif_user', JSON.stringify(user));
    localStorage.setItem('eif_login_time', Date.now().toString());
  },

  isAuthenticated() { return this.currentUser !== null; },
  hasRole(role) { return this.currentUser?.rol === role; },
  
  hasAccess(page) {
    if (!this.currentUser) return false;
    const nav = EIF_CONFIG.NAV_BY_ROLE[this.currentUser.rol];
    return nav ? nav.includes(page) : false;
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(n => n).map(n => n[0]).slice(0, 2).join('').toUpperCase();
  },

  // Quick login (solo admin o testers)
  async quickLogin(role) {
    const user = Store.users.find(u => u.rol === role);
    if (!user) throw new Error('Rol no encontrado en el store mock');
    return this.login(user.email, 'demo');
  }
};

// Monitoreo de sesión periódico
setInterval(() => {
  if (Auth.currentUser) {
    const loginTime = localStorage.getItem('eif_login_time');
    if (loginTime) {
      const elapsed = Date.now() - parseInt(loginTime);
      if (elapsed >= EIF_CONFIG.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000) {
        Toast.show('Sesión expirada', 'Tu sesión ha expirado.', 'warning');
        setTimeout(() => Auth.logout(), 1500);
      }
    }
  }
}, EIF_CONFIG.SESSION_CHECK_INTERVAL);
