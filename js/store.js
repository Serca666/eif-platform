/* ================================================================
   EIF Platform — Store (Estado Global + Datos Mock)
   ================================================================ */

const Store = {
  // ── Estado ───────────────────────────────────────────
  _state: {
    currentUser: null,
    currentPage: 'dashboard',
    sidebarCollapsed: false,
    notifications: [],
    loading: false
  },

  _listeners: [],

  getState() { return { ...this._state }; },

  setState(updates) {
    Object.assign(this._state, updates);
    this._listeners.forEach(fn => fn(this._state));
  },

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  },

  // ── Persistencia Híbrida (Supabase + LocalStorage) ──
  async initStorage() {
    // Force clear for v1.2 updates (Access Fix)
    if (localStorage.getItem('eif_db_version') !== '1.2') {
      localStorage.removeItem('eif_db');
      localStorage.setItem('eif_db_version', '1.2');
      console.log('🔄 Cache del sistema actualizada a v1.2');
    }

    this.setState({ loading: true });
    
    // 1. Intentar sincronización con Supabase (Prioridad Alta)
    if (window.db) {
      try {
        await this.syncFromSupabase();
        console.log('✅ Sincronización con Supabase exitosa.');
      } catch (e) {
        console.warn('⚠️ Error sincronizando Supabase, usando cache local:', e);
        this.loadFromLocal();
      }
    } else {
      this.loadFromLocal();
    }

    this.setState({ loading: false });
  },

  async syncFromSupabase() {
    if (!window.db) return;

    // Ejecutar consultas en paralelo para velocidad
    const [pRes, mRes, rRes] = await Promise.all([
      window.db.from('profiles').select('*'),
      window.db.from('modules').select('*'),
      window.db.from('digital_records').select('*').order('fecha', { ascending: false })
    ]);

    if (pRes.data) this.users = pRes.data;
    if (mRes.data) this.modules = mRes.data;
    if (rRes.data) this.digitalRecords = rRes.data;

    this.saveToLocal(); // Actualizar cache local
  },

  loadFromLocal() {
    const saved = localStorage.getItem('eif_db');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
          if (this.hasOwnProperty(key) && data[key]) {
            this[key] = data[key];
          }
        });
      } catch(e) { console.error('Error parseando cache local', e); }
    }

    // Asegurar que el nuevo administrador Sergio siempre esté disponible (clavar en la cache)
    const sergioEmail = 'scanavese@megatlon.com.ar';
    if (!this.users.find(u => u.email === sergioEmail)) {
      this.users.unshift({ 
        id: 'u-sergio', nombre: 'Sergio Canavese', email: sergioEmail, 
        rol: 'admin', nivel_jerarquico: 5, password: 'Ateneo165', created_at: '2026-04-16' 
      });
      this.saveToLocal();
    }
  },

  saveToLocal() {
    const dataToSave = {
      users: this.users,
      regions: this.regions,
      sucursales: this.sucursales,
      modules: this.modules,
      onboardingDays: this.onboardingDays,
      questionBank: this.questionBank,
      msCriteria: this.msCriteria,
      msEvaluations: this.msEvaluations,
      digitalRecords: this.digitalRecords,
      mockNotifications: this.mockNotifications,
      caseBank: this.caseBank || []
    };
    localStorage.setItem('eif_db', JSON.stringify(dataToSave));
  },

  // Método para persistir un cambio (Híbrido)
  async persist(table, data) {
    // 1. Local (Optimistic update)
    this.saveToLocal();

    // 2. Remoto
    if (window.db) {
      try {
        const { error } = await window.db.from(table).upsert(data);
        if (error) throw error;
        return true;
      } catch (e) {
        console.error(`Error persistiendo en ${table}:`, e);
        return false;
      }
    }
    return true;
  },

  // Wrapper para guardar todo el estado (Legacy support)
  async saveToStorage() {
    this.saveToLocal();
    console.log('💾 Estado guardado localmente.');
  },

  resetStorage() {
    localStorage.removeItem('eif_db');
    localStorage.removeItem('eif_user');
    window.location.reload();
  },

  // ════════════════  // ── Usuarios / Perfiles ──────────────────────────────
  users: [
    { id: 'u-sergio', nombre: 'Sergio Canavese', email: 'scanavese@megatlon.com.ar', dni: '0', rol: 'admin', nivel_jerarquico: 5, password: 'Ateneo165', created_at: '2026-04-16' },
    { id: 'u0', nombre: 'Admin EIF', email: 'admin@eif.com', dni: '1', rol: 'admin', nivel_jerarquico: 5, sucursal_id: 's1', region_id: 'r1', avatar: null, created_at: '2026-01-01', password: 'demo' },
    { id: 'u1', nombre: 'Martín García', email: 'martin.garcia@empresa.com', dni: '2', rol: 'admin', nivel_jerarquico: 5, sucursal_id: 's1', region_id: 'r1', avatar: null, created_at: '2025-01-15', password: 'demo' },
    { id: 'u2', nombre: 'Carolina Méndez', email: 'carolina.mendez@empresa.com', dni: '3', rol: 'gerente_regional', nivel_jerarquico: 4, sucursal_id: null, region_id: 'r1', avatar: null, created_at: '2025-02-01', password: 'demo' },
    { id: 'u3', nombre: 'Roberto Fernández', email: 'roberto.fernandez@empresa.com', dni: '4', rol: 'gerente_sucursal', nivel_jerarquico: 3, sucursal_id: 's1', region_id: 'r1', avatar: null, created_at: '2025-03-10', password: 'demo' },
    { id: 'u4', nombre: 'Lucía Torres', email: 'lucia.torres@empresa.com', dni: '5', rol: 'capacitador', nivel_jerarquico: 2, sucursal_id: 's1', region_id: 'r1', avatar: null, created_at: '2025-04-01', password: 'demo' },
    { id: 'u5', nombre: 'Diego Ramírez', email: 'diego.ramirez@empresa.com', dni: '6', rol: 'colaborador', nivel_jerarquico: 1, sucursal_id: 's1', region_id: 'r1', avatar: null, created_at: '2026-01-10', password: 'demo' },
    { id: 'u6', nombre: 'Ana Belén Soto', email: 'anabelen.soto@empresa.com', dni: '7', rol: 'colaborador', nivel_jerarquico: 1, sucursal_id: 's1', region_id: 'r1', avatar: null, created_at: '2026-02-15', password: 'demo' },
    { id: 'u7', nombre: 'Sergio Valdez', email: 'sergio.valdez@empresa.com', dni: '8', rol: 'evaluador_ms', nivel_jerarquico: 2, sucursal_id: null, region_id: 'r1', avatar: null, created_at: '2025-06-01', password: 'demo' },
    { id: 'u8', nombre: 'Valentina Ruiz', email: 'valentina.ruiz@empresa.com', dni: '9', rol: 'colaborador', nivel_jerarquico: 1, sucursal_id: 's2', region_id: 'r1', avatar: null, created_at: '2026-03-01', password: 'demo' },
    { id: 'u9', nombre: 'Matías López', email: 'matias.lopez@empresa.com', dni: '10', rol: 'colaborador', nivel_jerarquico: 1, sucursal_id: 's2', region_id: 'r1', avatar: null, created_at: '2026-03-05', password: 'demo' },
    { id: 'u10', nombre: 'Camila Herrera', email: 'camila.herrera@empresa.com', dni: '11', rol: 'gerente_sucursal', nivel_jerarquico: 3, sucursal_id: 's2', region_id: 'r1', avatar: null, created_at: '2025-05-20', password: 'demo' },
    { id: 'u11', nombre: 'Facundo Díaz', email: 'facundo.diaz@empresa.com', dni: '12', rol: 'colaborador', nivel_jerarquico: 1, sucursal_id: 's3', region_id: 'r2', avatar: null, created_at: '2026-03-15', password: 'demo' },
    { id: 'u12', nombre: 'Julieta Moreno', email: 'julieta.moreno@empresa.com', dni: '13', rol: 'gerente_regional', nivel_jerarquico: 4, sucursal_id: null, region_id: 'r2', avatar: null, created_at: '2025-03-01', password: 'demo' },
  ],

  // ── Regiones y Sucursales ────────────────────────────
  regions: [
    { id: 'r1', name: 'Región AMBA' },
    { id: 'r2', name: 'Región Centro' },
    { id: 'r3', name: 'Región Litoral' }
  ],

  sucursales: [
    { id: 's1', name: 'Sucursal Microcentro', region_id: 'r1', address: 'Av. Corrientes 1234' },
    { id: 's2', name: 'Sucursal Belgrano', region_id: 'r1', address: 'Av. Cabildo 2100' },
    { id: 's3', name: 'Sucursal Córdoba', region_id: 'r2', address: 'Av. Colón 567' },
    { id: 's4', name: 'Sucursal Rosario', region_id: 'r2', address: 'Bv. Oroño 890' },
    { id: 's5', name: 'Sucursal Paraná', region_id: 'r3', address: 'Av. Ramírez 345' }
  ],

  // ── Módulos de Aprendizaje ───────────────────────────
  modules: [
    {
      id: 'm1', titulo: 'Atención al Cliente - Nivel Inicial',
      descripcion: 'Fundamentos de la atención al cliente, protocolos de bienvenida y manejo de consultas frecuentes.',
      nivel_objetivo: 1, estado: 'activo', tipo_contenido: 'PDF',
      duracion_estimada: '45 min', fecha_vigencia: '2026-12-31',
      archivo_url: null, created_at: '2026-01-10', progress: 85
    },
    {
      id: 'm2', titulo: 'Protocolo de Ventas y Asesoramiento',
      descripcion: 'Técnicas de venta consultiva, detección de necesidades y presentación de soluciones.',
      nivel_objetivo: 1, estado: 'activo', tipo_contenido: 'VIDEO',
      duracion_estimada: '60 min', fecha_vigencia: '2026-12-31',
      archivo_url: null, created_at: '2026-01-15', progress: 60
    },
    {
      id: 'm3', titulo: 'Normativa de Seguridad e Higiene',
      descripcion: 'Regulaciones vigentes, protocolos de emergencia y prevención de riesgos laborales.',
      nivel_objetivo: 1, estado: 'activo', tipo_contenido: 'PPTX',
      duracion_estimada: '30 min', fecha_vigencia: '2026-12-31',
      archivo_url: null, created_at: '2026-02-01', progress: 100
    },
    {
      id: 'm4', titulo: 'Manejo de Quejas y Reclamos',
      descripcion: 'Procedimientos para la gestión efectiva de quejas, técnicas de contención y escalamiento.',
      nivel_objetivo: 2, estado: 'activo', tipo_contenido: 'TEXT',
      duracion_estimada: '40 min', fecha_vigencia: '2026-12-31',
      archivo_url: null, created_at: '2026-02-15', progress: 30
    },
    {
      id: 'm5', titulo: 'Liderazgo y Gestión de Equipos',
      descripcion: 'Habilidades de liderazgo, motivación de equipos, delegación efectiva y feedback constructivo.',
      nivel_objetivo: 3, estado: 'activo', tipo_contenido: 'VIDEO',
      duracion_estimada: '90 min', fecha_vigencia: '2026-12-31',
      archivo_url: null, created_at: '2026-03-01', progress: 0
    },
    {
      id: 'm6', titulo: 'Indicadores de Gestión y KPIs',
      descripcion: 'Interpretación de métricas clave, planes de acción basados en datos, reportería.',
      nivel_objetivo: 3, estado: 'borrador', tipo_contenido: 'PDF',
      duracion_estimada: '50 min', fecha_vigencia: '2026-12-31',
      archivo_url: null, created_at: '2026-03-10', progress: 0
    }
  ],

  // ── Onboarding ───────────────────────────────────────
  onboardingDays: [
    {
      day: 1,
      title: 'Bienvenida e Introducción',
      contents: [
        { id: 'c1-1', type: 'VIDEO', title: 'Video de bienvenida institucional', duration: '15 min', completed: true },
        { id: 'c1-2', type: 'PDF', title: 'Manual de cultura organizacional', duration: '20 min', completed: true },
        { id: 'c1-3', type: 'TEXT', title: 'Normas de convivencia y código de conducta', duration: '10 min', completed: true }
      ],
      participantQuiz: true, trainerFeedback: true, completed: true
    },
    {
      day: 2,
      title: 'Conocimiento del Producto',
      contents: [
        { id: 'c2-1', type: 'PPTX', title: 'Catálogo de productos y servicios', duration: '30 min', completed: true },
        { id: 'c2-2', type: 'VIDEO', title: 'Demo de sistema de punto de venta', duration: '25 min', completed: false },
        { id: 'c2-3', type: 'PDF', title: 'Guía rápida de precios y promociones', duration: '15 min', completed: false }
      ],
      participantQuiz: false, trainerFeedback: false, completed: false
    },
    {
      day: 3,
      title: 'Atención al Cliente',
      contents: [
        { id: 'c3-1', type: 'VIDEO', title: 'Protocolos de atención presencial', duration: '20 min', completed: false },
        { id: 'c3-2', type: 'TEXT', title: 'Scripts de atención telefónica', duration: '15 min', completed: false },
        { id: 'c3-3', type: 'PDF', title: 'Manejo de situaciones difíciles', duration: '20 min', completed: false }
      ],
      participantQuiz: false, trainerFeedback: false, completed: false
    },
    {
      day: 4,
      title: 'Operaciones y Caja',
      contents: [
        { id: 'c4-1', type: 'VIDEO', title: 'Tutorial de operación de caja', duration: '30 min', completed: false },
        { id: 'c4-2', type: 'PPTX', title: 'Procedimientos de apertura y cierre', duration: '20 min', completed: false },
        { id: 'c4-3', type: 'PDF', title: 'Detección de billetes falsos', duration: '10 min', completed: false }
      ],
      participantQuiz: false, trainerFeedback: false, completed: false
    },
    {
      day: 5,
      title: 'Evaluación Final y Cierre',
      contents: [
        { id: 'c5-1', type: 'TEXT', title: 'Repaso general de contenidos', duration: '30 min', completed: false },
        { id: 'c5-2', type: 'PDF', title: 'Guía de referencia rápida', duration: '10 min', completed: false }
      ],
      participantQuiz: false, trainerFeedback: false, completed: false,
      isFinalEvaluation: true
    }
  ],

  // ── Banco de Preguntas ───────────────────────────────
  questionBank: [
    { id: 'q1', module_id: 'm1', enunciado: '¿Cuál es el primer paso al recibir a un cliente en la sucursal?', tipo: 'single', opciones: ['Preguntarle qué necesita', 'Saludarlo con contacto visual y sonrisa', 'Derivarlo al área correspondiente', 'Pedirle que tome un número'], respuesta_correcta: 1, dificultad: 'media' },
    { id: 'q2', module_id: 'm1', enunciado: '¿Qué elementos debe incluir un saludo de bienvenida?', tipo: 'multiple', opciones: ['Contacto visual', 'Sonrisa genuina', 'Nombre del cliente si lo conoce', 'Ofertas del día'], respuesta_correcta: [0, 1, 2], dificultad: 'facil' },
    { id: 'q3', module_id: 'm1', enunciado: 'Un cliente se acerca visiblemente molesto por una espera prolongada. Describa cómo manejaría esta situación paso a paso.', tipo: 'caso', opciones: [], respuesta_correcta: null, dificultad: 'alta' },
    { id: 'q4', module_id: 'm1', enunciado: '¿Cuánto tiempo máximo debe esperar un cliente para ser atendido?', tipo: 'single', opciones: ['1 minuto', '3 minutos', '5 minutos', '10 minutos'], respuesta_correcta: 1, dificultad: 'facil' },
  ],

  // ── Banco de Casos (Simulaciones de Campo) ────────
  caseBank: [
    {
      id: 'c1',
      titulo: 'Lectura de Tablero: Caída de Retención',
      descripcion: 'El tablero de Power BI muestra una caída del 12% en la retención de socios en la jornada de la mañana durante el último mes.',
      indicadores: ['Retención', 'Bajas'],
      imagen_url: null, // Aquí se guardará el base64 de la imagen del tablero
      variantes: [
        { id: 'v1', enunciado: '¿Qué tres acciones inmediatas deberías discutir con tu equipo de recepción para mitigar este impacto?' },
        { id: 'v2', enunciado: 'Si observamos que el NPS (Net Promoter Score) se mantiene alto, ¿qué factor externo podría estar afectando la retención?' },
        { id: 'v3', enunciado: 'Propón un plan de incentivos para los profesores de fitness grupal basado en los datos de asistencia mostrados.' }
      ]
    }
  ],

  // ── Mystery Shopper — Criterios ──────────────────────
  msCriteria: [
    { id: 'mc1', name: 'Saludo de Bienvenida', description: 'Evaluación del protocolo de bienvenida al ingresar el cliente', module_refuerzo: 'm1' },
    { id: 'mc2', name: 'Presentación Personal', description: 'Uniforme completo, identificación visible, higiene personal', module_refuerzo: 'm3' },
    { id: 'mc3', name: 'Detección de Necesidades', description: 'Capacidad de identificar la necesidad real del cliente', module_refuerzo: 'm2' },
    { id: 'mc4', name: 'Conocimiento del Producto', description: 'Dominio de información sobre productos y servicios ofrecidos', module_refuerzo: 'm2' },
    { id: 'mc5', name: 'Manejo de Objeciones', description: 'Capacidad de responder a dudas y objeciones del cliente', module_refuerzo: 'm4' },
    { id: 'mc6', name: 'Cierre y Despedida', description: 'Protocolo de cierre de la interacción y despedida', module_refuerzo: 'm1' },
    { id: 'mc7', name: 'Orden del Espacio', description: 'Estado general del espacio de trabajo y exhibición', module_refuerzo: 'm3' },
    { id: 'mc8', name: 'Tiempo de Espera', description: 'Cumplimiento de los tiempos máximos de atención', module_refuerzo: 'm1' }
  ],

  // ── Evaluaciones MS Recientes ────────────────────────
  msEvaluations: [
    {
      id: 'ms1', evaluador_id: 'u7', colaborador_id: 'u5', sucursal_id: 's1',
      fecha: '2026-04-10', resultado_global: 'Alcanzó',
      criterios: [
        { criterio_id: 'mc1', rating: 2 }, { criterio_id: 'mc2', rating: 3 },
        { criterio_id: 'mc3', rating: 2 }, { criterio_id: 'mc4', rating: 2 },
        { criterio_id: 'mc5', rating: 1 }, { criterio_id: 'mc6', rating: 2 },
        { criterio_id: 'mc7', rating: 3 }, { criterio_id: 'mc8', rating: 2 }
      ],
      notas: 'Buen desempeño general. Necesita refuerzo en manejo de objeciones.'
    }
  ],

  // ── Legajo Digital (Digital Records) ─────────────────
  digitalRecords: [
    { id: 'dr1', user_id: 'u5', tipo_evento: 'ONBOARDING', referencia_id: 'ob1', resultado: 'Aprobado', nota: 8.5, fecha: '2026-01-20', generado_por: 'u4' },
    { id: 'dr2', user_id: 'u5', tipo_evento: 'EVALUACION', referencia_id: 'm1', resultado: 'Aprobado', nota: 9.0, fecha: '2026-02-10', generado_por: 'Sistema' },
    { id: 'dr3', user_id: 'u5', tipo_evento: 'EVALUACION', referencia_id: 'm2', resultado: 'Aprobado', nota: 7.5, fecha: '2026-02-25', generado_por: 'Sistema' },
    { id: 'dr4', user_id: 'u5', tipo_evento: 'MYSTERY', referencia_id: 'ms1', resultado: 'Alcanzó', nota: null, fecha: '2026-04-10', generado_por: 'u7' },
  ],

  // ── Notificaciones ───────────────────────────────────
  mockNotifications: [
    { id: 'n1', title: 'Nueva evaluación disponible', message: 'Módulo: Atención al Cliente', time: '5 min', read: false, type: 'info' },
    { id: 'n2', title: 'Refuerzo recomendado', message: 'Se asignó el módulo "Manejo de Quejas y Reclamos" como refuerzo.', time: '2 horas', read: false, type: 'warning' },
    { id: 'n3', title: 'Onboarding: Día 2 disponible', message: 'Ya puede acceder al contenido del Día 2', time: '1 día', read: true, type: 'success' },
  ],

  // ── Helpers de Datos ──────────────────────────────────
  getUserById(id) { return this.users.find(u => u.id === id); },
  getModuleById(id) { return this.modules.find(m => m.id === id); },
  getSucursalById(id) { return this.sucursales.find(s => s.id === id); },

  // Estadísticas Dinámicas (Basadas en datos reales si existen)
  get dashboardStats() {
    const isMock = this.users.length < 10; // Simple heurística
    
    // Si hay datos reales, calcular KPI básicos
    if (!isMock) {
      const activeUsers = this.users.length;
      const completedRecords = this.digitalRecords.filter(r => r.resultado === 'Aprobado' || r.resultado === 'Superó').length;
      
      return {
        admin: {
          totalUsers: activeUsers,
          activeOnboarding: this.users.filter(u => u.rol === 'colaborador' && u.nivel_jerarquico < 2).length,
          completionRate: Math.round((completedRecords / (this.digitalRecords.length || 1)) * 100),
          avgScore: 8.4,
          msThisMonth: this.digitalRecords.filter(r => r.tipo_evento === 'MYSTERY').length
        },
        colaborador: {
          modulesCompleted: this.digitalRecords.filter(r => r.user_id === Auth.currentUser?.id && r.tipo_evento === 'EVALUACION').length,
          modulesTotal: this.modules.length,
          avgScore: 8.8,
          pendingEvals: 1,
          progressPercent: 75,
          nextDeadline: Date.now() + 86400000 * 3
        }
      };
    }

    // Fallback a Mock (para que la UI no se rompa si está vacío)
    return {
      admin: { totalUsers: 124, activeOnboarding: 12, completionRate: 88, avgScore: 8.4, msThisMonth: 28 },
      colaborador: { modulesCompleted: 4, modulesTotal: 6, avgScore: 9.1, pendingEvals: 2, progressPercent: 65, nextDeadline: Date.now() + 86400000 * 2 }
    };
  },

  // ── Sucursal Performance (para dashboard) ────────────
  sucursalPerformance: [
    { sucursal: 'Microcentro', score: 92, trend: '+5%' },
    { sucursal: 'Belgrano', score: 88, trend: '+2%' },
    { sucursal: 'Córdoba', score: 85, trend: '-1%' },
    { sucursal: 'Rosario', score: 81, trend: '+8%' },
    { sucursal: 'Paraná', score: 78, trend: '+3%' }
  ],

  // ══════════════════════════════════════════════════════
  //  MÉTODOS DE ACCESO A DATOS
  // ══════════════════════════════════════════════════════

  getUserById(id) {
    return this.users.find(u => u.id === id);
  },

  getUsersByRole(role) {
    return this.users.filter(u => u.rol === role);
  },

  getUsersBySucursal(sucursalId) {
    return this.users.filter(u => u.sucursal_id === sucursalId);
  },

  getUsersByRegion(regionId) {
    return this.users.filter(u => u.region_id === regionId);
  },

  getModuleById(id) {
    return this.modules.find(m => m.id === id);
  },

  getModulesByLevel(level) {
    return this.modules.filter(m => m.nivel_objetivo <= level && m.estado === 'activo');
  },

  getQuestionsForModule(moduleId, count = 15) {
    const pool = this.questionBank.filter(q => q.module_id === moduleId);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },

  getRecordsForUser(userId) {
    return this.digitalRecords
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  getSucursalById(id) {
    return this.sucursales.find(s => s.id === id);
  },

  getRegionById(id) {
    return this.regions.find(r => r.id === id);
  },

  getMSEvaluationsForUser(userId) {
    return this.msEvaluations.filter(e => e.colaborador_id === userId);
  },

  getCriterionById(id) {
    return this.msCriteria.find(c => c.id === id);
  },

  // Estadísticas rápidas
  getOnboardingProgress() {
    const completed = this.onboardingDays.filter(d => d.completed).length;
    return Math.round((completed / this.onboardingDays.length) * 100);
  },

  getCurrentOnboardingDay() {
    const firstIncomplete = this.onboardingDays.find(d => !d.completed);
    return firstIncomplete ? firstIncomplete.day : this.onboardingDays.length;
  }
};

// Inicializar la persistencia al cargar el archivo
Store.initStorage();
