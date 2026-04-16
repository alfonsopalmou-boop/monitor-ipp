import requests
import smtplib
import json
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta

GMAIL_USUARIO = "alfonso.palmou@gmail.com"
GMAIL_PASSWORD = "bali gwoo sciz iqln"
DESTINATARIO = "alfonso.palmou@gmail.com"
INICIO_MONITOREO = datetime(2026, 4, 14)
TELEGRAM_TOKEN = "8432956511:AAE7JqxoDTkXN8_P8wFUzKOGNooSRES0j7k"
TELEGRAM_CHAT_ID = "228557280"
API_URL = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/lista"
ENCAB_URL = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/encabezado"
HEADERS = {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"}

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


def obtener_lista():
    body = {"info": json.dumps({
        "filter": json.dumps({"identificador": "habeas corpus", "causas": "0"}),
        "tipoBusqueda": "CAU",
        "page": 0,
        "size": 10
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
    requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": mensaje}, timeout=10)


def enviar_mail(causas_nuevas):
    ahora = datetime.now(AR_TZ)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Nueva causa Habeas Corpus - " + ahora.strftime("%d/%m/%Y %H:%M")
    msg["From"] = GMAIL_USUARIO
    msg["To"] = DESTINATARIO
    cuerpo = "Causas nuevas detectadas en el EJE:\n\n"
    for c in causas_nuevas:
        cuerpo += " - " + c["identificador"] + "\n"
        cuerpo += "   Caratula: " + c["caratula"] + "\n"
        cuerpo += "   Fecha inicio: " + c["fecha"] + "\n"
        cuerpo += "   Ver: https://eje.juscaba.gob.ar/iol-ui/p/expedientes\n\n"
    msg.attach(MIMEText(cuerpo, "plain"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USUARIO, GMAIL_PASSWORD)
        server.sendmail(GMAIL_USUARIO, DESTINATARIO, msg.as_string())


def chequear(ids_conocidos):
    ahora = datetime.now(AR_TZ)
    print("[" + ahora.strftime("%d/%m/%Y %H:%M:%S") + " AR] Chequeando...")
    lista = obtener_lista()
    exp_ids = [e["expId"] for e in lista["content"]]
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
            ids_conocidos.add(cuij)
            causas_nuevas.append({
                "identificador": tipo + " " + cuij,
                "caratula": enc.get("caratula", ""),
                "fecha": fecha_dt.strftime("%d/%m/%Y")
            })
            print("  NUEVA: " + tipo + " " + cuij + " - " + enc.get("caratula", ""))
        else:
            ids_conocidos.add(cuij)
    if causas_nuevas:
        enviar_mail(causas_nuevas)
        for c in causas_nuevas:
            msg = "NUEVA CAUSA HABEAS CORPUS\n" + c["identificador"] + "\n" + c["caratula"] + "\nFecha inicio: " + c["fecha"] + "\nhttps://eje.juscaba.gob.ar/iol-ui/p/expedientes"
            enviar_telegram(msg)
    else:
        print("Sin causas nuevas. Total en EJE: " + str(lista["totalElements"]))
    return ids_conocidos


print("Iniciando monitoreo...")
ids_conocidos = cargar_conocidos()
try:
    ids_conocidos = chequear(ids_conocidos)
except Exception as e:
    print("Error: " + str(e))
guardar_conocidos(ids_conocidos)
print("IDs conocidos guardados: " + str(len(ids_conocidos)))
