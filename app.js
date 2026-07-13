// PROTOTIPO SIPJU - LÓGICA DE APLICACIÓN

// ==========================================
// BASE DE DATOS SIMULADA (MOCK DATA)
// ==========================================

const MOCK_PEOPLE = {
  "35842901": {
    nombre: "MARTINEZ, Lucas Sebastián",
    dni: "35.842.901",
    edad: "29 años",
    direccion: "Gascón 1254, 4º 'A', CABA",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "2 Procesos Penales Abiertos",
    alertas: ["Restricción Perimetral Activa (Causa 142/25)"]
  },
  "32114897": {
    nombre: "ROCHA, Sergio Damián",
    dni: "32.114.897",
    edad: "34 años",
    direccion: "Malabia 2340, 3º 'B', Palermo",
    foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=60",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "1 Proceso Penal Abierto (CP 89 - Lesiones)",
    alertas: ["Sujeto bajo Reglas de Conducta (Probation)", "Exclusión de Hogar Vigente"]
  },
  "10443219": {
    nombre: "BERMÚDEZ, Juan Manuel",
    dni: "10.443.219",
    edad: "78 años",
    direccion: "Guatemala 4210, 2º 'A', Palermo",
    foto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=60",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "Sin Antecedentes",
    alertas: ["Movilidad Reducida Declarada"]
  },
  "24883104": {
    nombre: "RÍOS, Elena Victoria",
    dni: "24.883.104",
    edad: "45 años",
    direccion: "Uriarte 1428, Palermo Soho",
    foto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "Sin Antecedentes",
    alertas: ["Víctima Protegida - Botón Antipánico Activo"]
  }
};

const MOCK_OFICIOS = [
  {
    id: "OF-2026-9081",
    origen: "Juzgado Penal contravencional y de faltas Nº 12",
    juez: "Dra. Acosta, M.",
    causa: "Nº 4782/25 s/ CP 89",
    tipo: "Constatación de Domicilio",
    sujeto: "ROCHA, Sergio Damián (DNI 32.114.897)",
    direccion: "Malabia 2340, 3º 'B', Palermo",
    distancia: "350 metros",
    prioridad: "ALTA",
    plazo: "48 horas",
    comisaria: "Comisaría Vecinal 14-A",
    estado: "Pendiente"
  },
  {
    id: "OF-2026-8812",
    origen: "Fiscalía Contravencional Nº 6",
    juez: "Dr. Méndez, Carlos",
    causa: "Nº 1029/26 s/ Ley 1.472 Art. 79 (Trapito)",
    tipo: "Constatación de Residencia",
    sujeto: "MARTINEZ, Lucas Sebastián (DNI 35.842.901)",
    direccion: "Gascón 1254, 4º 'A', Almagro",
    distancia: "1.2 km",
    prioridad: "MEDIA",
    plazo: "5 días",
    comisaria: "Comisaría Vecinal 14-A",
    estado: "Pendiente"
  }
];

// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================

let state = {
  tab: 'home', // home, ia, tareas, fe_vida, mapa
  activeTask: null, // null o tarea seleccionada
  taskStep: 0, // paso del flujo de tarea
  currentGPS: { lat: -34.5855, lng: -58.4278 }, // Plaza Armenia
  chatMessages: [
    { sender: 'assistant', text: "👮 Hola Oficial. Soy el Asistente IA de SIPJU. ¿En qué puedo ayudarte hoy?\n\nPodés preguntarme dónde estás si no ubicás la calle, hacer consultas sobre protocolos legales de requisa, o iniciar una actuación." }
  ],
  dniScannedData: null,
  isRecordingAudio: false,
  audioTranscript: "",
  isSignatureSigned: false,
  witnessDni: "",
  witnessName: "",
  witnessOtpSent: false,
  witnessOtpVerified: false,
  alertActive: false,
  alertData: null,
  comisariaOficios: [...MOCK_OFICIOS]
};

// ==========================================
// INICIALIZACIÓN Y ENRUTAMIENTO
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  renderApp();
  simulateAggressorMovement();
});

function setupNavigation() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.tab = tab.dataset.tab;
      state.activeTask = null;
      state.taskStep = 0;
      resetTaskState();
      renderApp();
    });
  });
}

function resetTaskState() {
  state.dniScannedData = null;
  state.isRecordingAudio = false;
  state.audioTranscript = "";
  state.isSignatureSigned = false;
  state.witnessDni = "";
  state.witnessName = "";
  state.witnessOtpSent = false;
  state.witnessOtpVerified = false;
}

// ==========================================
// RENDERIZADO PRINCIPAL
// ==========================================

function renderApp() {
  const contentEl = document.getElementById("app-content");
  
  if (state.alertActive && state.alertData) {
    renderEmergencyAlert();
    return;
  }
  
  if (state.activeTask) {
    renderActiveTaskFlow(contentEl);
    return;
  }
  
  switch (state.tab) {
    case 'home':
      renderHome(contentEl);
      break;
    case 'ia':
      renderIA(contentEl);
      break;
    case 'tareas':
      renderTareas(contentEl);
      break;
    case 'fe_vida':
      renderFeVida(contentEl);
      break;
    case 'mapa':
      renderMapaView(contentEl);
      break;
  }
}

// ==========================================
// RENDER MÓDULO: HOME
// ==========================================

function renderHome(container) {
  const pendingCount = state.comisariaOficios.filter(o => o.estado === 'Pendiente').length;
  
  container.innerHTML = `
    <!-- Turno Status -->
    <div class="status-strip">
      <div class="status-indicator">
        <span class="pulse-dot"></span>
        <span>EN SERVICIO</span>
      </div>
      <div>Turno: 14:00 - 22:00</div>
    </div>
    
    <!-- KPI Strip -->
    <div class="card" style="padding: 12px 6px; margin-bottom: 14px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center;">
        <div style="border-right: 1px solid var(--border-light);">
          <div style="font-size: 18px; font-weight: 800; color: var(--pc-navy);">${pendingCount}</div>
          <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Constataciones</div>
        </div>
        <div style="border-right: 1px solid var(--border-light);">
          <div style="font-size: 18px; font-weight: 800; color: var(--pc-navy);">2</div>
          <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Controles Habilit.</div>
        </div>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: var(--pc-navy);">1</div>
          <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Fe de Vida Asist.</div>
        </div>
      </div>
    </div>

    <!-- Active Alertas Card -->
    <div class="card clickable" style="border-left: 4px solid var(--amber); background: var(--amber-bg);" onclick="switchTab('mapa')">
      <div class="card-title-row">
        <span class="chip chip-amber" style="background:#fff;">Alerta Geocerca</span>
        <span style="font-size: 11px; color: var(--text-muted);">Hace 2 min</span>
      </div>
      <div class="card-title" style="font-size:14px;">Restricción Causa 78/26 (Rocha, S.)</div>
      <div class="card-subtitle">Exclusión perimetral 500m activa en Uriarte 1428. Dispositivo reporta agresor a 1.1 km.</div>
    </div>
    
    <!-- Quick Access Grid -->
    <div style="margin: 18px 0 8px;"><h3 style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Accesos Rápidos</h3></div>
    <div class="quick-grid">
      <div class="quick-tile tile-navy" onclick="switchTab('ia')">
        <div class="tile-icon-wrap">🤖</div>
        <div class="tile-label">Asistente IA</div>
        <div class="tile-sub">Consultas y calles</div>
      </div>
      <div class="quick-tile tile-green" onclick="switchTab('tareas')">
        <div class="tile-icon-wrap">📋</div>
        <div class="tile-label">Constataciones</div>
        <div class="tile-sub">${pendingCount} pedidos activos</div>
        ${pendingCount > 0 ? `<span class="tile-badge">${pendingCount}</span>` : ''}
      </div>
      <div class="quick-tile tile-purple" onclick="switchTab('fe_vida')">
        <div class="tile-icon-wrap">👴</div>
        <div class="tile-label">Fe de Vida</div>
        <div class="tile-sub">Tercera edad</div>
      </div>
      <div class="quick-tile tile-red" onclick="triggerMockEmergency()">
        <div class="tile-icon-wrap">🚨</div>
        <div class="tile-label">Simular Pánico</div>
        <div class="tile-sub">Test de BAP</div>
      </div>
    </div>
    
    <!-- Jurisdicción Informativa -->
    <div class="card" style="margin-top: 14px; background: linear-gradient(135deg, var(--pc-navy) 0%, var(--pc-navy-deep) 100%); color: #fff;">
      <div style="font-size:10px; font-weight:700; text-transform:uppercase; color: var(--pc-gold);">Tu Jurisdicción Actual</div>
      <div style="font-size:16px; font-weight:800; margin-top:4px;">Comisaría Vecinal 14-A</div>
      <div style="font-size:12px; opacity:0.9; margin-top:2px;">Comuna 14 · Palermo Soho / Sur</div>
      <div style="font-size:11px; opacity:0.75; margin-top:8px; display:flex; justify-content:space-between;">
        <span>GPS: -34.5855, -58.4278</span>
        <span>Precisión: ±4 metros</span>
      </div>
    </div>
  `;
}

// ==========================================
// RENDER MÓDULO: ASISTENTE IA (INICIO ACTUACIÓN)
// ==========================================

function renderIA(container) {
  container.innerHTML = `
    <div class="chat-container">
      <div class="chat-history" id="chat-history">
        ${state.chatMessages.map(msg => `
          <div class="chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-assistant'}">
            ${msg.text.replace(/\n/g, '<br>')}
          </div>
        `).join('')}
      </div>
      
      <!-- Sugerencias rápidas -->
      <div class="suggested-tags">
        <span class="suggest-tag" onclick="sendSuggest('No sé dónde estoy, veo Plaza Armenia')">📍 ¿Dónde estoy? (Plaza Armenia)</span>
        <span class="suggest-tag" onclick="sendSuggest('¿Cuándo se puede requisar sin orden?')">⚖ ¿Cuándo requisar sin orden?</span>
        <span class="suggest-tag" onclick="sendSuggest('Iniciar acta por flagrancia')">🚨 Iniciar actuación</span>
      </div>
      
      <!-- Fila de ingreso de texto -->
      <div class="chat-input-row">
        <button class="chat-btn-mic" onclick="toggleChatMic()">🎤</button>
        <input type="text" class="chat-input" id="chat-input-field" placeholder="Preguntá al Asistente SIPJU..." onkeypress="handleChatKey(event)">
        <button class="chat-btn-send" onclick="sendChatMessage()">➔</button>
      </div>
    </div>
  `;
  
  // Scroll automatico al fondo del chat
  setTimeout(() => {
    const history = document.getElementById("chat-history");
    if (history) history.scrollTop = history.scrollHeight;
  }, 50);
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendSuggest(text) {
  const input = document.getElementById("chat-input-field");
  if (input) {
    input.value = text;
    sendChatMessage();
  }
}

function toggleChatMic() {
  const input = document.getElementById("chat-input-field");
  if (input) {
    input.value = "Dictando: Estoy persiguiendo sospechoso por calle Costa Rica...";
    input.focus();
  }
}

function sendChatMessage() {
  const input = document.getElementById("chat-input-field");
  if (!input || !input.value.trim()) return;
  
  const text = input.value.trim();
  state.chatMessages.push({ sender: 'user', text: text });
  input.value = "";
  
  renderApp(); // Render user message immediately
  
  // Respuestas automáticas simuladas del asistente IA
  let response = "No comprendo tu consulta en esta versión de pruebas. Probá tocando uno de los accesos rápidos sugeridos.";
  
  const textLower = text.toLowerCase();
  if (textLower.includes("plaza armenia") || textLower.includes("dónde estoy") || textLower.includes("donde estoy")) {
    response = "📍 **Ubicación Detectada (Asistente IA):**\nTe encontrás junto a la **Plaza Armenia** en **Costa Rica 4500 (entre Malabia y Armenia)**, Comuna 14, Palermo Soho.\n\n• **Jurisdicción:** Comisaría Vecinal 14-A.\n• **Fiscalía de Guardia:** Unidad de Flagrancia Norte (Cabanillas 331).\n• **Jefe de Zona:** Comisario Inspector González.\n\n¿Querés que inicialice un **Acta de Intervención** georreferenciada en este lugar?";
  } else if (textLower.includes("requisar") || textLower.includes("requisa") || textLower.includes("sin orden")) {
    response = "⚖ **Protocolo de Requisa sin Orden (CPP CABA Art. 85):**\n\nSolo podés requisar personas sin orden judicial si hay:\n1. **Indicios objetivos** de que la persona oculta cosas delictivas o armas en su cuerpo o vestimenta.\n2. **Urgencia extrema** que impida pedir orden.\n\n**REGLAS CRÍTICAS DE PROCEDIMIENTO:**\n• Debés advertirle primero que entregue la cosa voluntariamente.\n• La requisa debe hacerse por persona del mismo sexo.\n• Debés contar con **un testigo ajeno a la fuerza** (obligatorio) o fundar en acta por qué no se pudo conseguir.\n• **¡Todo debe ser grabado por tu Body Cam!**";
  } else if (textLower.includes("actuación") || textLower.includes("iniciar")) {
    response = "🚨 **Asistente de Actuación SIPJU:**\nHe iniciado un borrador de legajo electrónico.\n\n• **Hora:** " + new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'}) + " hs\n• **Lugar:** Costa Rica 4500, Palermo\n• **Causa Inicial:** Intervención de Prevención\n\nPor favor, dirígete al módulo de **Tareas** para ver la orden o pulsa **Escanear DNI** para identificar al primer involucrado.";
  }
  
  setTimeout(() => {
    state.chatMessages.push({ sender: 'assistant', text: response });
    renderApp();
  }, 1000);
}

// ==========================================
// RENDER MÓDULO: TAREAS (CONSTATACIONES / CONTROLES)
// ==========================================

function renderTareas(container) {
  const pendingOficios = state.comisariaOficios.filter(o => o.estado === 'Pendiente');
  const completedOficios = state.comisariaOficios.filter(o => o.estado === 'Completada');
  
  container.innerHTML = `
    <div class="flow-header">
      <div class="flow-title">Pedidos de Constatación</div>
      <div class="flow-sub">Oficios judiciales y fiscales asignados a tu móvil por cercanía</div>
    </div>
    
    <div class="alert-box info">
      <div class="at">Despacho por Proximidad</div>
      La comisaría cargó estos pedidos recibidos por sistema EJE/Mail. Tu móvil está en zona y los recibe por GPS.
    </div>
    
    <div style="margin: 14px 0 6px;"><h3 style="font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Asignados Pendientes (${pendingOficios.length})</h3></div>
    
    ${pendingOficios.length === 0 ? `
      <div class="card" style="text-align:center; padding: 20px; color: var(--text-muted);">
        No tenés constataciones pendientes.
      </div>
    ` : pendingOficios.map(oficio => `
      <div class="card clickable" onclick="startTask('${oficio.id}')">
        <div class="task-item">
          <div class="task-icon-circle" style="background:var(--red-bg); color:var(--red);">⚖</div>
          <div class="task-details">
            <div class="task-title">${oficio.tipo}</div>
            <div class="task-desc">${oficio.sujeto}</div>
            <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Origen: ${oficio.origen}</div>
          </div>
          <div class="task-meta">
            <div class="task-dist">${oficio.distancia}</div>
            <span class="chip chip-red" style="font-size:8px;">${oficio.prioridad}</span>
          </div>
        </div>
      </div>
    `).join('')}

    <div style="margin: 18px 0 6px;"><h3 style="font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Controles de Probation Activos (1)</h3></div>
    
    <div class="card clickable" onclick="startProbationControl()">
      <div class="task-item">
        <div class="task-icon-circle" style="background:var(--purple-bg); color:var(--purple);">👤</div>
        <div class="task-details">
          <div class="task-title">Control Domiciliario (Reglas de Conducta)</div>
          <div class="task-desc">ROCHA, Sergio Damián (Causa 4782/25)</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Fijar residencia · Control mensual</div>
        </div>
        <div class="task-meta">
          <div class="task-dist">350 metros</div>
          <span class="chip chip-purple" style="font-size:8px;">Rutinario</span>
        </div>
      </div>
    </div>

    ${completedOficios.length > 0 ? `
      <div style="margin: 18px 0 6px;"><h3 style="font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Completados Hoy (${completedOficios.length})</h3></div>
      ${completedOficios.map(oficio => `
        <div class="card" style="opacity: 0.7;">
          <div class="task-item">
            <div class="task-icon-circle" style="background:var(--green-bg); color:var(--green);">✓</div>
            <div class="task-details">
              <div class="task-title" style="text-decoration:line-through;">${oficio.tipo}</div>
              <div class="task-desc">${oficio.sujeto}</div>
            </div>
            <div class="task-meta">
              <span class="chip chip-green" style="font-size:8px;">CERRADO</span>
            </div>
          </div>
        </div>
      `).join('')}
    ` : ''}
  `;
}

function startTask(id) {
  state.activeTask = state.comisariaOficios.find(o => o.id === id);
  state.taskStep = 0;
  resetTaskState();
  renderApp();
}

function startProbationControl() {
  state.activeTask = {
    id: "PROB-001",
    tipo: "Control Domiciliario Probation",
    sujeto: "ROCHA, Sergio Damián (DNI 32.114.897)",
    direccion: "Malabia 2340, 3º 'B', Palermo",
    origen: "JPCyF Nº 12 · Dra. Acosta",
    distancia: "350 metros",
    prioridad: "MEDIA",
    comisaria: "Comisaría Vecinal 14-A",
    estado: "Pendiente"
  };
  state.taskStep = 0;
  resetTaskState();
  renderApp();
}

// ==========================================
// RENDER MÓDULO: FE DE VIDA (SUPERVIVENCIA)
// ==========================================

function renderFeVida(container) {
  container.innerHTML = `
    <div class="flow-header">
      <div class="flow-title">Fe de Vida Asistida</div>
      <div class="flow-sub">Trámite de supervivencia para tercera edad y discapacitados en domicilio</div>
    </div>
    
    <div class="alert-box gold">
      <div class="at">Trámite Comunitario Asistido</div>
      Vecinos con movilidad reducida solicitan este trámite por la app miBA. El policía de calle se acerca al domicilio, valida identidad con datos biométricos y firma en pantalla.
    </div>
    
    <div style="margin: 14px 0 6px;"><h3 style="font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Asignados Pendientes (1)</h3></div>
    
    <div class="card clickable" onclick="startFeVidaTask()">
      <div class="task-item">
        <div class="task-icon-circle" style="background:var(--amber-bg); color:var(--amber);">👴</div>
        <div class="task-details">
          <div class="task-title">Fe de Vida / Supervivencia</div>
          <div class="task-desc">BERMÚDEZ, Juan Manuel (78 años)</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Guatemala 4210, 2º 'A' · Palermo Soho</div>
        </div>
        <div class="task-meta">
          <div class="task-dist">600 metros</div>
          <span class="chip chip-amber" style="font-size:8px;">Prioritario</span>
        </div>
      </div>
    </div>
  `;
}

function startFeVidaTask() {
  state.activeTask = {
    id: "FE-VIDA-001",
    tipo: "Fe de Vida / Supervivencia",
    sujeto: "BERMÚDEZ, Juan Manuel (DNI 10.443.219)",
    direccion: "Guatemala 4210, 2º 'A', Palermo Soho",
    origen: "Trámite ANSES / miBA",
    distancia: "600 metros",
    prioridad: "MEDIA",
    comisaria: "Comisaría Vecinal 14-A",
    estado: "Pendiente"
  };
  state.taskStep = 0;
  resetTaskState();
  renderApp();
}

// ==========================================
// RENDER MÓDULO: MAPA GENERAL PALERMO
// ==========================================

function renderMapaView(container) {
  container.innerHTML = `
    <div class="flow-header">
      <div class="flow-title">Mapa de Geocercas de Prevención</div>
      <div class="flow-sub">Comuna 14 · Visualización en tiempo real de perímetros de exclusión y alarmas</div>
    </div>
    
    <div class="map-view">
      <!-- Pin del oficial en Plaza Armenia -->
      <div class="map-pin-oficial" style="top: 40%; left: 38%;"></div>
      
      <!-- Pin de la víctima Ríos Elena en Uriarte 1428 -->
      <div class="map-pin-target" style="top: 35%; left: 30%; color:var(--red);" onclick="alert('Víctima protegida: Ríos Elena (Uriarte 1428)')">📍</div>
      
      <!-- Círculo de la geocerca de exclusión (500m) en torno a Ríos Elena -->
      <div class="map-perimeter" style="top: 35%; left: 30%; width: 220px; height: 220px;"></div>
      
      <!-- Pin del agresor Sergio Rocha -->
      <div class="map-pin-target" style="top: 55%; left: 75%; color:var(--amber);" id="agresor-pin">🏃</div>
      
      <svg class="map-svg" viewBox="0 0 400 300">
        <!-- Calles principales de Palermo -->
        <line x1="0" y1="50" x2="400" y2="50" stroke="#CBD5E1" stroke-width="6" />
        <line x1="0" y1="120" x2="400" y2="120" stroke="#CBD5E1" stroke-width="8" />
        <text x="10" y="115" fill="#94A3B8" font-size="9" font-weight="bold">Av. Scalabrini Ortiz</text>
        <line x1="0" y1="210" x2="400" y2="210" stroke="#CBD5E1" stroke-width="6" />
        
        <line x1="120" y1="0" x2="120" y2="300" stroke="#CBD5E1" stroke-width="6" />
        <text x="125" y="280" fill="#94A3B8" font-size="9" font-weight="bold" transform="rotate(-90,125,280)">Calle Costa Rica</text>
        <line x1="220" y1="0" x2="220" y2="300" stroke="#CBD5E1" stroke-width="6" />
        
        <!-- Plaza Armenia -->
        <rect x="135" y="135" width="70" height="60" rx="8" fill="#A7F3D0" stroke="#6EE7B7" stroke-width="2" />
        <text x="142" y="165" fill="#047857" font-size="8" font-weight="bold">P. Armenia</text>
      </svg>
    </div>
    
    <div class="card">
      <div class="card-title">Leyenda del mapa</div>
      <div style="display:flex; flex-direction:column; gap:6px; font-size:12.5px; margin-top:8px;">
        <div style="display:flex; align-items:center; gap:8px;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:var(--pc-blue-bright);"></span><b>Tú (Oficial de Prevención)</b> · Patrullando</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="font-size:12px;">📍</span><b>RÍOS, Elena (Víctima)</b> · Uriarte 1428</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="display:inline-block; width:20px; height:20px; border-radius:50%; background:rgba(239, 68, 68, 0.15); border:1px dashed var(--red);"></span><b>Perímetro Exclusión Judicial</b> · Radio 500m</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="font-size:12px;">🏃</span><b>ROCHA, Sergio (Agresor)</b> · Monitoreo GPS Tobillera</div>
      </div>
    </div>
    
    <button class="btn-large danger" onclick="triggerMockEmergency()">Simular Infracción Perímetro (BAP) 🚨</button>
  `;
}

// ==========================================
// FLUJOS OPERATIVOS PASO A PASO (OFICIAL)
// ==========================================

function renderActiveTaskFlow(container) {
  const t = state.activeTask;
  
  if (t.id.startsWith("OF-")) {
    renderConstatacionFlow(container, t);
  } else if (t.id.startsWith("PROB-")) {
    renderProbationFlow(container, t);
  } else if (t.id.startsWith("FE-VIDA-")) {
    renderFeVidaFlow(container, t);
  }
}

// ---- FLUJO 1: CONSTATACIÓN DE DOMICILIO (OFICIO JUDICIAL/FISCAL) ----
function renderConstatacionFlow(container, task) {
  const step = state.taskStep;
  const steps = ["Arribo", "DNI Inquilino", "Acta por Voz", "Foto Fachada", "Firma Testigo"];
  const progressBars = steps.map((s, i) => `<div class="progress-step ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('');
  
  let headerHtml = `
    <div class="back-btn-row">
      <button class="btn-back" onclick="cancelActiveTask()">← Salir de tarea</button>
    </div>
    <div class="flow-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="chip chip-red">${task.tipo}</span>
        <span style="font-size:11px; font-weight:700; color:var(--text-muted);">${step + 1} de ${steps.length}</span>
      </div>
      <div class="flow-title" style="margin-top:6px;">${task.sujeto}</div>
      <div class="flow-sub">Destino: ${task.direccion}</div>
    </div>
    <div class="progress-bar">${progressBars}</div>
  `;
  
  let bodyHtml = "";
  
  if (step === 0) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">1. Verificación de Arribo al Domicilio</div>
        <div class="card-subtitle" style="margin-bottom:12px;">El sistema requiere confirmar presencia en zona por GPS antes de abrir el formulario.</div>
        <div class="info-row"><span class="k">Destino Requerido</span><span class="v">${task.direccion}</span></div>
        <div class="info-row"><span class="k">Tu Posición GPS</span><span class="v">Frente al domicilio (Precisión 2m)</span></div>
        <div class="info-row"><span class="k">Cámara Corporal</span><span class="v green">GRABANDO</span></div>
      </div>
      
      <div class="map-view" style="height:120px; margin-bottom:14px;">
        <div class="map-pin-oficial" style="top: 50%; left: 50%;"></div>
        <svg class="map-svg" viewBox="0 0 400 300">
          <line x1="0" y1="150" x2="400" y2="150" stroke="#94A3B8" stroke-width="8" />
          <line x1="200" y1="0" x2="200" y2="300" stroke="#CBD5E1" stroke-width="6" />
        </svg>
      </div>
      
      <div class="card clickable" style="border-left:4px solid var(--pc-navy);" onclick="showOficioDetail('${task.id}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:12.5px; font-weight:700; color:var(--pc-navy);">Ver PDF Oficio Judicial</div>
            <div style="font-size:11px; color:var(--text-muted);">${task.id} · Carga por Comisaría</div>
          </div>
          <span style="font-size:18px;">📄</span>
        </div>
      </div>
      
      <button class="btn-large success" onclick="nextStep()">Confirmar Arribo al Lugar ✓</button>
    `;
  }
  
  else if (step === 1) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">2. Identificación del Ocupante</div>
        <div class="card-subtitle">Pedile el DNI físico al morador que abre la puerta y escanealo.</div>
      </div>
      
      ${state.dniScannedData ? `
        <div class="dni-card">
          <div class="dni-header">
            <span class="dni-title">DNI Nacional · RENAPER</span>
            <span class="chip chip-green" style="background:#fff; color:var(--green); font-size:8px;">VÁLIDO</span>
          </div>
          <div class="dni-body">
            <div class="dni-photo-mock">👤</div>
            <div class="dni-fields">
              <div class="dni-field"><span class="dni-label">Nombre Completo</span><span class="dni-value">${state.dniScannedData.nombre}</span></div>
              <div class="dni-field"><span class="dni-label">Documento</span><span class="dni-value">${state.dniScannedData.dni}</span></div>
              <div class="dni-field"><span class="dni-label">Edad / Sexo</span><span class="dni-value">${state.dniScannedData.edad} / M</span></div>
            </div>
          </div>
        </div>
        
        <div class="form-group" style="margin-top:14px;">
          <label class="form-label">Carácter del residente</label>
          <select class="form-select" id="morador-relation">
            <option>Titular bajo probation / Imputado</option>
            <option>Conviviente / Familiar directo</option>
            <option>Locatario / Tercero inquilino</option>
          </select>
        </div>
        
        <div class="btn-row">
          <button class="btn-large secondary" onclick="resetDniScan()">Escanear de Nuevo</button>
          <button class="btn-large primary" onclick="nextStep()">Continuar →</button>
        </div>
      ` : `
        <div class="scanner-container">
          <div class="scanner-viewfinder">
            <div class="scan-line"></div>
          </div>
          <div class="scanner-hint">Alineá el código de barras del DNI</div>
        </div>
        <div class="btn-row">
          <button class="btn-large gold" onclick="simulateDniScan('32114897')">Simular Escaneo Rocha, Sergio (Sospechoso)</button>
        </div>
        <div style="margin-top:10px; text-align:center;">
          <a href="#" style="font-size:12px; color:var(--pc-navy); font-weight:700;" onclick="simulateDniScan('10443219')">Simular Escaneo Bermúdez, Juan (Tercero)</a>
        </div>
      `}
    `;
  }
  
  else if (step === 2) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">3. Relato del Procedimiento</div>
        <div class="card-subtitle">Dictale a la app lo que ves para que la IA prerrellene el acta.</div>
      </div>
      
      <div class="audio-recorder">
        <div class="wave-container ${state.isRecordingAudio ? 'active' : ''}" id="wave-container">
          <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
          <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
          <div class="wave-bar"></div>
        </div>
        
        <button class="btn-large ${state.isRecordingAudio ? 'danger' : 'primary'}" onclick="toggleAudioRecording()">
          ${state.isRecordingAudio ? '■ Detener Dictado' : '🎤 Empezar Dictado de Acta'}
        </button>
      </div>
      
      <div class="form-group">
        <label class="form-label">Texto del Acta Constatación</label>
        <textarea class="form-textarea" id="acta-text" placeholder="El texto transcrito aparecerá acá..." rows="4">${state.audioTranscript}</textarea>
      </div>
      
      <button class="btn-large primary" onclick="saveTranscriptAndNext()">Guardar Acta y Continuar →</button>
    `;
  }
  
  else if (step === 3) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">4. Evidencia Gráfica Obligatoria</div>
        <div class="card-subtitle">Capturá la fachada del domicilio o el número de puerta para constatar preexistencia.</div>
      </div>
      
      ${state.fotoFachadaCaptured ? `
        <div class="scanner-container done" style="background:#E2E8F0; color:var(--green);">
          <span style="font-size:48px;">📷</span>
          <div style="font-weight:700; margin-top:10px;">Foto cargada y hasheada</div>
          <div style="font-size:10px; font-family:monospace; color:var(--text-muted);">MD5: 5ec8d9a2b001a1829e...</div>
        </div>
        <div class="btn-row">
          <button class="btn-large secondary" onclick="state.fotoFachadaCaptured=false; renderApp();">Tomar otra foto</button>
          <button class="btn-large primary" onclick="nextStep()">Continuar →</button>
        </div>
      ` : `
        <div class="scanner-container" style="cursor:pointer;" onclick="simulateFotoCapture()">
          <span style="font-size:48px;">📷</span>
          <div style="font-weight:700; margin-top:10px;">Hacé clic para capturar foto</div>
          <div class="scanner-hint">Se registrará geolocalización y marca de tiempo EXIF</div>
        </div>
      `}
    `;
  }
  
  else if (step === 4) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">5. Firma Digital de Testigo / Conviviente</div>
        <div class="card-subtitle">Se requiere la firma del morador o un testigo civil de actuación.</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">DNI Testigo</label>
        <input type="text" class="form-input" id="wit-dni" placeholder="Ej. 24883104" value="${state.witnessDni}" onchange="state.witnessDni=this.value">
      </div>
      
      <div class="form-group">
        <label class="form-label">Nombre Testigo</label>
        <input type="text" class="form-input" id="wit-name" placeholder="Apellido y Nombres" value="${state.witnessName}" onchange="state.witnessName=this.value">
      </div>
      
      <div class="card" style="padding:10px; margin-bottom:12px;">
        <div class="form-label" style="margin-bottom:4px;">Método de firma de conformidad</div>
        <div style="display:flex; gap:10px;">
          <button class="btn-large ${state.witnessOtpVerified ? 'success' : 'secondary'}" style="height:36px; font-size:12px;" onclick="simulateSmsOtp()">
            ${state.witnessOtpVerified ? '✓ Código SMS Verificado' : '📲 Firma por código SMS OTP'}
          </button>
        </div>
      </div>
      
      <div class="form-label">Firma manuscrita en pantalla</div>
      <div class="sig-pad-box ${state.isSignatureSigned ? 'signed' : ''}" onclick="simulateSignature()">
        ${state.isSignatureSigned ? '✓ Firma Registrada Digitalmente' : 'Dibujá la firma del testigo acá (Clic para simular)'}
      </div>
      
      <button class="btn-large success" onclick="finalizeTask('${task.id}')">Cerrar y Elevar Acta de Constatación ✓</button>
    `;
  }
  
  container.innerHTML = headerHtml + bodyHtml;
}

// ---- FLUJO 2: CONTROL DOMICILIARIO (PROBATION) ----
function renderProbationFlow(container, task) {
  const step = state.taskStep;
  const steps = ["Ubicación", "Control Presencial", "Foto Fachada", "Firma Oficial"];
  const progressBars = steps.map((s, i) => `<div class="progress-step ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('');
  
  let headerHtml = `
    <div class="back-btn-row">
      <button class="btn-back" onclick="cancelActiveTask()">← Salir de tarea</button>
    </div>
    <div class="flow-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="chip chip-purple">${task.tipo}</span>
        <span style="font-size:11px; font-weight:700; color:var(--text-muted);">${step + 1} de ${steps.length}</span>
      </div>
      <div class="flow-title" style="margin-top:6px;">${task.sujeto}</div>
      <div class="flow-sub">Destino: ${task.direccion}</div>
    </div>
    <div class="progress-bar">${progressBars}</div>
  `;
  
  let bodyHtml = "";
  
  if (step === 0) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">1. GPS Arribo</div>
        <div class="card-subtitle">Verificando cercanía al domicilio de probation: ${task.direccion}</div>
        <div class="info-row"><span class="k">Tu posición</span><span class="v">En el lugar (Malabia 2340)</span></div>
      </div>
      <button class="btn-large success" onclick="nextStep()">Confirmar Arribo ✓</button>
    `;
  } else if (step === 1) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">2. Constatación Presencial</div>
        <div class="card-subtitle">¿El imputado Sergio Rocha se encuentra en el domicilio?</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Resultado del control</label>
        <select class="form-select" id="prob-presence" onchange="state.probPresence=this.value">
          <option value="presente">Imputado presente (Satisface regla)</option>
          <option value="ausente">Imputado ausente (Conviviente indica que no está)</option>
          <option value="nadie">Nadie responde al timbre (Posible infracción)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Observaciones de la visita</label>
        <textarea class="form-textarea" placeholder="Ej: Se entrevista a Sergio Rocha en la puerta del domicilio. Refiere estar cumpliendo sus pautas con normalidad..."></textarea>
      </div>
      
      <button class="btn-large primary" onclick="nextStep()">Continuar →</button>
    `;
  } else if (step === 2) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">3. Captura Fotográfica</div>
        <div class="card-subtitle">Tomar foto de la puerta o timbre del departamento.</div>
      </div>
      ${state.fotoFachadaCaptured ? `
        <div class="scanner-container done">
          <span style="font-size:40px;">📷</span>
          <div style="font-weight:700;">Foto cargada y firmada</div>
        </div>
        <button class="btn-large primary" onclick="nextStep()">Continuar →</button>
      ` : `
        <div class="scanner-container" style="cursor:pointer;" onclick="simulateFotoCapture()">
          <span style="font-size:40px;">📷</span>
          <div style="font-weight:700; margin-top:10px;">Clic para tomar foto de control</div>
        </div>
      `}
    `;
  } else if (step === 3) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">4. Cierre y Firma del Oficial</div>
        <div class="card-subtitle">Certificás en carácter de declaración jurada la constatación del control.</div>
      </div>
      
      <div class="sig-pad-box ${state.isSignatureSigned ? 'signed' : ''}" onclick="simulateSignature()">
        ${state.isSignatureSigned ? '✓ Firma del Oficial Aguirre Registrada' : 'Firmá como Oficial Aguirre acá (Clic para simular)'}
      </div>
      
      <button class="btn-large success" onclick="finalizeProbation()">Enviar Control a Fiscalía ✓</button>
    `;
  }
  
  container.innerHTML = headerHtml + bodyHtml;
}

// ---- FLUJO 3: FE DE VIDA / SUPERVIVENCIA ----
function renderFeVidaFlow(container, task) {
  const step = state.taskStep;
  const steps = ["Arribo", "DNI del Vecino", "Prueba Facial", "Firma y Certificación"];
  const progressBars = steps.map((s, i) => `<div class="progress-step ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('');
  
  let headerHtml = `
    <div class="back-btn-row">
      <button class="btn-back" onclick="cancelActiveTask()">← Salir de tarea</button>
    </div>
    <div class="flow-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="chip chip-amber">${task.tipo}</span>
        <span style="font-size:11px; font-weight:700; color:var(--text-muted);">${step + 1} de ${steps.length}</span>
      </div>
      <div class="flow-title" style="margin-top:6px;">${task.sujeto}</div>
      <div class="flow-sub">Dirección: ${task.direccion}</div>
    </div>
    <div class="progress-bar">${progressBars}</div>
  `;
  
  let bodyHtml = "";
  
  if (step === 0) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">1. Ubicación Confirmada</div>
        <div class="card-subtitle">Llegada a Guatemala 4210, 2º 'A'.</div>
        <div class="info-row"><span class="k">Vecino</span><span>Juan Manuel Bermúdez (78 años)</span></div>
        <div class="info-row"><span class="k">GPS</span><span style="color:var(--green);">✓ En Domicilio</span></div>
      </div>
      <button class="btn-large success" onclick="nextStep()">Iniciar Trámite de Supervivencia ✓</button>
    `;
  } else if (step === 1) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">2. Escaneo DNI del Ciudadano</div>
        <div class="card-subtitle">Escanea el DNI para cotejar biográficamente con RENAPER.</div>
      </div>
      ${state.dniScannedData ? `
        <div class="dni-card">
          <div class="dni-header">
            <span class="dni-title">DNI Digitalizado</span>
            <span class="chip chip-green" style="background:#fff; color:var(--green); font-size:8px;">VÁLIDO</span>
          </div>
          <div class="dni-body">
            <div class="dni-photo-mock">👴</div>
            <div class="dni-fields">
              <div class="dni-field"><span class="dni-label">Nombre</span><span class="dni-value">BERMÚDEZ, Juan Manuel</span></div>
              <div class="dni-field"><span class="dni-label">DNI</span><span class="dni-value">10.443.219</span></div>
              <div class="dni-field"><span class="dni-label">Fecha Nacimiento</span><span class="dni-value">12/03/1948</span></div>
            </div>
          </div>
        </div>
        <button class="btn-large primary" style="margin-top:14px;" onclick="nextStep()">Continuar al Cotejo Biométrico →</button>
      ` : `
        <div class="scanner-container">
          <div class="scanner-viewfinder">
            <div class="scan-line"></div>
          </div>
          <div class="scanner-hint">Escanear código PDF417 del DNI</div>
        </div>
        <button class="btn-large gold" style="margin-top:14px;" onclick="simulateDniScan('10443219')">Simular Escaneo DNI Bermúdez</button>
      `}
    `;
  } else if (step === 2) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">3. Cotejo Biométrico Facial</div>
        <div class="card-subtitle">Tomale una foto al rostro del vecino para validar identidad en tiempo real contra la foto oficial del RENAPER.</div>
      </div>
      ${state.fotoFachadaCaptured ? `
        <div class="scanner-container done" style="background:var(--green-bg); color:var(--green);">
          <span style="font-size:36px;">👴</span>
          <div style="font-weight:700; margin-top:8px;">Cotejo Biométrico Exitoso</div>
          <div style="font-size:12px; font-weight:700;">Similitud: 94.8% · Identidad Homologada</div>
        </div>
        <button class="btn-large primary" style="margin-top:14px;" onclick="nextStep()">Proceder a la Firma →</button>
      ` : `
        <div class="scanner-container" style="cursor:pointer;" onclick="simulateFotoCapture()">
          <span style="font-size:36px;">📸</span>
          <div style="font-weight:700; margin-top:10px;">Clic para tomar foto de verificación facial</div>
        </div>
      `}
    `;
  } else if (step === 3) {
    bodyHtml = `
      <div class="card">
        <div class="card-title">4. Conformidad y Firma del Ciudadano</div>
        <div class="card-subtitle">El vecino firma digitalmente para dar fe de vida y autorizar el envío a ANSES.</div>
      </div>
      
      <div class="sig-pad-box ${state.isSignatureSigned ? 'signed' : ''}" onclick="simulateSignature()">
        ${state.isSignatureSigned ? '✓ Firma del Ciudadano Registrada' : 'Firma del Vecino Bermúdez acá (Clic para simular)'}
      </div>
      
      <button class="btn-large success" onclick="finalizeFeVida()">Emitir Certificado Fe de Vida ✓</button>
    `;
  }
  
  container.innerHTML = headerHtml + bodyHtml;
}

// ==========================================
// INTERACCIONES Y CONTROLADORES DE EVENTOS
// ==========================================

function nextStep() {
  state.taskStep++;
  renderApp();
}

function cancelActiveTask() {
  state.activeTask = null;
  state.taskStep = 0;
  resetTaskState();
  renderApp();
}

function simulateDniScan(dni) {
  state.dniScannedData = MOCK_PEOPLE[dni] || null;
  renderApp();
}

function resetDniScan() {
  state.dniScannedData = null;
  renderApp();
}

function toggleAudioRecording() {
  state.isRecordingAudio = !state.isRecordingAudio;
  
  if (state.isRecordingAudio) {
    state.audioTranscript = "Escuchando audio del procedimiento...";
    renderApp();
    
    // Simular transcripción de voz IA progresiva
    let texts = [
      "Siendo las 15:48 hs, me constituyo en el domicilio de Malabia 2340...",
      "Siendo las 15:48 hs, me constituyo en el domicilio de Malabia 2340. Procedo a llamar al timbre...",
      "Siendo las 15:48 hs, me constituyo en el domicilio de Malabia 2340. Procedo a llamar al timbre y soy atendido por quien dice ser Sergio Rocha, quien acredita su identidad mediante DNI..."
    ];
    
    let tIndex = 0;
    const interval = setInterval(() => {
      if (!state.isRecordingAudio) {
        clearInterval(interval);
        return;
      }
      state.audioTranscript = texts[tIndex];
      tIndex++;
      renderApp();
      if (tIndex >= texts.length) {
        clearInterval(interval);
        state.isRecordingAudio = false;
        renderApp();
      }
    }, 1500);
  }
}

function saveTranscriptAndNext() {
  const input = document.getElementById("acta-text");
  if (input) {
    state.audioTranscript = input.value;
  }
  nextStep();
}

function simulateFotoCapture() {
  state.fotoFachadaCaptured = true;
  renderApp();
}

function simulateSignature() {
  state.isSignatureSigned = true;
  renderApp();
}

function simulateSmsOtp() {
  state.witnessOtpSent = true;
  state.witnessOtpVerified = true;
  renderApp();
}

function finalizeTask(id) {
  // Guardar estado completado de la constatación
  const task = state.comisariaOficios.find(o => o.id === id);
  if (task) {
    task.estado = "Completada";
  }
  
  state.tab = "tareas";
  state.activeTask = null;
  state.taskStep = 0;
  
  // Render de éxito
  const contentEl = document.getElementById("app-content");
  contentEl.innerHTML = `
    <div class="success-screen">
      <div class="success-icon-wrap">✓</div>
      <h2 class="success-title">Constatación Finalizada y Firmada</h2>
      <p class="success-desc">El acta de constatación Nº ${id} ha sido firmada digitalmente y transmitida por sistema EJE de la CABA al Juzgado solicitante.</p>
      <button class="btn-large primary" onclick="switchTab('tareas')">Volver a mis tareas</button>
    </div>
  `;
}

function finalizeProbation() {
  state.tab = "tareas";
  state.activeTask = null;
  state.taskStep = 0;
  
  const contentEl = document.getElementById("app-content");
  contentEl.innerHTML = `
    <div class="success-screen">
      <div class="success-icon-wrap" style="background:var(--purple-bg); color:var(--purple);">✓</div>
      <h2 class="success-title">Control de Probation Reportado</h2>
      <p class="success-desc">Se cargó el informe de control de conducta de Sergio Rocha en el legajo del Juzgado Penal, Contravencional y de Faltas Nº 12.</p>
      <button class="btn-large primary" onclick="switchTab('tareas')">Volver a mis tareas</button>
    </div>
  `;
}

function finalizeFeVida() {
  state.tab = "fe_vida";
  state.activeTask = null;
  state.taskStep = 0;
  
  const contentEl = document.getElementById("app-content");
  contentEl.innerHTML = `
    <div class="success-screen">
      <div class="success-icon-wrap" style="background:var(--amber-bg); color:var(--amber);">✓</div>
      <h2 class="success-title">Supervivencia Acreditada</h2>
      <p class="success-desc">Se emitió el Certificado de Fe de Vida de Juan Manuel Bermúdez. Se envió copia automática al Registro Nacional de Reincidencia (RNR), ANSES y a la app miBA del ciudadano.</p>
      <button class="btn-large primary" onclick="switchTab('fe_vida')">Volver a Fe de Vida</button>
    </div>
  `;
}

function showOficioDetail(id) {
  const task = state.comisariaOficios.find(o => o.id === id);
  if (!task) return;
  
  const modal = document.createElement("div");
  modal.className = "oficio-modal";
  modal.id = "oficio-modal-el";
  modal.innerHTML = `
    <div class="oficio-sheet">
      <div class="sheet-header">
        <span class="sheet-title">Oficio Judicial ${task.id}</span>
        <button class="sheet-close" onclick="closeOficioModal()">✕</button>
      </div>
      <div style="font-size:12px; line-height:1.5; font-family:monospace; background:#0F172A; color:#22C55E; padding:12px; border-radius:8px; overflow-x:auto;">
        PODER JUDICIAL DE LA CIUDAD AUTÓNOMA DE BUENOS AIRES<br>
        JUZGADO EN LO PENAL, CONTRAVENCIONAL Y DE FALTAS Nº 12<br>
        Sec. Nº 3 - Dra. Acosta, Mariana<br><br>
        OFICIO Nº OF-2026-9081<br>
        Causa: J-01-00078234-2/2026-0<br>
        Carátula: ROCHA, Sergio Damián s/ CP 89 (Lesiones)<br><br>
        Al Sr. Comisario de la Comisaría Vecinal 14-A:<br>
        Tengo el agrado de dirigirme a Ud. a fin de solicitarle que por medio del personal de prevención de su dependencia se sirva disponer la CONSTATACIÓN DE DOMICILIO real e inquilinos del imputado Sr. ROCHA, Sergio Damián (DNI 32.114.897), debiendo certificar si habita efectivamente en la calle Malabia 2340, 3º 'B', Palermo, debiéndose recabar firmas de moradores e informar fachada.<br><br>
        El informe deberá ser remitido por vía digital (sistema EJE) en el plazo improrrogable de 48 horas.<br><br>
        Firma digital: Dra. Acosta, Mariana - Juez de Garantías.
      </div>
    </div>
  `;
  document.getElementById("container").appendChild(modal);
}

function closeOficioModal() {
  const m = document.getElementById("oficio-modal-el");
  if (m) m.remove();
}

function switchTab(tabId) {
  state.tab = tabId;
  state.activeTask = null;
  state.taskStep = 0;
  
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(t => {
    t.classList.toggle("active", t.dataset.tab === tabId);
  });
  
  renderApp();
}

// ==========================================
// SIMULACIÓN DE SEGURIDAD: BOTÓN ANTIPÁNICO
// ==========================================

function triggerMockEmergency() {
  state.alertActive = true;
  state.alertData = {
    tipo: "BOTÓN ANTIPÁNICO / GEOCERCA INFRINGIDA",
    causa: "Causa 78/26 s/ Violencia de Género",
    victima: "RÍOS, Elena Victoria (Uriarte 1428)",
    agresor: "ROCHA, Sergio Damián (DNI 32.114.897)",
    posicionAgresor: "Uriarte y Costa Rica (A 120 metros)",
    tiempoInfraccion: "Hace 15 segundos",
    distanciaVictima: "120 metros de la víctima (Umbral de pánico: 500m)"
  };
  renderApp();
}

function renderEmergencyAlert() {
  const contentEl = document.getElementById("app-content");
  contentEl.innerHTML = `
    <div class="emergency-alert">
      <div class="alert-dialog">
        <div class="alert-icon-ring">🚨</div>
        <h2 class="alert-title">¡ALERTA PERIMETRAL VIGENTE!</h2>
        <div class="alert-desc">
          El dispositivo de monitoreo (Tobillera GPS) reporta infracción del límite perimetral en tu cuadrante de patrullaje.
        </div>
        
        <div class="alert-meta-box">
          <div class="alert-meta-row"><b>Víctima protegida:</b> <span>Elena Ríos (Uriarte 1428)</span></div>
          <div class="alert-meta-row"><b>Agresor monitoreado:</b> <span style="color:var(--red); font-weight:700;">Sergio Rocha</span></div>
          <div class="alert-meta-row"><b>Estado de exclusión:</b> <span style="color:var(--red);">Radio 500m INFRINGIDO</span></div>
          <div class="alert-meta-row"><b>Ubicación agresor:</b> <span>Costa Rica y Uriarte (A 120m)</span></div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn-large danger" onclick="acceptEmergency()">Aceptar Despacho e Intervenir ➔</button>
          <button class="btn-large secondary" onclick="closeEmergency()">Descartar / Apoyo Despachado</button>
        </div>
      </div>
    </div>
  `;
}

function acceptEmergency() {
  state.alertActive = false;
  state.tab = "mapa";
  renderApp();
  
  // Al cambiar al mapa, centramos el pin y mostramos la ruta
  setTimeout(() => {
    alert("Navegación GPS iniciada: Dirígete a Uriarte 1428 de inmediato. Móvil 4232 despachado como refuerzo.");
  }, 100);
}

function closeEmergency() {
  state.alertActive = false;
  state.alertData = null;
  renderApp();
}

// Simular movimiento del agresor hacia el perímetro en segundo plano para dar realismo al mapa
function simulateAggressorMovement() {
  let isMovingLeft = true;
  setInterval(() => {
    if (state.tab === 'mapa' && !state.alertActive) {
      const pin = document.getElementById("agresor-pin");
      if (pin) {
        // Mover el pin ligeramente de forma visual
        let top = parseFloat(pin.style.top);
        let left = parseFloat(pin.style.left);
        
        if (isMovingLeft) {
          left -= 2;
          top -= 1;
          if (left <= 45) {
            isMovingLeft = false;
            // Disparar alarma si se acerca demasiado
            triggerMockEmergency();
          }
        } else {
          left += 2;
          top += 1;
          if (left >= 75) isMovingLeft = true;
        }
        
        pin.style.left = left + "%";
        pin.style.top = top + "%";
      }
    }
  }, 3000);
}
