// PROTOTIPO SIPJU - LÓGICA DE APLICACIÓN (VISTA DUAL)

// ==========================================
// BASE DE DATOS SIMULADA (MOCK DATA)
// ==========================================

const MOCK_PEOPLE = {
  "35842901": {
    nombre: "MARTINEZ, Lucas Sebastián",
    dni: "35.842.901",
    edad: "29 años",
    direccion: "Gascón 1254, 4º 'A', CABA",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "2 Procesos Penales Abiertos",
    alertas: ["Restricción Perimetral Activa (Causa 142/25)"]
  },
  "32114897": {
    nombre: "ROCHA, Sergio Damián",
    dni: "32.114.897",
    edad: "34 años",
    direccion: "Malabia 2340, 3º 'B', Palermo",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "1 Proceso Penal Abierto (CP 89 - Lesiones)",
    alertas: ["Sujeto bajo Reglas de Conducta (Probation)", "Exclusión de Hogar Vigente"]
  },
  "10443219": {
    nombre: "BERMÚDEZ, Juan Manuel",
    dni: "10.443.219",
    edad: "78 años",
    direccion: "Guatemala 4210, 2º 'A', Palermo",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "Sin Antecedentes",
    alertas: ["Movilidad Reducida Declarada"]
  },
  "27580092": {
    nombre: "ABDURRAMAN, Yamila",
    dni: "27.580.092",
    edad: "41 años",
    direccion: "Costa Rica 4820, Palermo Soho",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "Sin Antecedentes",
    alertas: ["Habeas Corpus Solicitado en Trámite"]
  },
  "24883104": {
    nombre: "RÍOS, Elena Victoria",
    dni: "24.883.104",
    edad: "45 años",
    direccion: "Uriarte 1428, Palermo Soho",
    renaper: "VÁLIDO (Cotejo biográfico OK)",
    rnr: "Sin Antecedentes",
    alertas: ["Víctima Protegida - Botón Antipánico Activo"]
  }
};

const INITIAL_OFICIOS = [
  {
    id: "OF-2026-9081",
    origen: "Juzgado Penal Contravencional y de Faltas Nº 12",
    juez: "Dra. Acosta, M.",
    causa: "Nº 4782/25 s/ Morigeración de Pena",
    tipo: "Constatación de Domicilio (Urgente - Excarcelación)",
    sujeto: "ROCHA, Sergio Damián (DNI 32.114.897)",
    direccion: "Malabia 2340, CABA",
    distancia: "350 metros",
    prioridad: "CRÍTICA",
    plazo: "4 horas (Libertad)",
    comisaria: "Comisaría Vecinal 14-A",
    estado: "Pendiente"
  },
  {
    id: "OF-2026-8812",
    origen: "Registro Civil / Trámite Ciudadano",
    juez: "Trámite Administrativo Nº 1029/26",
    causa: "Solicitud de Certificado de Domicilio",
    tipo: "Certificado de Domicilio (Trámite Administrativo)",
    sujeto: "MARTINEZ, Lucas Sebastián (DNI 35.842.901)",
    direccion: "Gascón 1254, CABA",
    distancia: "1.2 km",
    prioridad: "BAJA",
    plazo: "5 días",
    comisaria: "Comisaría Vecinal 14-A",
    estado: "Pendiente"
  }
];


// ==========================================
// ESTADO GLOBAL DE LA SIMULACIÓN
// ==========================================

let state = {
  tab: 'home', // home, ia, tareas, fe_vida, mapa
  activeTask: null, // null o tarea móvil activa
  taskStep: 0,
  currentGPS: { lat: -34.5855, lng: -58.4278 }, // Plaza Armenia
  chatMessages: [
    { sender: 'assistant', text: "👮 Hola Oficial. Soy el Asistente IA de SIPJU.\n\nPodés preguntarme sobre calles que no conozcas, artículos del Código Penal o protocolos (ej: *'testigo no quiere firmar'*)." }
  ],
  dniScannedData: null,
  isRecordingAudio: false,
  audioTranscript: "",
  isSignatureSigned: false,
  witnessDni: "",
  witnessName: "",
  witnessOtpVerified: false,
  alertActive: false,
  alertData: null,
  fotoFachadaCaptured: false,
  
  // Datos compartidos Comisaría <-> Móvil
  comisariaOficios: [...INITIAL_OFICIOS],
  
  // Estado exclusivo de la Comisaría
  ocrStatus: null, // null, 'scanning', 'ready'
  ocrData: null,
  assignedPatrol: null,
  
  // Variables del mapa de geocerca interactivo
  agresorDist: 480,
  agresorPinPos: { top: 55, left: 75 },
  agresorDirection: -1 // Acercándose
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  renderApp();
  startMapLoop();
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
  
  // Botón Reiniciar
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.comisariaOficios = [...INITIAL_OFICIOS];
      state.tab = 'home';
      state.activeTask = null;
      state.taskStep = 0;
      state.ocrStatus = null;
      state.ocrData = null;
      state.assignedPatrol = null;
      state.chatMessages = [
        { sender: 'assistant', text: "👮 Hola Oficial. Soy el Asistente IA de SIPJU.\n\nPodés preguntarme sobre calles que no conozcas, artículos del Código Penal o protocolos (ej: *'testigo no quiere firmar'*)." }
      ];
      state.agresorDist = 480;
      state.agresorPinPos = { top: 55, left: 75 };
      resetTaskState();
      
      const homeTab = document.querySelector(".nav-tab[data-tab='home']");
      if (homeTab) {
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        homeTab.classList.add("active");
      }
      
      renderApp();
      alert("Prototipo SIPJU reiniciado al estado inicial.");
    });
  }
}

function resetTaskState() {
  state.dniScannedData = null;
  state.isRecordingAudio = false;
  state.audioTranscript = "";
  state.isSignatureSigned = false;
  state.witnessDni = "";
  state.witnessName = "";
  state.witnessOtpVerified = false;
  state.fotoFachadaCaptured = false;
}

// ==========================================
// RENDERIZADO GLOBAL (CELULAR + COMISARÍA)
// ==========================================

function renderApp() {
  // 1. Render Celular (Lado Izquierdo)
  renderPhoneView();
  
  // 2. Render Consola Comisaría (Lado Derecho)
  renderPrecinctView();
  
  // 3. Control de Alerta de Emergencia BAP
  if (state.alertActive) {
    renderEmergencyModal();
  }
}

// ==========================================
// RENDER: PANTALLAS DEL CELULAR
// ==========================================

function renderPhoneView() {
  const contentEl = document.getElementById("app-content");
  if (!contentEl) return;
  
  if (state.activeTask) {
    renderActiveTaskFlow(contentEl);
    return;
  }
  
  switch (state.tab) {
    case 'home':
      renderPhoneHome(contentEl);
      break;
    case 'ia':
      renderPhoneIA(contentEl);
      break;
    case 'tareas':
      renderPhoneTareas(contentEl);
      break;
    case 'fe_vida':
      renderPhoneFeVida(contentEl);
      break;
    case 'mapa':
      renderPhoneMapa(contentEl);
      break;
  }
}

function renderPhoneHome(container) {
  const pendingCount = state.comisariaOficios.filter(o => o.estado === 'Pendiente').length;
  
  container.innerHTML = `
    <!-- Turno Status -->
    <div class="status-strip">
      <div class="status-indicator">
        <span class="pulse-dot"></span>
        <span>EN SERVICIO</span>
      </div>
      <div>Placa: 41.782 · Zona 14A</div>
    </div>
    
    <!-- KPI Strip -->
    <div class="card" style="padding: 12px 6px; margin-bottom: 14px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center;">
        <div style="border-right: 1px solid var(--border-light);">
          <div style="font-size: 18px; font-weight: 800; color: var(--pc-navy);">${pendingCount}</div>
          <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Constataciones</div>
        </div>
        <div style="border-right: 1px solid var(--border-light);">
          <div style="font-size: 18px; font-weight: 800; color: var(--pc-navy);">1</div>
          <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Controles Prob.</div>
        </div>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: var(--pc-navy);">1</div>
          <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Fe de Vida</div>
        </div>
      </div>
    </div>

    <!-- Active Alertas Card -->
    <div class="card clickable" style="border-left: 4px solid var(--amber); background: var(--amber-bg);" onclick="switchTab('mapa')">
      <div class="card-title-row">
        <span class="chip chip-amber" style="background:#fff;">Alerta Geocerca</span>
        <span style="font-size: 11px; color: var(--text-muted);">En vivo</span>
      </div>
      <div class="card-title" style="font-size:13.5px;">Geocerca Causa 78/26 (Rocha, S.)</div>
      <div class="card-subtitle">Exclusión perimetral 500m activa en Uriarte 1428. Agresor a ${state.agresorDist}m de la víctima.</div>
    </div>
    
    <!-- Quick Access Grid -->
    <div style="margin: 10px 0 8px;"><h3 style="font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Accesos Rápidos</h3></div>
    <div class="quick-grid">
      <div class="quick-tile tile-navy" onclick="switchTab('ia')">
        <div class="tile-icon-wrap">🤖</div>
        <div class="tile-label">Asistente IA</div>
        <div class="tile-sub">Filtros y calles</div>
      </div>
      <div class="quick-tile tile-green" onclick="switchTab('tareas')">
        <div class="tile-icon-wrap">📋</div>
        <div class="tile-label">Constataciones</div>
        <div class="tile-sub">${pendingCount} pendientes</div>
        ${pendingCount > 0 ? `<span class="tile-badge">${pendingCount}</span>` : ''}
      </div>
      <div class="quick-tile tile-purple" onclick="switchTab('fe_vida')">
        <div class="tile-icon-wrap">👴</div>
        <div class="tile-label">Fe de Vida</div>
        <div class="tile-sub">Tercera edad</div>
      </div>
      <div class="quick-tile tile-red" onclick="triggerMockEmergency()">
        <div class="tile-icon-wrap">🚨</div>
        <div class="tile-label">Simular BAP</div>
        <div class="tile-sub">Test de pánico</div>
      </div>
    </div>
  `;
}

function renderPhoneIA(container) {
  container.innerHTML = `
    <div class="chat-container">
      <div class="chat-history" id="chat-history">
        ${state.chatMessages.map(msg => `
          <div class="chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-assistant'}">
            ${msg.text.replace(/\n/g, '<br>')}
          </div>
        `).join('')}
      </div>
      
      <div class="suggested-tags">
        <span class="suggest-tag" onclick="sendSuggest('¿Qué hago si el testigo no quiere firmar?')">⚖ Testigo no quiere firmar</span>
        <span class="suggest-tag" onclick="sendSuggest('No sé dónde estoy, veo Plaza Armenia')">📍 ¿Dónde estoy?</span>
        <span class="suggest-tag" onclick="sendSuggest('Código penal hurto')">📋 CP Hurto</span>
      </div>
      
      <div class="chat-input-row">
        <button class="chat-btn-mic" onclick="toggleChatMic()">🎤</button>
        <input type="text" class="chat-input" id="chat-input-field" placeholder="Escribí al asistente..." onkeypress="handleChatKey(event)">
        <button class="chat-btn-send" onclick="sendChatMessage()">➔</button>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const h = document.getElementById("chat-history");
    if (h) h.scrollTop = h.scrollHeight;
  }, 50);
}

function renderPhoneTareas(container) {
  const pendingOficios = state.comisariaOficios.filter(o => o.estado === 'Pendiente');
  const completedOficios = state.comisariaOficios.filter(o => o.estado === 'Completada');
  
  container.innerHTML = `
    <div class="flow-header">
      <div class="flow-title">Constataciones asignadas</div>
      <div class="flow-sub">Jurisdicción Comisaría Vecinal 14-A</div>
    </div>
    
    <div style="margin: 10px 0 6px;"><h3 style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Asignaciones Pendientes (${pendingOficios.length})</h3></div>
    
    ${pendingOficios.length === 0 ? `
      <div class="card" style="text-align:center; padding: 24px; color: var(--text-muted); font-size:13px;">
        No tenés constataciones asignadas.<br><br><b>Cargá un nuevo oficio desde la Consola de la Comisaría (a la derecha) para simular el despacho.</b>
      </div>
    ` : pendingOficios.map(oficio => `
      <div class="card clickable" onclick="startTask('${oficio.id}')">
        <div class="task-item">
          <div class="task-icon-circle" style="background:var(--red-bg); color:var(--red);">⚖</div>
          <div class="task-details">
            <div class="task-title" style="font-size:13px;">${oficio.tipo}</div>
            <div class="task-desc" style="font-size:11.5px;">${oficio.sujeto}</div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Destino: ${oficio.direccion}</div>
          </div>
          <div class="task-meta">
            <div class="task-dist" style="font-size:11px;">${oficio.distancia}</div>
            <span class="chip chip-red" style="font-size:7.5px;">${oficio.prioridad}</span>
          </div>
        </div>
      </div>
    `).join('')}

    <div style="margin: 14px 0 6px;"><h3 style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Controles Activos (1)</h3></div>
    
    <div class="card clickable" onclick="startProbationControl()">
      <div class="task-item">
        <div class="task-icon-circle" style="background:var(--purple-bg); color:var(--purple);">👤</div>
        <div class="task-details">
          <div class="task-title" style="font-size:13px;">Control Domiciliario (Prisión Domiciliaria)</div>
          <div class="task-desc" style="font-size:11.5px;">ROCHA, Sergio Damián (Causa 4782/25)</div>
        </div>
        <div class="task-meta">
          <div class="task-dist" style="font-size:11px;">350m</div>
          <span class="chip chip-purple" style="font-size:7.5px;">Permanente</span>
        </div>
      </div>
    </div>

    ${completedOficios.length > 0 ? `
      <div style="margin: 14px 0 6px;"><h3 style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Completados hoy (${completedOficios.length})</h3></div>
      ${completedOficios.map(oficio => `
        <div class="card" style="opacity: 0.65; padding: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
            <span style="font-weight:700; text-decoration:line-through;">${oficio.id} · ${oficio.tipo}</span>
            <span class="chip chip-green" style="font-size:7px;">ENTREGADO</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${oficio.sujeto}</div>
        </div>
      `).join('')}
    ` : ''}
  `;
}

function renderPhoneFeVida(container) {
  container.innerHTML = `
    <div class="flow-header">
      <div class="flow-title">Certificados de Supervivencia</div>
      <div class="flow-sub">Trámites para adultos mayores solicitados por ANSES</div>
    </div>
    <div class="card clickable" onclick="startFeVidaTask()">
      <div class="task-item">
        <div class="task-icon-circle" style="background:var(--amber-bg); color:var(--amber);">👴</div>
        <div class="task-details">
          <div class="task-title" style="font-size:13px;">Certificado de Supervivencia (ANSES / Fe de Vida)</div>
          <div class="task-desc" style="font-size:11.5px;">BERMÚDEZ, Juan Manuel (DNI 10.443.219)</div>
          <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Guatemala 4210, 2º 'A' · Palermo Soho</div>
        </div>
        <div class="task-meta">
          <div class="task-dist" style="font-size:11px;">600m</div>
          <span class="chip chip-amber" style="font-size:7.5px;">Pendiente</span>
        </div>
      </div>
    </div>
  `;
}


function renderPhoneMapa(container) {
  container.innerHTML = `
    <div class="flow-header">
      <div class="flow-title">Geocercas de Prevención</div>
      <div class="flow-sub">Cruce GPS Tobillera / Botón Antipánico (BAP)</div>
    </div>
    
    <div class="map-view">
      <!-- Pin del oficial en Plaza Armenia -->
      <div class="map-pin-oficial" style="top: 40%; left: 38%;"></div>
      
      <!-- Pin de la víctima Ríos Elena en Uriarte 1428 -->
      <div class="map-pin-target" style="top: 35%; left: 30%; color:var(--red);" onclick="alert('Víctima protegida: Ríos Elena (Uriarte 1428)')">📍</div>
      
      <!-- Círculo de la geocerca de exclusión (500m) en torno a Ríos Elena -->
      <div class="map-perimeter" style="top: 35%; left: 30%; width: 180px; height: 180px;"></div>
      
      <!-- Pin del agresor Sergio Rocha con animación de movimiento -->
      <div class="map-pin-target" style="top: ${state.agresorPinPos.top}%; left: ${state.agresorPinPos.left}%; color:var(--amber);" id="agresor-pin">🏃</div>
      
      <svg class="map-svg" viewBox="0 0 400 300">
        <!-- Calles de Palermo -->
        <line x1="0" y1="50" x2="400" y2="50" stroke="#CBD5E1" stroke-width="4" />
        <line x1="0" y1="120" x2="400" y2="120" stroke="#CBD5E1" stroke-width="6" />
        <line x1="0" y1="210" x2="400" y2="210" stroke="#CBD5E1" stroke-width="4" />
        
        <line x1="120" y1="0" x2="120" y2="300" stroke="#CBD5E1" stroke-width="4" />
        <line x1="220" y1="0" x2="220" y2="300" stroke="#CBD5E1" stroke-width="4" />
        
        <!-- Plaza Armenia -->
        <rect x="135" y="135" width="70" height="60" rx="8" fill="#A7F3D0" stroke="#6EE7B7" stroke-width="1.5" />
      </svg>
    </div>
    
    <div class="card" style="padding: 12px;">
      <div style="font-size:12.5px; line-height:1.4;">
        <div style="font-weight:700; color:var(--red); display:flex; justify-content:space-between;">
          <span>Estado del perímetro (BAP):</span>
          <span>${state.agresorDist} metros</span>
        </div>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">
          Sujeto excluido: ROCHA, Sergio Damián.<br>
          Víctima protegida: RÍOS, Elena Victoria (Uriarte 1428).<br>
          <span style="color:var(--amber); font-weight:600;">El pin se está moviendo. Si cruza el límite de 500m saltará el Alerta Preventora.</span>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// RENDER: CONSOLA DE LA COMISARÍA (DERECHA)
// ==========================================

function renderPrecinctView() {
  const container = document.getElementById("console-body");
  if (!container) return;
  
  const oficiosTabla = state.comisariaOficios.map(o => `
    <tr>
      <td style="font-weight:700;">${o.id}</td>
      <td>${o.tipo}</td>
      <td style="font-size:11.5px;">${o.sujeto.split(" (")[0]}</td>
      <td><span class="chip ${o.prioridad === 'ALTA' ? 'chip-red' : 'chip-amber'}" style="font-size:8px;">${o.prioridad}</span></td>
      <td><span class="chip ${o.estado === 'Completada' ? 'chip-green' : 'chip-navy'}" style="font-size:8px;">${o.estado}</span></td>
    </tr>
  `).join('');
  
  let ocrWidgetHtml = "";
  if (state.ocrStatus === null) {
    ocrWidgetHtml = `
      <div style="border: 2px dashed #475569; border-radius:12px; padding:24px; text-align:center; cursor:pointer;" onclick="triggerSimulateOcr()">
        <span style="font-size:32px;">📄</span>
        <div style="font-weight:700; color:#fff; margin-top:8px;">Recibir y Subir Oficio Judicial</div>
        <div style="font-size:11px; color:#94A3B8; margin-top:4px;">Arrastrá el PDF o hacé clic para cargar (simula recibir un Oficio por EJE o Mail de fiscalía)</div>
      </div>
    `;
  } else if (state.ocrStatus === 'scanning') {
    ocrWidgetHtml = `
      <div class="ocr-loading-box">
        <span style="font-size:28px; animation: pulse 1.5s infinite;">🧠</span>
        <div style="font-weight:700; color:#fff; margin-top:8px;">Procesando Oficio con IA (OCR)...</div>
        <div style="font-size:11px; color:#94A3B8; margin-top:2px;">Extrayendo caratula, CUIJ, domicilio e imputado.</div>
        <div class="ocr-bar"></div>
      </div>
    `;
  } else if (state.ocrStatus === 'ready') {
    ocrWidgetHtml = `
      <div class="console-card" style="border: 2px solid var(--green); margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span class="chip chip-green">✓ Extracción IA/OCR Completada</span>
          <span style="font-size:10px; color:var(--text-muted);">Causa: J-01-00115790-2</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; font-size:12.5px;">
          <div><b style="color:#94A3B8;">Tipo:</b> ${state.ocrData.tipo}</div>
          <div><b style="color:#94A3B8;">Sujeto:</b> ${state.ocrData.sujeto}</div>
          <div><b style="color:#94A3B8;">Dirección:</b> <span style="color:var(--pc-gold); font-weight:700;">${state.ocrData.direccion}</span></div>
          <div><b style="color:#94A3B8;">Causa Ref:</b> ${state.ocrData.causa}</div>
        </div>
        
        <div style="border-top:1px solid #334155; margin-top:10px; padding-top:10px;">
          <div style="font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; margin-bottom:6px;">Despacho Inteligente (SISEP)</div>
          <div style="font-size:12px; margin-bottom:8px; line-height:1.4;">
            Asignado por proximidad al móvil libre más cercano:<br>
            🚀 <b style="color:var(--pc-blue-bright);">Oficial Aguirre</b> (Móvil 4231) a <b>180 metros</b>.
            <br><span style="font-size:10px; color:var(--text-muted);">Nota: Móvil 4233 está a 90m pero posee Consigna Fija.</span>
          </div>
          <button class="btn-large gold" style="height:38px; font-size:12.5px;" onclick="dispatchOficio()">Confirmar Despacho a Oficial Aguirre ➔</button>
        </div>
      </div>
    `;
  }

  let sisepMapWidgetHtml = "";
  if (state.ocrStatus === 'ready') {
    sisepMapWidgetHtml = `
      <div class="console-card" style="flex:1; display:flex; flex-direction:column; animation: slideDown 0.3s ease-out;">
        <div class="console-section-title">SISEP · Monitoreo de Recursos</div>
        
        <!-- Mapa SISEP con círculos de asignación -->
        <div class="sisep-map-container">
          <!-- Círculos de cobertura visualizados del SISEP -->
          <div class="sisep-ring green" style="top: 45%; left: 38%; width: 90px; height: 90px;"></div>
          <div class="sisep-ring yellow" style="top: 25%; left: 65%; width: 70px; height: 70px;"></div>
          <div class="sisep-ring red" style="top: 30%; left: 24%; width: 80px; height: 80px;"></div>
          
          <!-- Destino del Oficio cargado -->
          <div class="sisep-target" style="top: 35%; left: 30%;">📍</div>
          
          <!-- Pines de los oficiales geoposicionados -->
          <div class="sisep-pin green" style="top: 45%; left: 38%;" title="Oficial Aguirre (Libre)">4231</div>
          <div class="sisep-pin yellow" style="top: 25%; left: 65%;" title="Oficial Pérez (Ocupado)">4232</div>
          <div class="sisep-pin red" style="top: 30%; left: 24%;" title="Oficial Gómez (Consigna Fija)">4233</div>
          
          <svg class="sisep-map-svg" viewBox="0 0 400 300">
            <!-- Calles en el mapa de CABA -->
            <line x1="0" y1="50" x2="400" y2="50" stroke="#334155" stroke-width="2" />
            <line x1="0" y1="120" x2="400" y2="120" stroke="#334155" stroke-width="3" />
            <line x1="0" y1="210" x2="400" y2="210" stroke="#334155" stroke-width="2" />
            
            <line x1="120" y1="0" x2="120" y2="300" stroke="#334155" stroke-width="2" />
            <line x1="220" y1="0" x2="220" y2="300" stroke="#334155" stroke-width="2" />
            <line x1="310" y1="0" x2="310" y2="300" stroke="#334155" stroke-width="2" />
          </svg>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:8px;">
          <!-- Lista de patrullas y su disponibilidad en SISEP -->
          <div class="officer-row locked">
            <div style="font-size:12px;">
              <span class="officer-status-dot red"></span>
              <b>Oficial Gómez, M. (Móvil 4233)</b>
              <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Consigna Fija · Causa Restricción 102/25 (Exclusivo) · A 90m</div>
            </div>
            <span style="font-size:10.5px; font-weight:700; color:var(--red);">🔒 Consigna</span>
          </div>
          
          <div class="officer-row closest">
            <div style="font-size:12px;">
              <span class="officer-status-dot green"></span>
              <b>Oficial Aguirre, M. (Móvil 4231)</b>
              <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Libre · Patrullando móvil · A 180m</div>
            </div>
            <span class="chip chip-green" style="font-size:7px;">✓ Seleccionado</span>
          </div>
          
          <div class="officer-row">
            <div style="font-size:12px;">
              <span class="officer-status-dot yellow"></span>
              <b>Oficial Pérez, J. (Móvil 4232)</b>
              <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Ocupado (Trámite activo) · A 850m</div>
            </div>
            <span class="chip chip-amber" style="font-size:7px;">Ocupado</span>
          </div>
        </div>
      </div>
    `;
  } else {
    sisepMapWidgetHtml = `
      <div class="console-card" style="text-align:center; padding: 48px 20px; color: #64748B; flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; border: 1px dashed #334155; background: #0f172a; border-radius: 16px;">
        <span style="font-size:42px; opacity:0.5; margin-bottom:12px;">🗺️</span>
        <div style="font-weight:700; color:#fff; font-size:14px;">Consola de Monitoreo SISEP Inactiva</div>
        <div style="font-size:11.5px; color:#94A3B8; margin-top:6px; max-width:240px; line-height:1.4;">
          El sistema está a la espera de que se cargue y detecte el domicilio a constatar para geolocalizar los recursos en tiempo real.
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Columna de Oficios Recibidos en Comisaría -->
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div class="console-card" style="flex:1;">
        <div class="console-section-title">
          <span>Bandeja de Entrada de Oficios</span>
          <span style="font-size:10px; background:#334155; padding:2px 8px; border-radius:10px;">Comisaría 14-A</span>
        </div>
        <table class="console-table">
          <thead>
            <tr>
              <th>ID Oficio</th>
              <th>Trámite</th>
              <th>Sujeto</th>
              <th>Prioridad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${oficiosTabla}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Columna de Carga y Despacho Georreferenciado (SISEP) -->
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div class="console-card">
        <div class="console-section-title">Carga de Documento</div>
        ${ocrWidgetHtml}
      </div>
      
      ${sisepMapWidgetHtml}
    </div>
  `;
}

// ==========================================
// CONTROLADORES DE EVENTOS EN COMISARÍA
// ==========================================

function triggerSimulateOcr() {
  state.ocrStatus = 'scanning';
  renderApp();
  
  setTimeout(() => {
    state.ocrStatus = 'ready';
    state.ocrData = {
      id: "OF-2026-1157",
      origen: "Juzgado Penal Contravencional y de Faltas Nº 2",
      juez: "Dr. Ferreira",
      causa: "Nº 115790/26 s/ Excarcelación (Detenido)",
      tipo: "Constatación de Domicilio",
      sujeto: "ABDURRAMAN, Yamila (DNI 27.580.092)",
      direccion: "Costa Rica 4820, CABA",
      distancia: "180 metros",
      prioridad: "CRÍTICA (Urgente Detenido)",
      plazo: "4 horas (Libertad)",
      comisaria: "Comisaría Vecinal 14-A",
      estado: "Pendiente"
    };
    renderApp();
  }, 2500);
}

function dispatchOficio() {
  if (!state.ocrData) return;
  
  state.comisariaOficios.unshift({...state.ocrData});
  state.ocrStatus = null;
  state.ocrData = null;
  
  renderApp();
  
  setTimeout(() => {
    const pushEl = document.getElementById("push-notif");
    if (pushEl) {
      document.getElementById("push-title").textContent = "Nuevo Oficio Asignado ⚖";
      document.getElementById("push-text").textContent = "Constatación de Domicilio - Causa Excarcelación (Detenido) - Abdurraman, Y.";
      pushEl.classList.add("show");
      
      playBeep();
      
      setTimeout(() => {
        pushEl.classList.remove("show");
      }, 5000);
    }
  }, 1000);
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.log("Audio blocked:", e.message);
  }
}

function dismissPushNotification() {
  const pushEl = document.getElementById("push-notif");
  if (pushEl) pushEl.classList.remove("show");
}

// ==========================================
// CHAT IA DEL POLICÍA
// ==========================================

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
    input.value = "Dictando: Procedo al control del domicilio de Sergio Rocha...";
    input.focus();
  }
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById("chat-input-field");
  if (!input || !input.value.trim()) return;
  
  const text = input.value.trim();
  state.chatMessages.push({ sender: 'user', text: text });
  input.value = "";
  
  renderApp();
  
  let response = "No comprendo tu consulta en esta versión de pruebas. Probá tocando una de las etiquetas sugeridas.";
  const textLower = text.toLowerCase();
  
  if (textLower.includes("testigo") || textLower.includes("negar") || textLower.includes("firma")) {
    response = "⚖ **Protocolo ante Negativa de Testigo (CPP CABA Art. 99):**\n\nSi el testigo de actuación se niega a firmar el acta:\n1. **No anula el acta**: El acta sigue siendo válida si dejás constancia explícita de su negativa y del motivo que alegue.\n2. **Testigo Alternativo**: De ser posible, buscá un segundo testigo civil que firme en disconformidad o certifique que presenció el acto.\n3. **Justificación Fundada**: Si la zona es hostil o peligrosa, registrá en el acta y en el video del Body Cam la imposibilidad de mantener al testigo en el lugar por riesgo físico. La grabación del body cam servirá de respaldo procesal.";
  } else if (textLower.includes("plaza armenia") || textLower.includes("donde estoy") || textLower.includes("dónde estoy")) {
    response = "📍 **Ubicación Resolvida por IA:**\nTe encontrás junto a la **Plaza Armenia** en **Costa Rica 4500 (entre Malabia y Armenia)**, Comuna 14, Palermo.\n\n• **Jurisdicción:** Comisaría Vecinal 14-A.\n• **Fiscalía de Turno:** UFS (Unidad de Flagrancia Sur).\n\n¿Querés registrar tu inicio de patrullaje en esta esquina?";
  } else if (textLower.includes("hurto") || textLower.includes("162")) {
    response = "📋 **Artículo 162 del Código Penal (Hurto):**\n\n*\"Será reprimido con prisión de un mes a dos años, el que se apoderare ilegítimamente de una cosa mueble, total o parcialmente ajena, sin fuerza en las cosas ni violencia física en las personas.\"*\n\n• **Flagrancia**: Si es atrapado in fraganti, procedé a la aprehensión (CPP Art. 152) y da aviso inmediato a la UFS.";
  } else if (textLower.includes("robo") || textLower.includes("164")) {
    response = "📋 **Artículo 164 del Código Penal (Robo):**\n\n*\"Será reprimido con prisión de un mes a seis años, el que se apoderare ilegítimamente de una cosa mueble, total o parcialmente ajena, con fuerza en las cosas o violencia física en las personas...\"*\n\n• **Diferencia con Hurto**: La presencia de violencia o roturas (fuerza) califica el hecho como robo y aumenta la escala penal.";
  }
  
  setTimeout(() => {
    state.chatMessages.push({ sender: 'assistant', text: response });
    renderApp();
  }, 1000);
}

// ==========================================
// SIMULACIÓN GEOCERCA (BAP)
// ==========================================

function startMapLoop() {
  setInterval(() => {
    if (state.tab === 'mapa' && !state.alertActive) {
      if (state.agresorDist > 100) {
        state.agresorDist -= 40;
        state.agresorPinPos.left -= 2.5;
        state.agresorPinPos.top -= 1.25;
        
        renderApp();
        
        if (state.agresorDist <= 200) {
          triggerMockEmergency();
        }
      }
    }
  }, 4000);
}

function triggerMockEmergency() {
  state.alertActive = true;
  state.alertData = {
    tipo: "BOTÓN ANTIPÁNICO / GEOCERCA INFRINGIDA",
    causa: "Causa 78/26 s/ Violencia de Género",
    victima: "RÍOS, Elena Victoria (Uriarte 1428)",
    agresor: "ROCHA, Sergio Damián (DNI 32.114.897)",
    posicionAgresor: "Uriarte y Costa Rica (A 120 metros)",
    distanciaVictima: "120 metros de la víctima (Umbral de exclusión: 500m)"
  };
  renderApp();
  playAlarmSound();
}

function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, duration, time) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);
    };
    
    let now = ctx.currentTime;
    playTone(550, 0.4, now);
    playTone(440, 0.4, now + 0.4);
    playTone(550, 0.4, now + 0.8);
    playTone(440, 0.4, now + 1.2);
  } catch (e) {
    console.log("Alarm sound blocked:", e.message);
  }
}

function acceptEmergency() {
  state.alertActive = false;
  state.tab = "mapa";
  renderApp();
  setTimeout(() => {
    alert("Navegación GPS de emergencia iniciada hacia Uriarte 1428. El Móvil 4232 ha sido despachado como refuerzo de cobertura.");
  }, 100);
}

function closeEmergency() {
  state.alertActive = false;
  state.alertData = null;
  renderApp();
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
// FLUJOS DEL CELULAR DEL OFICIAL
// ==========================================

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

function renderConstatacionFlow(container, task) {
  const step = state.taskStep;
  const steps = ["Arribo", "Identificar", "Acta Voz", "Fachada", "Firma"];
  const progress = steps.map((s, i) => `<div class="progress-step ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('');
  
  let html = `
    <div class="back-btn-row"><button class="btn-back" onclick="cancelActiveTask()">← Salir de tarea</button></div>
    <div class="flow-header">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="chip chip-red">${task.tipo}</span>
        <span style="font-size:11px; font-weight:700; color:var(--text-muted);">${step + 1} de ${steps.length}</span>
      </div>
      <div class="flow-title" style="margin-top:6px;">${task.sujeto}</div>
      <div class="flow-sub">Destino: ${task.direccion}</div>
    </div>
    <div class="progress-bar" style="display:flex; gap:4px; height:4px; background:#E2E8F0; border-radius:2px; margin-bottom:14px;">
      ${progress}
    </div>
  `;
  
  if (step === 0) {
    html += `
      <div class="card">
        <div class="card-title">1. Confirmación de Arribo</div>
        <div class="card-subtitle">Cerca del lugar de la constatación.</div>
        <div class="info-row" style="display:flex; justify-content:space-between; margin-top:10px; font-size:12.5px;"><span style="color:var(--text-muted);">Ubicación</span><b>En el destino ✓</b></div>
        <div class="info-row" style="display:flex; justify-content:space-between; margin-top:4px; font-size:12.5px;"><span style="color:var(--text-muted);">Cámara de chaleco</span><span style="color:var(--green); font-weight:700;">TRANSMITIENDO</span></div>
      </div>
      <button class="btn-large success" onclick="nextStep()">Confirmar Presencia ✓</button>
    `;
  } else if (step === 1) {
    html += `
      <div class="card">
        <div class="card-title">2. Identificar Residente</div>
        <div class="card-subtitle">Escanear el DNI de la persona que abre el domicilio.</div>
      </div>
      ${state.dniScannedData ? `
        <div class="dni-card">
          <div class="dni-header">
            <span class="dni-title">RENAPER Registro Nacional</span>
            <span class="chip chip-green" style="background:#fff; color:var(--green); font-size:8px;">OK</span>
          </div>
          <div class="dni-body">
            <div class="dni-photo-mock">👤</div>
            <div class="dni-fields">
              <div class="dni-field"><span class="dni-label">Nombre</span><span class="dni-value">${state.dniScannedData.nombre}</span></div>
              <div class="dni-field"><span class="dni-label">DNI</span><span class="dni-value">${state.dniScannedData.dni}</span></div>
            </div>
          </div>
        </div>
        <button class="btn-large primary" style="margin-top:14px;" onclick="nextStep()">Continuar →</button>
      ` : `
        <div class="scanner-container">
          <div class="scanner-viewfinder"><div class="scan-line"></div></div>
          <div class="scanner-hint">Enfocar código de barras del DNI</div>
        </div>
        <button class="btn-large gold" style="margin-top:14px;" onclick="simulateDniScan('27580092')">Simular DNI Abdurraman (Excarcelación)</button>
        <button class="btn-large secondary" style="margin-top:8px;" onclick="simulateDniScan('32114897')">Simular DNI Rocha (Prisión Domiciliaria)</button>
      `}
    `;
  } else if (step === 2) {
    html += `
      <div class="card">
        <div class="card-title">3. Dictado de Acta SIPJU</div>
        <div class="card-subtitle">Dictale a la app tu informe de constatación.</div>
      </div>
      <div class="audio-recorder">
        <div class="wave-container ${state.isRecordingAudio ? 'active' : ''}">
          <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
          <div class="wave-bar"></div><div class="wave-bar"></div>
        </div>
        <button class="btn-large ${state.isRecordingAudio ? 'danger' : 'primary'}" onclick="toggleAudioRecording()">
          ${state.isRecordingAudio ? '■ Detener Grabación' : '🎤 Iniciar Dictado de Acta'}
        </button>
      </div>
      <div class="form-group">
        <textarea class="form-textarea" id="acta-text" rows="4">${state.audioTranscript}</textarea>
      </div>
      <button class="btn-large primary" onclick="saveTranscriptAndNext()">Guardar y Seguir →</button>
    `;
  } else if (step === 3) {
    html += `
      <div class="card">
        <div class="card-title">4. Fotografía de Fachada</div>
        <div class="card-subtitle">Se requiere registrar imagen de la puerta con geolocalización.</div>
      </div>
      ${state.fotoFachadaCaptured ? `
        <div class="scanner-container" style="background:var(--green-bg); color:var(--green);">
          <span style="font-size:36px;">✓</span>
          <div style="font-weight:700;">Foto guardada y hasheada</div>
        </div>
        <button class="btn-large primary" style="margin-top:14px;" onclick="nextStep()">Continuar →</button>
      ` : `
        <div class="scanner-container" style="cursor:pointer;" onclick="simulateFotoCapture()">
          <span style="font-size:36px;">📷</span>
          <div style="font-weight:700; margin-top:8px;">Hacé clic para capturar foto de puerta</div>
        </div>
      `}
    `;
  } else if (step === 4) {
    html += `
      <div class="card">
        <div class="card-title">5. Conformidad y Cierre</div>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre del Testigo</label>
        <input type="text" class="form-input" placeholder="Ej: Abdurraman Yamila" value="${state.witnessName}" onchange="state.witnessName=this.value">
      </div>
      <div class="card" style="padding:10px; margin-bottom:12px;">
        <button class="btn-large ${state.witnessOtpVerified ? 'success' : 'secondary'}" style="height:36px; font-size:12px;" onclick="simulateSmsOtp()">
          ${state.witnessOtpVerified ? '✓ Código SMS Verificado' : '📲 Firmar por SMS OTP'}
        </button>
      </div>
      <div class="sig-pad-box ${state.isSignatureSigned ? 'signed' : ''}" onclick="simulateSignature()">
        ${state.isSignatureSigned ? '✓ Firma Registrada' : 'Firma digital del testigo acá (Clic)'}
      </div>
      <button class="btn-large success" onclick="finalizeTask('${task.id}')">Confirmar y Cerrar Constatación ✓</button>
    `;
  }
  container.innerHTML = html;
}

function renderProbationFlow(container, task) {
  const step = state.taskStep;
  let html = `
    <div class="back-btn-row"><button class="btn-back" onclick="cancelActiveTask()">← Volver</button></div>
    <div class="flow-header">
      <span class="chip chip-purple">${task.tipo}</span>
      <div class="flow-title" style="margin-top:6px;">${task.sujeto}</div>
    </div>
  `;
  if (step === 0) {
    html += `
      <div class="card">
        <div class="card-title">Constatación de Conducta</div>
        <div class="card-subtitle">Verificar permanencia obligatoria en domicilio.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Sujeto Presente</label>
        <select class="form-select" id="prob-pres">
          <option>Sí, se encuentra en el domicilio</option>
          <option>No, no responde o está ausente</option>
        </select>
      </div>
      <button class="btn-large success" onclick="finalizeProbation()">Enviar Reporte a Fiscalía ✓</button>
    `;
  }
  container.innerHTML = html;
}

function renderFeVidaFlow(container, task) {
  const step = state.taskStep;
  let html = `
    <div class="back-btn-row"><button class="btn-back" onclick="cancelActiveTask()">← Volver</button></div>
    <div class="flow-header">
      <span class="chip chip-amber">${task.tipo}</span>
      <div class="flow-title" style="margin-top:6px;">${task.sujeto}</div>
    </div>
  `;
  if (step === 0) {
    html += `
      <div class="card">
        <div class="card-title">Cotejo Biométrico del Vecino</div>
        <div class="card-subtitle">Valida la supervivencia en domicilio.</div>
      </div>
      <button class="btn-large gold" onclick="simulateDniScan('10443219')">1. Escanear DNI del Ciudadano</button>
      ${state.dniScannedData ? `
        <div class="dni-card" style="margin-top:10px;">
          <div class="dni-body">
            <div class="dni-photo-mock">👴</div>
            <div class="dni-fields">
              <div class="dni-value">BERMÚDEZ, Juan Manuel</div>
              <div class="dni-value">DNI: 10.443.219</div>
            </div>
          </div>
        </div>
        <button class="btn-large success" style="margin-top:14px;" onclick="finalizeFeVida()">Emitir Supervivencia ANSES ✓</button>
      ` : ''}
    `;
  }
  container.innerHTML = html;
}

// Helpers del Flujo del Celular
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

function toggleAudioRecording() {
  state.isRecordingAudio = !state.isRecordingAudio;
  if (state.isRecordingAudio) {
    state.audioTranscript = "Escuchando...";
    renderApp();
    
    let texts = [
      "Siendo las 15:48 hs, me constituyo en el domicilio de Costa Rica 4820...",
      "Siendo las 15:48 hs, me constituyo en el domicilio de Costa Rica 4820, procedo a llamar al timbre...",
      "Siendo las 15:48 hs, me constituyo en el domicilio de Costa Rica 4820, procedo a llamar al timbre y soy atendido por Yamila Abdurraman, quien acredita identidad."
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      if (!state.isRecordingAudio) {
        clearInterval(interval);
        return;
      }
      state.audioTranscript = texts[i];
      i++;
      renderApp();
      if (i >= texts.length) {
        clearInterval(interval);
        state.isRecordingAudio = false;
        renderApp();
      }
    }, 1500);
  }
}

function saveTranscriptAndNext() {
  const ta = document.getElementById("acta-text");
  if (ta) state.audioTranscript = ta.value;
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
  state.witnessOtpVerified = true;
  state.witnessOtpSent = true;
  renderApp();
}

function finalizeTask(id) {
  const task = state.comisariaOficios.find(o => o.id === id);
  if (task) task.estado = "Completada";
  
  state.tab = "tareas";
  state.activeTask = null;
  
  const contentEl = document.getElementById("app-content");
  contentEl.innerHTML = `
    <div class="success-screen">
      <div class="success-icon-wrap">✓</div>
      <h2 class="success-title">Constatación Exitosa</h2>
      <p class="success-desc">El acta de constatación Nº ${id} fue firmada digitalmente y transmitida de forma segura a través del sistema EJE de CABA.</p>
      <button class="btn-large primary" onclick="switchTab('tareas')">Volver a mis tareas</button>
    </div>
  `;
}

function finalizeProbation() {
  state.tab = "tareas";
  state.activeTask = null;
  const contentEl = document.getElementById("app-content");
  contentEl.innerHTML = `
    <div class="success-screen">
      <div class="success-icon-wrap" style="background:var(--purple-bg); color:var(--purple);">✓</div>
      <h2 class="success-title">Control Guardado</h2>
      <p class="success-desc">El control de conducta de Sergio Rocha fue enviado al Juzgado Penal Contravencional y de Faltas Nº 12.</p>
      <button class="btn-large primary" onclick="switchTab('tareas')">Volver a tareas</button>
    </div>
  `;
}

function finalizeFeVida() {
  state.tab = "fe_vida";
  state.activeTask = null;
  const contentEl = document.getElementById("app-content");
  contentEl.innerHTML = `
    <div class="success-screen">
      <div class="success-icon-wrap" style="background:var(--amber-bg); color:var(--amber);">✓</div>
      <h2 class="success-title">Fe de Vida Validada</h2>
      <p class="success-desc">La supervivencia fue verificada y enviada a la base de datos de ANSES de manera automática.</p>
      <button class="btn-large primary" onclick="switchTab('fe_vida')">Volver</button>
    </div>
  `;
}

// ==========================================
// RENDER EMERGENCY ALERT MODAL
// ==========================================

function renderEmergencyModal() {
  const modalId = "emergency-modal-container";
  let modalEl = document.getElementById(modalId);
  
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = modalId;
    document.body.appendChild(modalEl);
  }
  
  modalEl.innerHTML = `
    <div class="emergency-alert">
      <div class="alert-dialog">
        <div class="alert-icon-ring">🚨</div>
        <h2 class="alert-title">¡ALERTA PERIMETRAL VIGENTE!</h2>
        <p class="alert-desc">
          El dispositivo de monitoreo (Tobillera GPS) reporta infracción del límite perimetral en tu cuadrante de patrullaje.
        </p>
        <div class="alert-meta-box">
          <div class="alert-meta-row"><b>Víctima:</b> <span>Elena Ríos (Uriarte 1428)</span></div>
          <div class="alert-meta-row"><b>Agresor:</b> <span style="color:var(--red); font-weight:700;">Sergio Rocha</span></div>
          <div class="alert-meta-row"><b>Estado:</b> <span style="color:var(--red); font-weight:700;">INFRINGIDO</span></div>
          <div class="alert-meta-row"><b>Distancia:</b> <span>A ${state.agresorDist}m de la víctima (Umbral: 500m)</span></div>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn-large danger" onclick="acceptEmergency()">Aceptar Despacho e Intervenir ➔</button>
          <button class="btn-large secondary" onclick="closeEmergency()">Apoyo Despachado / Descartar</button>
        </div>
      </div>
    </div>
  `;
}

function renderEmergencyAlert() {
  // Sobrescribe renderEmergencyAlert heredado para usar renderEmergencyModal
  triggerMockEmergency();
}
