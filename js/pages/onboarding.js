/* ================================================================
   EIF Platform — Onboarding Page
   ================================================================ */

function renderOnboarding(container) {
  const user = Auth.currentUser;
  const days = Store.onboardingDays;
  const currentDay = Store.getCurrentOnboardingDay();
  const progress = Store.getOnboardingProgress();

  let html = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Onboarding Estructurado</h2>
        <p class="page-description">Proceso de inducción — ${days.length} días de formación</p>
      </div>
      ${user.rol === 'admin' ? `<div class="page-actions"><button class="btn btn-primary">${icon('settings', 16)} Configurar Estructura</button></div>` : ''}
    </div>
  `;

  // Resumen de progreso
  html += `
    <div class="onboarding-summary stagger-children">
      <div class="summary-stat">
        <div class="stat-label mb-2">Progreso General</div>
        <div class="stat-value">${progress}%</div>
        <div class="progress mt-3"><div class="progress-bar" style="width:${progress}%"></div></div>
      </div>
      <div class="summary-stat">
        <div class="stat-label mb-2">Día Actual</div>
        <div class="stat-value">Día ${currentDay}</div>
        <div class="text-xs text-tertiary mt-2">de ${days.length} días totales</div>
      </div>
      <div class="summary-stat">
        <div class="stat-label mb-2">Estado</div>
        <div class="stat-value text-md">${progress === 100 ? '<span class="badge badge-success badge-dot">Completado</span>' : '<span class="badge badge-primary badge-dot">En curso</span>'}</div>
        <div class="text-xs text-tertiary mt-2">Capacitador: Lucía Torres</div>
      </div>
    </div>
  `;

  // Layout con timeline + contenido
  html += `<div class="onboarding-layout animate-fade-in">`;

  // Timeline lateral
  html += `
    <div class="onboarding-timeline">
      <div class="timeline-track"><div class="timeline-progress" style="height:${progress}%"></div></div>
      <div class="timeline-items">
  `;

  days.forEach((d, i) => {
    const isLocked = i > 0 && !days[i - 1].completed;
    const isCurrent = d.day === currentDay && !d.completed;
    const dotClass = d.completed ? 'completed' : isCurrent ? 'current' : 'locked';

    html += `
        <div class="timeline-item ${isCurrent ? 'active' : ''}" data-day="${d.day}" onclick="selectOnboardingDay(${d.day})">
          <div class="timeline-dot ${dotClass}">
            ${d.completed ? icon('check', 16) : isLocked ? icon('lock', 14) : d.day}
          </div>
          <div class="timeline-content">
            <div class="timeline-day">Día ${d.day}</div>
            <div class="timeline-day-status">${d.completed ? 'Completado ✓' : isCurrent ? 'En curso' : 'Bloqueado'}</div>
          </div>
        </div>
    `;
  });

  html += '</div></div>';

  // Contenido del día seleccionado
  html += `<div id="onboarding-day-content"></div>`;
  html += '</div>'; // close layout

  container.innerHTML = html;

  // Renderizar el día actual
  selectOnboardingDay(currentDay);
}

function selectOnboardingDay(dayNum) {
  const days = Store.onboardingDays;
  const day = days.find(d => d.day === dayNum);
  const prevDay = days.find(d => d.day === dayNum - 1);
  const isLocked = dayNum > 1 && prevDay && !prevDay.completed;
  const contentEl = document.getElementById('onboarding-day-content');
  if (!contentEl) return;

  // Highlight active
  document.querySelectorAll('.timeline-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.day) === dayNum);
  });

  if (isLocked) {
    contentEl.innerHTML = `
      <div class="day-content">
        <div class="locked-overlay">
          <div class="locked-icon">${icon('lock', 32)}</div>
          <div class="locked-text">Día ${dayNum} bloqueado</div>
          <div class="locked-hint">Completá el contenido y las evaluaciones del Día ${dayNum - 1} para desbloquear este día.</div>
        </div>
      </div>
    `;
    return;
  }

  if (!day) return;

  let html = `
    <div class="day-content animate-fade-in-up">
      <div class="day-header">
        <div class="day-number">
          <div class="day-number-badge">${day.day}</div>
          <div>
            <h3 class="day-title">${day.title}</h3>
            <p class="day-subtitle">${day.contents.length} actividades · ${day.completed ? 'Completado' : 'En curso'}</p>
          </div>
        </div>
        ${day.completed ? '<span class="badge badge-success badge-dot">Completado</span>' : '<span class="badge badge-primary badge-dot">Activo</span>'}
      </div>
      <div class="day-body">
        <h4 class="text-md font-semibold mb-4">Contenidos del día</h4>
        <div class="content-checklist">
  `;

  day.contents.forEach(c => {
    const typeInfo = EIF_CONFIG.CONTENT_TYPES[c.type];
    html += `
          <div class="content-item ${c.completed ? 'completed' : ''}" onclick="toggleContentItem(this, '${c.id}')">
            <div class="content-item-icon ${c.type.toLowerCase()}">${typeInfo?.icon || '📄'}</div>
            <div class="content-item-info">
              <div class="content-item-title">${c.title}</div>
              <div class="content-item-meta">${typeInfo?.label || c.type} · ${c.duration}</div>
            </div>
            <div class="content-item-check">${c.completed ? icon('check', 14) : ''}</div>
          </div>
    `;
  });

  html += '</div>';

  // Formularios de evaluación cruzada
  const allContentDone = day.contents.every(c => c.completed);

  html += `
        <h4 class="text-md font-semibold mt-8 mb-4">Evaluación Cruzada</h4>
        <div class="eval-forms-grid">
          <div class="eval-form-card ${!allContentDone ? 'locked' : ''} ${day.participantQuiz ? 'completed' : ''}">
            <div class="eval-form-icon" style="background:rgba(59,130,246,0.12)">📝</div>
            <h5 class="eval-form-title">Cuestionario del Participante</h5>
            <p class="eval-form-desc">Evaluación de comprensión del contenido del día.</p>
            ${day.participantQuiz
              ? '<span class="badge badge-success badge-dot">Completado</span>'
              : `<button class="btn ${allContentDone ? 'btn-primary' : 'btn-outline disabled'} w-full" ${allContentDone ? 'onclick="startDayQuiz(' + day.day + ')"' : ''}>
                  ${allContentDone ? 'Comenzar' : icon('lock', 14) + ' Completar contenidos'}
                </button>`
            }
          </div>
          <div class="eval-form-card ${!allContentDone ? 'locked' : ''} ${day.trainerFeedback ? 'completed' : ''}">
            <div class="eval-form-icon" style="background:rgba(139,92,246,0.12)">👤</div>
            <h5 class="eval-form-title">Feedback del Capacitador</h5>
            <p class="eval-form-desc">Observación del desempeño durante la jornada.</p>
            ${day.trainerFeedback
              ? '<span class="badge badge-success badge-dot">Completado</span>'
              : `<button class="btn ${allContentDone ? 'btn-accent' : 'btn-outline disabled'} w-full" ${allContentDone ? 'onclick="startTrainerFeedback(' + day.day + ')"' : ''}>
                  ${allContentDone ? 'Completar Feedback' : icon('lock', 14) + ' Completar contenidos'}
                </button>`
            }
          </div>
        </div>
  `;

  // Evaluación final del último día
  if (day.isFinalEvaluation) {
    html += `
        <div class="card-glow mt-6 p-6">
          <div class="flex items-center gap-3 mb-3">
            <span style="font-size:28px">🏆</span>
            <div>
              <h4 class="text-lg font-bold">Evaluación Final de Inducción</h4>
              <p class="text-sm text-tertiary">Evaluación integral de todos los contenidos del proceso de onboarding</p>
            </div>
          </div>
          <button class="btn btn-primary btn-lg mt-4 ${!allContentDone ? 'disabled' : ''}" ${allContentDone ? 'onclick="startFinalEval()"' : ''}>
            ${allContentDone ? 'Iniciar Evaluación Final' : icon('lock', 16) + ' Completar todos los días primero'}
          </button>
        </div>
    `;
  }

  html += '</div></div>'; // close day-body + day-content

  contentEl.innerHTML = html;
}

function toggleContentItem(el, contentId) {
  el.classList.toggle('completed');
  const checkEl = el.querySelector('.content-item-check');
  if (el.classList.contains('completed')) {
    checkEl.innerHTML = icon('check', 14);
    Toast.show('Contenido completado', '', 'success');
  } else {
    checkEl.innerHTML = '';
  }
}

function startDayQuiz(day) {
  Toast.show('Cuestionario del Día ' + day, 'Abriendo cuestionario...', 'info');
  // Simular completado
  setTimeout(() => {
    Store.onboardingDays[day - 1].participantQuiz = true;
    checkDayCompletion(day);
    selectOnboardingDay(day);
    Toast.show('¡Cuestionario aprobado!', 'Nota: 8.5/10', 'success');
  }, 1500);
}

function startTrainerFeedback(day) {
  Toast.show('Feedback del Día ' + day, 'Abriendo formulario...', 'info');
  setTimeout(() => {
    Store.onboardingDays[day - 1].trainerFeedback = true;
    checkDayCompletion(day);
    selectOnboardingDay(day);
    Toast.show('Feedback registrado', '', 'success');
  }, 1500);
}

function checkDayCompletion(day) {
  const d = Store.onboardingDays[day - 1];
  if (d.participantQuiz && d.trainerFeedback) {
    d.completed = true;
    d.contents.forEach(c => c.completed = true);
    renderOnboarding(document.getElementById('app-content'));
    Toast.show('🎉 ¡Día ' + day + ' completado!', 'El Día ' + (day + 1) + ' ya está disponible.', 'success');
  }
}

function startFinalEval() {
  Toast.show('Evaluación Final', 'Navegando al motor de evaluaciones...', 'info');
  setTimeout(() => Router.navigate('evaluations'), 1000);
}
