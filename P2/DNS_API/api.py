# Código obtenido de https://www.freecodecamp.org/news/how-to-get-started-with-firebase-using-python/
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db, firestore
import base64

cred = credentials.Certificate("dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json")
firebase_admin.initialize_app(
    cred, {"databaseURL": "https://dnsfire-8c6fd-default-rtdb.firebaseio.com/"}
)

firestore_client = firestore.client()

from flask import Flask, request, render_template_string, jsonify
from flask_cors import CORS
import logging
import random
import requests
import ipaddress
import socket
from geopy.distance import geodesic
import os
import threading
import time

zonal_caches = {}
zonal_caches_lock = threading.Lock()


def update_zonal_caches():
    global zonal_caches
    global zonal_caches_lock
    while True:
        try:
            new_zonal_caches = {}
            snapshot = firestore_client.collection("zonal_caches").stream()
            for doc in snapshot:
                if doc.exists:
                    new_zonal_caches[doc.id] = doc.to_dict()

            with zonal_caches_lock:
                zonal_caches = new_zonal_caches
            logger.debug(str(zonal_caches))
            logger.debug("Zonal caches updated successfully.")
        except Exception as e:
            logger.debug(f"Error updating zonal caches: {e}")
        time.sleep(180)


wildcard_cache = {}
wildcard_lock = threading.Lock()


def update_wildcard_cache():
    global wildcard_cache
    global wildcard_lock
    while True:
        try:
            new_wildcard_cache = {}
            snapshot = firestore_client.collection("wildcards").stream()
            for doc in snapshot:
                if doc.exists:
                    new_wildcard_cache[doc.id] = doc.to_dict()

            with wildcard_lock:
                wildcard_cache = new_wildcard_cache
            logger.debug(str(wildcard_cache))
            logger.debug("Wildcard cache updated successfully.")
        except Exception as e:
            logger.debug(f"Error updating wildcard cache: {e}")
        time.sleep(60)


def check_wildcard_cache(domain):
    global wildcard_cache
    global wildcard_lock
    with wildcard_lock:
        for key in wildcard_cache.keys():
            if domain.endswith(key):
                return True
    return False


def get_zonal_cache(country_code):
    global zonal_caches
    global zonal_caches_lock
    with zonal_caches_lock:
        return zonal_caches.get(country_code, None)


def get_random_zonal_cache():
    global zonal_caches
    global zonal_caches_lock
    with zonal_caches_lock:
        if zonal_caches:
            return random.choice(list(zonal_caches.values()))
        return None


updating_zonal_caches_thread = threading.Thread(target=update_zonal_caches, daemon=True)
updating_zonal_caches_thread.start()
updating_wildcard_cache_thread = threading.Thread(
    target=update_wildcard_cache, daemon=True
)
updating_wildcard_cache_thread.start()


domain_ref = db.reference("/domains")
ip_to_country_ref = db.reference("/ip_to_country")
countries_ref = db.reference("/countries")

logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# enable cors
CORS(app, supports_credentials=True)


def ip_to_int(ip):
    return int(ipaddress.ip_address(ip))


def make_conflict_obj(key: str, rec: dict) -> dict:
    return {
        "id": key,
        "start_ip": rec["start_ip"],
        "end_ip": rec["end_ip"],
        "continent_code": rec["continent_code"],
        "continent_name": rec["continent_name"],
        "country_iso_code": rec["country_iso_code"],
        "country_name": rec["country_name"],
    }


def get_previous_conflict(start_int: int, exclude_key: str = None):
    limit = 2 if exclude_key else 1
    snap = (
        ip_to_country_ref.order_by_key()
        .end_at(str(start_int))
        .limit_to_last(limit)
        .get()
    ) or {}

    items = list(snap.items())
    if exclude_key:
        items = [item for item in items if item[0] != exclude_key]
    if not items:
        return None, None

    prev_key, prev_rec = items[-1]
    prev_end_int = ip_to_int(prev_rec["end_ip"])
    if start_int <= prev_end_int:
        return prev_key, prev_rec

    return None, None


def get_next_conflict(start_int: int, end_int: int, exclude_key: str = None):
    limit = 2 if exclude_key else 1
    snap = (
        ip_to_country_ref.order_by_key()
        .start_at(str(start_int))
        .limit_to_first(limit)
        .get()
    ) or {}

    items = list(snap.items())
    if exclude_key:
        items = [item for item in items if item[0] != exclude_key]
    if not items:
        return None, None

    next_key, next_rec = items[0]
    next_start_int = int(next_key)
    if end_int >= next_start_int:
        return next_key, next_rec

    return None, None


@app.route("/")
def home():
    return render_template_string(
        """<!doctype html>
<html>
    <head>
        <link rel="stylesheet" href="css url"/>
    </head>
    <body>
        <p>Aplicación de DNS_API!</p>
    </body>
</html>
"""
    )


# 8.8.8.8 es el DNS público de Google
dns_ip = os.environ.get("DNS_SERVER", "8.8.8.8")
try:
    dns_port = int(os.environ.get("DNS_PORT", "53"))
except:
    dns_port = 53
dns_server = (dns_ip, dns_port)


@app.route("/api/set_dns_server", methods=["POST", "GET"])
def set_dns():
    global dns_server
    if request.method == "POST":
        server = request.args.get("server")
        port = request.args.get("port")
        if server and port:
            try:
                port = int(port)
                dns_server = (server, port)
                return jsonify({"message": "Servidor DNS actualizado"}), 200
            except ValueError:
                return jsonify({"error": "Puerto inválido"}), 400
    if request.method == "GET":
        return jsonify({"dns_server": dns_server}), 200
    return jsonify({"error": "Método no permitido"}), 405


@app.route("/api/dns_resolver", methods=["POST"])
def dns_resolver():
    if request.method == "POST":
        data = request.get_data(as_text=True)
        # Código obtenido de https://www.geeksforgeeks.org/base64-b64decode-in-python/
        dns_query = base64.b64decode(data)
        logger.debug(dns_query)
        logger.debug(dns_server)
        # Crea un socket UDP para enviar la consulta DNS
        # Código obtenido de https://wiki.python.org/moin/UdpCommunicatione
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.sendto(dns_query, dns_server)
            data, _ = s.recvfrom(512)
            logger.debug(f"Recibida la respuesta DNS: {data}")
        codified_data = base64.b64encode(data).decode("utf-8")
        return codified_data


@app.route("/api/exists", methods=["GET"])
def exists():
    if request.method == "GET":
        domain = request.args.get("domain")
        ip_address = request.args.get("ip")  # Para usarlo más abajo si aplica

        if not domain:
            return jsonify({"error": "No se brindó un dominio"}), 400
        if not ip_address:
            return jsonify({"error": "No se dio un IP address"}), 400
        # Se invierte el dominio para buscarlo en la base de datos
        flipped_path = "/".join(reversed(domain.strip().split(".")))
        ref = domain_ref.child(flipped_path + "/_enabled")
        ip_data = ref.get()
        ip_response = ""
        if ip_data is None:
            logger.debug(f"El dominio {domain} no existe")
            # Revisamos si el dominio es un wildcard
            is_wildcard = check_wildcard_cache(domain)
            if not is_wildcard:
                return "Ese dominio no existe", 404
        try:
            ip_num = ip_to_int(ip_address)
            snapshot = (
                ip_to_country_ref.order_by_key()
                .end_at(str(ip_num))
                .limit_to_last(1)
                .get()
            )
            if snapshot:
                for key, ip_record in snapshot.items():
                    end_ip_num = ip_to_int(ip_record["end_ip"])
                    if end_ip_num >= ip_num >= int(key):
                        country_code = ip_record["country_iso_code"]
                        logger.debug(f"País encontrado: {country_code}")
                        break
            else:
                return "No se encontró el país", 500
            try:
                # Se busca el país en la base de datos
                cache_doc = get_zonal_cache(country_code)
                if cache_doc:
                    ip_response = cache_doc["ip"]
                else:
                    cache_doc = get_random_zonal_cache()
                    if cache_doc:
                        ip_response = cache_doc["ip"]
                    else:
                        return "No se encontró el país", 500
            except Exception as e:
                logger.debug(f"Error al buscar el país: {e}")
                return "No se encontró el país", 500
        except Exception as e:
            logger.debug(f"Ese dominio no existe: {e}")
            return "Ese dominio no existe", 404
        if ip_response != "":
            logger.debug(ip_response)
            return str(ip_to_int(ip_response)), 200
        else:
            return "Ese dominio no existe", 404


@app.route("/api/status", methods=["GET"])
def get_api_status():
    try:
        return jsonify({"DNS_SERVER": dns_ip, "DNS_PORT": dns_port}), 200
    except Exception as e:
        logger.debug(f"Error con el API backend: {e}")
        return jsonify({"error": "No se pudo obtener la información"}), 500


# Ruta para verificar el estado de la base de datos Firebase
@app.route("/api/firebase-status", methods=["GET"])
def get_firebase_status():
    try:
        test_ref = db.reference("/")
        snapshot = test_ref.get(shallow=True)

        return jsonify([]), 200

    except Exception as e:
        print("Error accediendo a Firebase:", e)
        return jsonify([]), 500


if __name__ == "__main__":
    # Uso de HTTPS sacado de https://blog.miguelgrinberg.com/post/running-your-flask-application-over-https
    app.run(host="0.0.0.0", ssl_context=("127.0.0.1.pem", "127.0.0.1-key.pem"))
