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
            try:
                return set(json.load(f))
            except Exception:
                return set()
    return set()


def guardar_conocidos(ids):
    with open(KNOWN_FILE, "w") as f:
        json.dump(sorted(list(ids)), f)


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
    
    causas_nuevas = []
    stop_checking = False
    total_elements = 0
    
    for page in range(MAX_PAGES):
        if stop_checking:
            break
            
        print(f"Obteniendo causas de la página {page}...")
        data = obtener_lista(page=page, size=PAGE_SIZE)
        items = data.get("content", [])
        
        if page == 0:
            total_elements = data.get("totalElements", 0)
            print("Total de causas en EJE: " + str(total_elements))
            
        if not items:
            print("No se encontraron más causas.")
            break
            
        for item in items:
            exp_id = item.get("expId")
            exp_id_str = str(exp_id)
            
            # 1. Si el expId ya es conocido, paramos la búsqueda
            # (Dado que la lista viene ordenada descendente, todos los siguientes ya se procesaron)
            if exp_id_str in ids_conocidos or exp_id in ids_conocidos:
                print(f"Causa conocida encontrada ({exp_id_str}). Deteniendo búsqueda.")
                stop_checking = True
                break
                
            # 2. Consultar el encabezado
            print(f"Consultando encabezado para expId {exp_id}...")
            enc = obtener_encabezado(exp_id)
            if not enc:
                continue
                
            tipo = enc.get("tipoExpediente", "?")
            cuij = enc.get("cuij", str(exp_id))
            
            # Verificar si el CUIJ es conocido (por transición de formato)
            if cuij in ids_conocidos:
                print(f"Causa conocida por CUIJ ({cuij}). Asociando expId {exp_id_str} a conocidos.")
                ids_conocidos.add(exp_id_str)
                continue
                
            fecha_ts = enc.get("fechaInicio", 0)
            if fecha_ts:
                fecha_dt = datetime.fromtimestamp(fecha_ts / 1000, tz=AR_TZ)
            else:
                fecha_dt = None
                
            if fecha_dt and fecha_dt >= INICIO_MONITOREO.replace(tzinfo=AR_TZ):
                causas_nuevas.append({
                    "expId": exp_id_str,
                    "cuij": cuij,
                    "identificador": tipo + " " + cuij,
                    "caratula": enc.get("caratula", ""),
                    "fecha": fecha_dt.strftime("%d/%m/%Y")
                })
                print("  NUEVA DETECTADA: " + tipo + " " + cuij + " - " + enc.get("caratula", "") + f" (expId: {exp_id_str})")
            else:
                # Causa anterior a inicio del monitoreo: detenemos búsqueda
                print(f"Causa {cuij} anterior a inicio de monitoreo. Deteniendo búsqueda.")
                ids_conocidos.add(exp_id_str)
                if cuij:
                    ids_conocidos.add(cuij)
                stop_checking = True
                break
                
        if len(items) < PAGE_SIZE:
            break
            
    if not causas_nuevas:
        print("Sin causas nuevas. Total en EJE: " + str(total_elements))
        return ids_conocidos
        
    telegram_ok = 0
    for c in causas_nuevas:
        msg = "NUEVA CAUSA HABEAS CORPUS\n" + c["identificador"] + "\n" + c["caratula"] + "\nFecha inicio: " + c["fecha"] + "\nhttps://eje.juscaba.gob.ar/iol-ui/p/expedientes"
        try:
            enviar_telegram(msg)
            telegram_ok += 1
            ids_conocidos.add(c["expId"])
            if c["cuij"]:
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
