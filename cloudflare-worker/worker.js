// monitor-ipp - Cloudflare Worker
// Detecta ingresos de habeas corpus en EJE (Poder Judicial CABA)
// y envia alertas a Telegram. Reemplazo del cron de GitHub Actions.
//
// Bindings esperados (configurados en el dashboard de Cloudflare):
//   - MONITOR_KV       (KV Namespace): guarda el set de cuijs conocidos
//   - TELEGRAM_TOKEN   (Secret):       token del bot
//   - TELEGRAM_CHAT_ID (Secret):       chat_id del canal Alertas Habeas
//
// Trigger: Cron schedule "*/5 * * * *" (cada 5 minutos, real)

const INICIO_MONITOREO_MS = new Date('2026-04-14T00:00:00-03:00').getTime();
const API_URL = 'https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/lista';
const ENCAB_URL = 'https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/encabezado';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(chequear(env));
  },
  async fetch(request, env, ctx) {
    return new Response('monitor-ipp activo. Corre por cron cada 5 minutos.\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
};

async function obtenerLista() {
  const filter = JSON.stringify({ identificador: 'habeas corpus', causas: '0' });
  const info = JSON.stringify({ filter, tipoBusqueda: 'CAU', page: 0, size: 10 });
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
  const idsConocidos = await cargarConocidos(env);
  let lista;
  try {
    lista = await obtenerLista();
  } catch (e) {
    console.log('Error lista:', e.message);
    return;
  }
  const items = lista.content || [];
  const encabezados = await Promise.all(
    items.map(i => obtenerEncabezado(i.expId).catch(() => null))
  );
  const causasNuevas = [];
  for (const enc of encabezados) {
    if (!enc) continue;
    const cuij = enc.cuij || String(enc.expedienteId || '');
    const tipo = enc.tipoExpediente || '?';
    if (idsConocidos.has(cuij)) continue;
    const ts = enc.fechaInicio || 0;
    if (ts && ts >= INICIO_MONITOREO_MS) {
      causasNuevas.push({
        cuij,
        identificador: `${tipo} ${cuij}`,
        caratula: enc.caratula || '',
        fecha: fechaAR(ts)
      });
      console.log(`NUEVA: ${tipo} ${cuij} - ${enc.caratula}`);
    } else {
      idsConocidos.add(cuij);
    }
  }
  if (causasNuevas.length === 0) {
    console.log(`Sin causas nuevas. Total en EJE: ${lista.totalElements}`);
    await guardarConocidos(env, idsConocidos);
    return;
  }
  let ok = 0;
  for (const c of causasNuevas) {
    const msg = `NUEVA CAUSA HABEAS CORPUS\n${c.identificador}\n${c.caratula}\nFecha inicio: ${c.fecha}\nhttps://eje.juscaba.gob.ar/iol-ui/p/expedientes`;
    try {
      await enviarTelegram(env, msg);
      idsConocidos.add(c.cuij);
      ok++;
    } catch (e) {
      console.log(`Error Telegram ${c.cuij}: ${e.message}`);
    }
  }
  console.log(`Resultado: telegram=${ok}/${causasNuevas.length}`);
  await guardarConocidos(env, idsConocidos);
}
