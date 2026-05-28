// monitor-ipp - Cloudflare Worker
// Detecta ingresos de habeas corpus en EJE (Poder Judicial CABA)
// y envia alertas a Telegram. Reemplazo del cron de GitHub Actions.
//
// Bindings esperados (configurados en el dashboard de Cloudflare):
//   - MONITOR_KV       (KV Namespace): guarda el set de expIds y cuijs conocidos
//   - TELEGRAM_TOKEN   (Secret):       token del bot
//   - TELEGRAM_CHAT_ID (Secret):       chat_id del canal Alertas Habeas
//
// Trigger: Cron schedule "*/5 * * * *" (cada 5 minutos, real)

const INICIO_MONITOREO_MS = new Date('2026-04-14T00:00:00-03:00').getTime();
const API_URL = 'https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/lista';
const ENCAB_URL = 'https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/encabezado';
const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const MAX_SUBREQUESTS = 40; // Límite de seguridad para el plan gratuito (límite real es 50)

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(chequear(env));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/run') {
      try {
        const res = await chequear(env);
        return new Response(JSON.stringify(res, null, 2), {
          headers: { 'content-type': 'application/json; charset=utf-8' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }, null, 2), {
          status: 500,
          headers: { 'content-type': 'application/json; charset=utf-8' }
        });
      }
    }
    return new Response('monitor-ipp activo. Corre por cron cada 5 minutos. Hacé GET /run para forzar un chequeo y ver el log.\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
};

async function obtenerLista(page = 0, size = PAGE_SIZE) {
  const filter = JSON.stringify({ identificador: 'habeas corpus', causas: '0' });
  const info = JSON.stringify({ filter, tipoBusqueda: 'CAU', page, size });
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `info=${encodeURIComponent(info)}`
  });
  if (!r.ok) throw new Error(`obtenerLista HTTP ${r.status}`);
  return await r.json();
}

async function obtenerEncabezado(expId) {
  const r = await fetch(`${ENCAB_URL}?expId=${expId}`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!r.ok) return null;
  return await r.json();
}

async function enviarTelegram(env, mensaje) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: mensaje })
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Telegram HTTP ${r.status}: ${t.slice(0, 200)}`);
  }
}

async function cargarConocidos(env) {
  const v = await env.MONITOR_KV.get('known_ids');
  if (!v) return new Set();
  try { return new Set(JSON.parse(v)); } catch { return new Set(); }
}

async function guardarConocidos(env, ids) {
  await env.MONITOR_KV.put('known_ids', JSON.stringify([...ids].sort()));
}

function fechaAR(ms) {
  const d = new Date(ms - 3 * 3600 * 1000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

async function chequear(env) {
  const log = [];
  const print = (msg) => {
    console.log(msg);
    log.push(msg);
  };

  let subrequestsCount = 0;
  const idsConocidos = await cargarConocidos(env);
  const causasNuevas = [];
  let stopChecking = false;
  let totalCausas = 0;

  print("Iniciando chequeo optimizado de causas...");

  for (let page = 0; page < MAX_PAGES; page++) {
    if (stopChecking) break;

    print(`Obteniendo causas de la página ${page}...`);
    subrequestsCount++;
    let data;
    try {
      data = await obtenerLista(page, PAGE_SIZE);
    } catch (e) {
      print(`Error al obtener lista de causas en pág ${page}: ${e.message}`);
      return { success: false, log, error: e.message };
    }

    const items = data.content || [];
    if (page === 0) {
      totalCausas = data.totalElements || 0;
      print(`Total de causas reportadas en EJE: ${totalCausas}`);
    }

    if (items.length === 0) {
      print("No se encontraron más causas.");
      break;
    }

    for (const item of items) {
      const expId = item.expId;
      const expIdStr = String(expId);

      // 1. Si el expId ya es conocido, paramos la búsqueda
      // (Dado que la lista viene ordenada descendente por expId/fecha de inicio,
      // encontrarse con un expId conocido significa que todos los anteriores ya se procesaron)
      if (idsConocidos.has(expIdStr) || idsConocidos.has(expId)) {
        print(`Causa conocida encontrada (${expIdStr}). Deteniendo búsqueda de causas nuevas.`);
        stopChecking = true;
        break;
      }

      // 2. Control de límite de subrequests
      if (subrequestsCount >= MAX_SUBREQUESTS) {
        print(`Llegamos al límite de subrequests seguras (${subrequestsCount}). Guardando progreso y posponiendo el resto.`);
        stopChecking = true;
        break;
      }

      // 3. Consultar el encabezado de la causa
      print(`Consultando encabezado para expId ${expId}...`);
      subrequestsCount++;
      let enc;
      try {
        enc = await obtenerEncabezado(expId);
      } catch (e) {
        print(`Error al obtener encabezado de ${expId}: ${e.message}`);
        continue;
      }

      if (!enc) {
        print(`Encabezado nulo para expId ${expId}.`);
        continue;
      }

      const cuij = enc.cuij || String(enc.expedienteId || '');
      const tipo = enc.tipoExpediente || '?';

      // Verificar si el CUIJ es conocido (por si fue guardado bajo el formato viejo de CUIJs)
      if (idsConocidos.has(cuij)) {
        print(`Causa conocida por CUIJ (${cuij}). Asociando expId ${expIdStr} a conocidos.`);
        idsConocidos.add(expIdStr);
        continue;
      }

      const ts = enc.fechaInicio || 0;
      if (ts && ts >= INICIO_MONITOREO_MS) {
        causasNuevas.push({
          expId: expIdStr,
          cuij,
          identificador: `${tipo} ${cuij}`,
          caratula: enc.caratula || '',
          fecha: fechaAR(ts)
        });
        print(`NUEVA DETECTADA: ${tipo} ${cuij} - ${enc.caratula} (expId: ${expIdStr})`);
      } else {
        // Causa anterior a la fecha de inicio del monitoreo: la marcamos como conocida y
        // como está ordenada descendente, todas las posteriores también serán anteriores
        print(`Causa ${cuij} anterior a inicio de monitoreo (${fechaAR(ts)}). Deteniendo búsqueda.`);
        idsConocidos.add(expIdStr);
        if (cuij) idsConocidos.add(cuij);
        stopChecking = true;
        break;
      }
    }

    if (items.length < PAGE_SIZE) {
      break;
    }
  }

  if (causasNuevas.length === 0) {
    print(`Chequeo finalizado. Sin causas nuevas.`);
    await guardarConocidos(env, idsConocidos);
    return { success: true, log, nuevas: 0, total: totalCausas, subrequests: subrequestsCount };
  }

  // Notificar las nuevas causas
  let ok = 0;
  for (const c of causasNuevas) {
    if (subrequestsCount >= MAX_SUBREQUESTS + 5) { // Pequeño margen para Telegram
      print(`Llegamos al límite estricto de subrequests. Quedan causas pendientes de notificar.`);
      break;
    }

    const msg = `NUEVA CAUSA HABEAS CORPUS\n${c.identificador}\n${c.caratula}\nFecha inicio: ${c.fecha}\nhttps://eje.juscaba.gob.ar/iol-ui/p/expedientes`;
    subrequestsCount++;
    try {
      await enviarTelegram(env, msg);
      idsConocidos.add(c.expId);
      if (c.cuij) idsConocidos.add(c.cuij);
      ok++;
      print(`Notificación enviada a Telegram para ${c.cuij}`);
    } catch (e) {
      print(`Error al enviar a Telegram para ${c.cuij}: ${e.message}`);
    }
  }

  print(`Resultado: Telegram enviados = ${ok}/${causasNuevas.length}. Subrequests realizadas: ${subrequestsCount}`);
  await guardarConocidos(env, idsConocidos);
  return {
    success: true,
    log,
    nuevas: causasNuevas.length,
    enviados: ok,
    total: totalCausas,
    subrequests: subrequestsCount
  };
}
