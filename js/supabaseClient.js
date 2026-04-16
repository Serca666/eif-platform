/* ================================================================
   EIF Platform — Supabase Client Wrapper
   ================================================================ */

const SUPABASE_URL = localStorage.getItem('supabase_url') || EIF_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = localStorage.getItem('supabase_anon_key') || EIF_CONFIG.SUPABASE_ANON_KEY;

let db = null;

if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http') && !SUPABASE_URL.includes('tu-proyecto')) {
  // Inicializamos el cliente global expuesto en window.supabase (vía CDN)
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase Client Initialized');
} else {
  console.warn('⚠️ Supabase no configurado o script CDN no cargado. Fallback a Storage activado.');
}

window.db = db;
