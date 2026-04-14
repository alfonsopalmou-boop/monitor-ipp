import requests
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# ── CONFIGURACIÓN ──────────────────────────────────────────────
GMAIL_USUARIO  = "alfonso.palmou@gmail.com"   # el Gmail desde el que se envía
GMAIL_PASSWORD = "bali gwoo sciz iqln"        # contraseña de aplicación (ver abajo)
DESTINATARIO   = "alfonso.palmou@gmail.com"
INICIO_MONITOREO = datetime(2026, 4, 14)  # solo IPPs desde esta fecha
# ───────────────────────────────────────────────────────────────

API_URL    = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/lista"
ENCAB_URL  = "https://eje.juscaba.gob.ar/iol-api/api/public/expedientes/encabezado"
HEADERS    = {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"}

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

def enviar_mail(ipps_nuevas):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🚨 Nueva IPP detectada - Habeas Corpus ({datetime.now().strftime('%d/%m/%Y %H:%M')})"
    msg["From"]    = GMAIL_USUARIO
    msg["To"]      = DESTINATARIO

    cuerpo = "Se detectaron las siguientes IPPs nuevas en el EJE:\n\n"
    for ipp in ipps_nuevas:
        cuerpo += f"  ▶ {ipp['identificador']}\n"
        cuerpo += f"     Carátula: {ipp['caratula']}\n"
        cuerpo += f"     Fecha inicio: {ipp['fecha']}\n"
        cuerpo += f"     Ver en EJE: https://eje.juscaba.gob.ar/iol-ui/p/expedientes\n\n"

    msg.attach(MIMEText(cuerpo, "plain"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USUARIO, GMAIL_PASSWORD)
        server.sendmail(GMAIL_USUARIO, DESTINATARIO, msg.as_string())

    print(f"  ✉ Mail enviado a {DESTINATARIO}")

def chequear():
    print(f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] Chequeando...")
    lista = obtener_lista()
    exp_ids = [e["expId"] for e in lista["content"]]
    ipps_nuevas = []

    for exp_id in exp_ids:
        enc = obtener_encabezado(exp_id)
        if not enc or enc.get("tipoExpediente") != "IPP":
            continue

        cuij = enc.get("cuij", str(exp_id))
        if cuij in ids_conocidos:
            continue

        ids_conocidos.add(cuij)

        fecha_ts = enc.get("fechaInicio", 0)
        fecha_dt = datetime.fromtimestamp(fecha_ts / 1000) if fecha_ts else None

        if fecha_dt and fecha_dt >= INICIO_MONITOREO:
            ipps_nuevas.append({
                "identificador": f"IPP {cuij}",
                "caratula": enc.get("caratula", ""),
                "fecha": fecha_dt.strftime("%d/%m/%Y %H:%M")
            })
            print(f"  🚨 NUEVA IPP: IPP {cuij} — {enc.get('caratula', '')}")

    if ipps_nuevas:
        enviar_mail(ipps_nuevas)
    else:
        print(f"  Sin nuevas IPPs. Total causas: {lista['totalElements']}")

# ── INICIO ─────────────────────────────────────────────────────
print("Chequeando IPPs nuevas...")
try:
    chequear()
except Exception as e:
    print(f"Error: {e}")
