import requests
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

GMAIL_USUARIO = "alfonso.palmou@gmail.com"
GMAIL_PASSWORD = "bali gwoo sciz iqln"
DESTINATARIO = "alfonso.palmou@gmail.com"
INICIO_MONITOREO = datetime(2026, 4, 14)
TELEGRAM_TOKEN = "8432956511:AAE7JqxoDTkXN8_P8wFUzKOGNooSRES0j7k"
TELEGRAM_CHAT_ID = "228557280"
API_URL = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/lista"
ENCAB_URL = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/encabezado"
HEADERS = {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"}
ids_conocidos = set()


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
        msg = MIMEMultipart("alternative")
    msg["Subject"] = "Nueva causa Habeas Corpus - " + datetime.now().strftime("%d/%m/%Y %H:%M")
    msg["From"] = GMAIL_USUARIO
    msg["To"] = DESTINATARIO
    cuerpo = "Causas nuevas detectadas en el EJE:\n\n"
    for c in causas_nuevas:
                cuerpo += " - " + c["identificador"] + "\n"
                cuerpo += "   Caratula: " + c["caratula"] + "\n"
                cuerpo += "   Fecha: " + c["fecha"] + "\n"
                cuerpo += "   Ver: https://eje.juscaba.gob.ar/iol-ui/p/expedientes\n\n"
            msg.attach(MIMEText(cuerpo, "plain"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(GMAIL_USUARIO, GMAIL_PASSWORD)
                server.sendmail(GMAIL_USUARIO, DESTINATARIO, msg.as_string())


def chequear():
        print("[" + datetime.now().strftime("%d/%m/%Y %H:%M:%S") + "] Chequeando...")
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
                    ids_conocidos.add(cuij)
        fecha_ts = enc.get("fechaInicio", 0)
        if fecha_ts:
                        fecha_dt = datetime.fromtimestamp(fecha_ts / 1000)
    else:
            fecha_dt = None
        if fecha_dt and fecha_dt >= INICIO_MONITOREO:
                        causas_nuevas.append({
                                            "identificador": tipo + " " + cuij,
                                            "caratula": enc.get("caratula", ""),
                                            "fecha": fecha_dt.strftime("%d/%m/%Y %H:%M")
                        })
                        print("  NUEVA: " + tipo + " " + cuij + " - " + enc.get("caratula", ""))
                if causas_nuevas:
                            enviar_mail(causas_nuevas)
                            for c in causas_nuevas:
                                            msg = "NUEVA CAUSA HABEAS CORPUS\n" + c["identificador"] + "\n" + c["caratula"] + "\nFecha: " + c["fecha"] + "\nhttps://eje.juscaba.gob.ar/iol-ui/p/expedientes"
                                            enviar_telegram(msg)
                else:
                            print("Sin causas nuevas. Total en EJE: " + str(lista["totalElements"]))


print("Iniciando monitoreo...")
try:
        chequear()
except Exception as e:
    print("Error 1: " + str(e))
try:
        chequear()
except Exception as e:
    print("Error 2: " + str(e))
