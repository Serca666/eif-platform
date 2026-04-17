/* ================================================================
   EIF Platform — Autenticación (Supabase Híbrida)
   ================================================================ */

const Auth = {
  currentUser: null,

  // Login de Usuario (Híbrido)
  async login(email, password) {
    let supabaseError = null;
    const cleanEmail = email.trim().toLowerCase();

    // 0. Acceso Prioritario Administrativo (Fail-safe)
    const adminEmail = 'scanavese@megatlon.com.ar';
    const adminPass = 'Ateneo165';
    
    if (cleanEmail === adminEmail && password === adminPass) {
      console.log('🚀 Acceso administrativo prioritario concedido.');
      const adminUser = Store.users.find(u => u.email === adminEmail) || {
        id: 'u-sergio', nombre: 'Sergio Canavese', email: adminEmail, rol: 'admin', nivel_jerarquico: 5
      };
      this.currentUser = adminUser;
      this._saveSession(adminUser);
      return adminUser;
    }

    // 1. Intentar con Supabase si está disponible
    if (window.db) {
      try {
        const { data: authData, error: authError } = await window.db.auth.signInWithPassword({ email: cleanEmail, password });
        if (authError) throw authError;

        const { data: profile, error: profError } = await window.db
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (!profError && profile) {
          this.currentUser = profile;
          this._saveSession(this.currentUser);
          return this.currentUser;
        }
      } catch (error) {
        supabaseError = error;
        console.warn('⚠️ Falló el login en Supabase, intentando modo Demo/Mock...', error.message);
      }
    }

    // 2. Fallback a Mock
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = Store.users.find(u => u.email.trim().toLowerCase() === cleanEmail);
        
        if (user && user.password === password) {
          console.log('✅ Acceso concedido vía modo Demo/Mock');
          this.currentUser = user;
          this._saveSession(user);
          resolve(user);
        } else {
          console.error('❌ Error de autenticación final:', cleanEmail);
          reject(supabaseError || new Error('Email o contraseña incorrectos.'));
        }
      }, 600);
    });
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
