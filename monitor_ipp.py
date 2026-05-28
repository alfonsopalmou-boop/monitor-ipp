import requests
import json
import os
import sys
from datetime import datetime, timezone, timedelta

TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
INICIO_MONITOREO = datetime(2026, 4, 14)
API_URL = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/lista"
ENCAB_URL = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/encabezado"
HEADERS = {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"}

PAGE_SIZE = 50
MAX_PAGES = 10

AR_TZ = timezone(timedelta(hours=-3))
KNOWN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "known_ids.json")


def cargar_conocidos():
    if os.path.exists(KNOWN_FILE):
        with open(KNOWN_FILE, "r") as f:
            return set(json.load(f))
    return set()


def guardar_conocidos(ids):
    with open(KNOWN_FILE, "w") as f:
        json.dump(sorted(ids), f)


def obtener_lista(page=0, size=PAGE_SIZE):
    body = {"info": json.dumps({
        "filter": json.dumps({"identificador": "habeas corpus", "causas": "0"}),
        "tipoBusqueda": "CAU",
        "page": page,
        "size": size
    })}
    r = requests.post(API_URL, data=body, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


def obtener_todas_las_causas():
    """Pagina sobre la API hasta obtener todas las causas."""
    todas = []
    total = None
    for page in range(MAX_PAGES):
        data = obtener_lista(page=page, size=PAGE_SIZE)
        items = data.get("content", [])
        if total is None:
            total = data.get("totalElements", 0)
            print("Total de causas en EJE: " + str(total))
        todas.extend(items)
        if len(todas) >= total or len(items) < PAGE_SIZE:
            break
    print("Causas obtenidas: " + str(len(todas)))
    return todas, total


def obtener_encabezado(exp_id):
    r = requests.get(ENCAB_URL, params={"expId": exp_id}, headers=HEADERS, timeout=10)
    if r.status_code == 200:
        return r.json()
    return None


def enviar_telegram(mensaje):
    url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage"
    r = requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": mensaje}, timeout=10)
    r.raise_for_status()


def chequear(ids_conocidos):
    ahora = datetime.now(AR_TZ)
    print("[" + ahora.strftime("%d/%m/%Y %H:%M:%S") + " AR] Chequeando...")
    items, total = obtener_todas_las_causas()
    exp_ids = [e["expId"] for e in items]
    causas_nuevas = []
    for exp_id in exp_ids:
        enc = obtener_encabezado(exp_id)
        if not enc:
            continue
        tipo = enc.get("tipoExpediente", "?")
        cuij = enc.get("cuij", str(exp_id))
        print("  " + tipo + " " + cuij)
        if cuij in ids_conocidos:
            continue
        fecha_ts = enc.get("fechaInicio", 0)
        if fecha_ts:
            fecha_dt = datetime.fromtimestamp(fecha_ts / 1000, tz=AR_TZ)
        else:
            fecha_dt = None
        if fecha_dt and fecha_dt >= INICIO_MONITOREO.replace(tzinfo=AR_TZ):
            causas_nuevas.append({
                "cuij": cuij,
                "identificador": tipo + " " + cuij,
                "caratula": enc.get("caratula", ""),
                "fecha": fecha_dt.strftime("%d/%m/%Y")
            })
            print("  NUEVA: " + tipo + " " + cuij + " - " + enc.get("caratula", ""))
        else:
            ids_conocidos.add(cuij)
    if not causas_nuevas:
        print("Sin causas nuevas. Total en EJE: " + str(total))
        return ids_conocidos
    telegram_ok = 0
    for c in causas_nuevas:
        msg = "NUEVA CAUSA HABEAS CORPUS\n" + c["identificador"] + "\n" + c["caratula"] + "\nFecha inicio: " + c["fecha"] + "\nhttps://eje.juscaba.gob.ar/iol-ui/p/expedientes"
        try:
            enviar_telegram(msg)
            telegram_ok += 1
            ids_conocidos.add(c["cuij"])
        except Exception as e:
            print("  Error Telegram " + c["cuij"] + ": " + str(e))
    print("Resultado: telegram=" + str(telegram_ok) + "/" + str(len(causas_nuevas)))
    return ids_conocidos


print("Iniciando monitoreo...")
ids_conocidos = cargar_conocidos()
try:
    ids_conocidos = chequear(ids_conocidos)
except Exception as e:
    print("Error fatal: " + str(e))
    guardar_conocidos(ids_conocidos)
    sys.exit(1)
guardar_conocidos(ids_conocidos)
print("IDs conocidos guardados: " + str(len(ids_conocidos)))
