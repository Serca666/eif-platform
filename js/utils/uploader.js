/* ================================================================
   EIF Platform — File Uploader Utility (Supabase Storage)
   ================================================================ */

const FileUploader = {
  bucket: 'materials',

  /**
   * Sube un archivo a Supabase Storage
   * @param {File} file - El objeto File del input
   * @param {String} path - Ruta dentro del bucket (ej: 'modules/video1.mp4')
   * @returns {Promise<String|null>} - Retorna la URL pública o null si falla
   */
  async upload(file, path) {
    if (!window.db) {
      console.warn('⚠️ Supabase no configurado. No se puede subir el archivo.');
      return null;
    }

    try {
      // 1. Subir el archivo
      const { data, error } = await window.db.storage
        .from(this.bucket)
        .upload(`${path}_${Date.now()}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // 2. Obtener la URL pública
      const { data: { publicUrl } } = window.db.storage
        .from(this.bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('[FileUploader] Error subiendo archivo:', err);
      Toast.show('Error de Carga', 'No se pudo subir el archivo a la nube.', 'danger');
      return null;
    }
  }
};

window.FileUploader = FileUploader;
