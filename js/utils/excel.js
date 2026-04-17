/* ================================================================
   EIF Platform — Utilidades de Excel (SheetJS)
   ================================================================ */

const ExcelUtils = {
  
  // ── Generar Plantilla de Usuarios ──────────────────
  downloadUserTemplate() {
    const data = [
      ['DNI', 'Nombre Completo', 'Email', 'Rol', 'Nivel Jerárquico', 'Password', 'ID Sucursal'],
      ['12345678', 'Juan Pérez', 'juan.perez@megatlon.com.ar', 'colaborador', '1', '1234', 's1'],
      ['87654321', 'María García', 'maria.garcia@megatlon.com.ar', 'gerente_sucursal', '3', '1234', 's2']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    
    // Anchos de columna automáticos
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];

    XLSX.writeFile(wb, "Plantilla_Usuarios_EIF.xlsx");
    Toast.show('Excel', 'Plantilla de usuarios descargada.', 'success');
  },

  // ── Generar Plantilla de Módulos ──────────────────
  downloadModuleTemplate() {
    const data = [
      ['Título', 'Descripción', 'Tipo Contenido', 'Nivel Objetivo', 'Duración Estimada'],
      ['Atención Especializada', 'Módulo sobre técnicas de atención...', 'PDF', '1', '45 min'],
      ['Seguridad en Sala', 'Protocolos de seguridad y prevención...', 'VIDEO', '1', '30 min']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Módulos");
    
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    XLSX.writeFile(wb, "Plantilla_Modulos_EIF.xlsx");
    Toast.show('Excel', 'Plantilla de módulos descargada.', 'success');
  },

  // ── Procesar Archivo de Usuarios ──────────────────
  async importUsers(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

          let added = 0;
          let updated = 0;

          jsonData.forEach(item => {
            const dni = String(item['DNI'] || '').trim();
            if (!dni) return;

            const existingIndex = Store.users.findIndex(u => String(u.dni) === dni);
            const userData = {
              nombre: item['Nombre Completo'],
              email: item['Email'],
              rol: item['Rol'] || 'colaborador',
              nivel_jerarquico: parseInt(item['Nivel Jerárquico'] || 1),
              password: String(item['Password'] || '1234'),
              sucursal_id: item['ID Sucursal'] || 's1',
              dni: dni
            };

            if (existingIndex > -1) {
              // Actualizar existente (Búsqueda por DNI)
              Store.users[existingIndex] = { ...Store.users[existingIndex], ...userData };
              updated++;
            } else {
              // Crear nuevo
              userData.id = 'u_' + Date.now() + Math.random().toString(36).substr(2, 5);
              userData.created_at = new Date().toISOString();
              Store.users.push(userData);
              added++;
            }
          });

          Store.saveToStorage();
          resolve({ added, updated });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  // ── Procesar Archivo de Módulos ──────────────────
  async importModules(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

          let added = 0;

          jsonData.forEach(item => {
            const modData = {
              id: 'm_' + Date.now() + Math.random().toString(36).substr(2, 5),
              titulo: item['Título'] || 'Sin título',
              descripcion: item['Descripción'] || '',
              tipo_contenido: item['Tipo Contenido'] || 'PDF',
              nivel_objetivo: parseInt(item['Nivel Objetivo'] || 1),
              duracion_estimada: item['Duración Estimada'] || '30 min',
              estado: 'borrador',
              progress: 0,
              fecha_vigencia: '2026-12-31',
              created_at: new Date().toISOString()
            };
            Store.modules.push(modData);
            added++;
          });

          Store.saveToStorage();
          resolve({ added });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
};
