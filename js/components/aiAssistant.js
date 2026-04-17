/* ================================================================
   EIF Platform — Asistente IA (Google Gemini)
   ================================================================ */

const AIAssistant = {
  isOpen: false,
  chatHistory: [],

  init() {
    this.render();
    this.addStyles();
  },

  render() {
    const container = document.createElement('div');
    container.id = 'ai-assistant-container';
    container.innerHTML = `
      <button class="ai-fab" id="ai-fab" onclick="AIAssistant.toggle()">
        <span class="ai-fab-icon">✨</span>
        <span class="ai-fab-text">Asistente IA</span>
      </button>

      <div class="ai-window" id="ai-window">
        <div class="ai-window-header">
          <div class="flex items-center gap-2">
            <span class="ai-window-icon">✨</span>
            <div>
              <div class="text-sm font-bold">Asistente EIF</div>
              <div class="text-xs text-tertiary" style="color:var(--color-success-400)">● En línea (Gemini 1.5)</div>
            </div>
          </div>
          <button class="ai-window-close" onclick="AIAssistant.toggle()">✕</button>
        </div>
        
        <div class="ai-chat-body" id="ai-chat-body">
          <div class="ai-message ai-message-bot">
            ¡Hola! Soy tu asistente de IA. Puedo ayudarte con dudas sobre los módulos, evaluaciones o el funcionamiento de la plataforma. ¿En qué puedo ayudarte hoy?
          </div>
        </div>

        <div class="ai-chat-footer">
          <input type="text" id="ai-chat-input" placeholder="Pregúntame algo..." onkeypress="if(event.key==='Enter') AIAssistant.sendMessage()">
          <button class="ai-send-btn" onclick="AIAssistant.sendMessage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  },

  toggle() {
    this.isOpen = !this.isOpen;
    const windowEl = document.getElementById('ai-window');
    const fabEl = document.getElementById('ai-fab');
    if (this.isOpen) {
      windowEl.classList.add('active');
      fabEl.classList.add('hidden');
      setTimeout(() => document.getElementById('ai-chat-input').focus(), 300);
    } else {
      windowEl.classList.remove('active');
      fabEl.classList.remove('hidden');
    }
  },

  async sendMessage() {
    const input = document.getElementById('ai-chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.appendMessage('user', text);
    
    // Mostrar indicador de escritura
    const typingId = 'typing-' + Date.now();
    this.appendMessage('bot', '...', typingId);

    try {
      const apiKey = EIF_CONFIG.GEMINI_API_KEY;
      if (!apiKey || apiKey.length < 10) {
        throw new Error("API Key de IA no configurada correctamente.");
      }

      const prompt = `Eres el Asistente EIF (Ecosistema Integrado de Formación). 
      Tu objetivo es ayudar a los usuarios de la plataforma de capacitación de Megatlon.
      Responde de forma amable, profesional y concisa. 
      Contexto de la plataforma: Tiene secciones de Dashboard, E-Learning, Evaluaciones, Mystery Shopper y Legajo Digital.
      Usuario: ${text}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.parentElement.remove();

      if (data.candidates && data.candidates[0].content.parts[0].text) {
        let responseText = data.candidates[0].content.parts[0].text;
        this.appendMessage('bot', responseText);
      } else {
        throw new Error("No recibí una respuesta clara.");
      }
    } catch (err) {
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.parentElement.remove();
      this.appendMessage('bot', 'Lo siento, tuve un problema conectando con mi cerebro virtual. Revisa la configuración de API Key. Error: ' + err.message);
    }
  },

  appendMessage(role, text, id = null) {
    const body = document.getElementById('ai-chat-body');
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ai-message-${role}`;
    if (id) msgDiv.innerHTML = `<span id="${id}">${text}</span>`;
    else msgDiv.textContent = text;
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
  },

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ai-fab {
        position: fixed;
        bottom: calc(var(--mobile-nav-height, 0px) + 24px);
        right: 24px;
        background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-violet-500) 100%);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-weight: 600;
      }
      .ai-fab:hover {
        transform: translateY(-4px) scale(1.05);
        box-shadow: 0 12px 40px rgba(99, 102, 241, 0.5);
      }
      .ai-fab.hidden {
        opacity: 0;
        transform: scale(0);
        pointer-events: none;
      }
      .ai-fab-icon { font-size: 20px; }

      .ai-window {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 360px;
        height: 500px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        z-index: 1001;
        transform: translateY(20px) scale(0.95);
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        overflow: hidden;
      }
      .ai-window.active {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: auto;
      }

      .ai-window-header {
        padding: 16px;
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-subtle);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .ai-window-icon { font-size: 24px; }
      .ai-window-close {
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        font-size: 18px;
      }

      .ai-chat-body {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm63 31c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM34 90c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM27 13c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-7 45c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm34 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM24 80c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm70-13c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236366f1' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
      }

      .ai-message {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.5;
        position: relative;
      }
      .ai-message-bot {
        align-self: flex-start;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        border-bottom-left-radius: 2px;
      }
      .ai-message-user {
        align-self: flex-end;
        background: var(--color-primary-500);
        color: white;
        border-bottom-right-radius: 2px;
      }

      .ai-chat-footer {
        padding: 16px;
        display: flex;
        gap: 8px;
        border-top: 1px solid var(--border-subtle);
      }
      #ai-chat-input {
        flex: 1;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 8px 12px;
        color: var(--text-primary);
        font-size: 14px;
      }
      .ai-send-btn {
        background: var(--color-primary-500);
        color: white;
        border: none;
        border-radius: 10px;
        width: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .ai-send-btn svg { width: 18px; height: 18px; }

      @media (max-width: 768px) {
        .ai-window { width: calc(100% - 32px); height: calc(100% - 100px); right: 16px; bottom: 84px; }
      }
    `;
    document.head.appendChild(style);
  }
};

// Auto-init
AIAssistant.init();
