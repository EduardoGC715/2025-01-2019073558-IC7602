# Código obtenido de https://www.freecodecamp.org/news/how-to-get-started-with-firebase-using-python/
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import base64

cred = credentials.Certificate("dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json")
firebase_admin.initialize_app(
    cred, {"databaseURL": "https://dnsfire-8c6fd-default-rtdb.firebaseio.com/"}
)

from flask import Flask, request, render_template_string, jsonify
from flask_cors import CORS
import logging
import time
import random
import requests
import ipaddress
import socket
from geopy.distance import geodesic
import os

domain_ref = db.reference("/domains")
ip_to_country_ref = db.reference("/ip_to_country")
healthcheckers_ref = db.reference("/healthcheckers")
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


@app.route("/api/set_dns_server", methods=["POST"])
def set_dns():
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


@app.route("/api/dns_resolver", methods=["POST"])
def dns_resolver():
    if request.method == "POST":
        data = request.get_data(as_text=True)
        dns_query = base64.b64decode(data)
        logger.debug(dns_query)

        # Crea un socket UDP para enviar la consulta DNS
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.sendto(dns_query, dns_server)
            data, _ = s.recvfrom(512)
            logger.debug("Recibida la respuesta DNS:", data)
        codified_data = base64.b64encode(data).decode("utf-8")
        return codified_data


@app.route("/api/exists", methods=["GET"])
def exists():
    if request.method == "GET":
        domain = request.args.get("domain")
        ip_address = request.args.get("ip")  # Para usarlo más abajo si aplica

        if not domain:
            return jsonify({"error": "No se brindó un dominio"}), 400

        # Se invierte el dominio para buscarlo en la base de datos
        flipped_path = "/".join(reversed(domain.strip().split(".")))
        ref = domain_ref.child(flipped_path)
        ip_data = ref.get()
        logger.debug(ip_data)
        ip_response = ""
        if ip_data:
            try:
                match ip_data["routing_policy"]:
                    case "single":
                        if ip_data["ip"]["health"]:
                            ip_response = ip_data["ip"]["address"]

                        else:
                            ip_response = "Unhealthy"
                    case "multi":
                        retries = 0
                        while retries < len(ip_data["ips"]):
                            index = ip_data["counter"] % len(ip_data["ips"])
                            ip = ip_data["ips"][index]
                            if ip["health"]:
                                ref.update({"counter": ip_data["counter"] + 1})
                                ip_response = ip["address"]
                                break
                            else:
                                ip_data["counter"] += 1
                                retries += 1
                                ip_response = "Unhealthy"
                                time.sleep(0.5)
                    case "weight":
                        weights = [ip["weight"] for ip in ip_data["ips"]]
                        indices = list(range(len(weights)))
                        retries = 0
                        while retries < 5:
                            index = random.choices(indices, weights=weights, k=1)[0]
                            ip = ip_data["ips"][index]
                            if ip["health"]:
                                ip_response = ip["address"]
                                break
                            else:
                                retries += 1
                                ip_response = "Unhealthy"
                                time.sleep(0.5)
                    case "geo":
                        if not ip_address:
                            return jsonify({"error": "No se dio un IP address"}), 400

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
                                    break
                        else:
                            return "No se encontró el país", 500

                        try:
                            ip = ip_data["ips"][country_code]
                            if ip["health"]:
                                ip_response = ip["address"]
                            else:
                                raise Exception("IP Unhealthy")
                        except Exception:
                            retries = 0
                            while retries < 5:
                                ip = random.choice(list(ip_data["ips"].values()))
                                if ip["health"]:
                                    ip_response = ip["address"]
                                    break
                                else:
                                    retries += 1
                                    ip_response = "Unhealthy"
                                    time.sleep(0.5)
                    case "round-trip":
                        geo_request = requests.get(
                            f"http://ip-api.com/json/{ip_address}"
                        )
                        location = geo_request.json()

                        lat = location.get("lat")
                        lon = location.get("lon")
                        ip_location = (lat, lon)
                        closest_hc = None
                        closest_distance = float("inf")
                        try:
                            healthcheckers = healthcheckers_ref.get()
                            for health_checker, checker_info in healthcheckers.items():
                                distance = geodesic(
                                    ip_location,
                                    (
                                        checker_info["latitude"],
                                        checker_info["longitude"],
                                    ),
                                ).km
                                if distance < closest_distance:
                                    closest_distance = distance
                                    closest_hc = health_checker
                        except Exception as e:
                            logger.debug("No se encontró el healthcheck", e)
                            return "No se encontró el healthcheck", 500

                        logger.debug(closest_hc)
                        sorted_ips = sorted(
                            (
                                ip
                                for ip in ip_data["ips"]
                                if ip.get("healthcheck_results", {})
                                .get(closest_hc, {})
                                .get("success", False)
                            ),
                            key=lambda ip: ip["healthcheck_results"][closest_hc][
                                "duration_ms"
                            ],
                        )

                        logger.debug(sorted_ips)
                        retries = 0
                        while retries < 3:
                            for ip in sorted_ips:
                                if ip["health"]:

                                    logger.debug(ip)
                                    ip_response = ip["address"]
                                    break
                                else:
                                    ip_response = "Unhealthy"
                            if ip_response == "Unhealthy":
                                retries += 1
                                time.sleep(0.5)
                            else:
                                break
                    case _:
                        return "El routing policy no existe", 500

            except Exception as e:
                logger.debug("Ese dominio no existe", e)
                return "Ese dominio no existe", 404
        if ip_response != "Unhealthy" and ip_response != "":
            logger.debug(ip_response)
            return str(ip_to_int(ip_response)), 200
        else:
            return "Ese dominio no existe", 404


@app.route("/api/countries", methods=["GET"])
def countries():
    if request.method == "GET":
        country_code = request.args.get("country_code")

        if not country_code:
            return {"exists": False}
        ref = countries_ref.child(country_code)
        country = ref.get()
        if not country:
            return {"exists": False}
        return {"exists": True}

@app.route("/api/countries/all", methods=["GET"])
def get_all_countries():
    try:
        countries = countries_ref.get()
        if not countries:
            return jsonify([]), 200

        country_list = [{"code": code, "name": name} for code, name in countries.items()]
        return jsonify(country_list), 200
    except Exception as e:
        app.logger.error(f"Error retrieving countries: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/status", methods=["GET"])
def get_api_status():
    try:
        return jsonify({"DNS_SERVER": dns_ip, "DNS_PORT": dns_port}), 200
    except Exception as e:
        logger.debug("Error con el API backend", e)
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


# Ruta para obtener todos los dominios del firebase y ordenarlos en base al tipo
@app.route("/api/all-domains", methods=["GET"])
def get_all_domains():
    try:
        raw_data = domain_ref.get() or {}
        results = []
        id_counter = 0

        def traverse(node: dict, path: list[str]):
            nonlocal id_counter

            policy = node.get("routing_policy")
            if policy and (node.get("ip") or node.get("ips")):
                id_counter += 1
                fqdn = ".".join(reversed(path))
                logger.debug(fqdn)

                if policy == "single":
                    addresses = [node["ip"].get("address", "")]
                elif policy == "weight":
                    addresses = [
                        f"{ip.get('address', '')}:{ip.get('weight', 0)}"
                        for ip in node.get("ips", [])
                    ]
                elif policy == "geo":
                    addresses = [
                        f"{ip.get('address', '')}:{country}"
                        for country, ip in node.get("ips", {}).items()
                    ]
                else:
                    raw_ips = node.get("ips", [])
                    if isinstance(raw_ips, list):
                        addresses = [ip.get("address", "") for ip in raw_ips]
                    else:
                        addresses = [ip.get("address", "") for ip in raw_ips.values()]
                direction = ",".join(addresses)

                record = {
                    "id": id_counter,
                    "domain": fqdn,
                    "type": policy,
                    "direction": direction,
                }

                if policy == "multi":
                    counter = node.get("counter")
                    if counter is not None:
                        record["counter"] = counter

                results.append(record)

            for key, child in node.items():
                if isinstance(child, dict):
                    traverse(child, path + [key])

        for tld, domains_block in raw_data.items():
            logger.debug(tld, domains_block)
            for domain_name, domain_obj in (domains_block or {}).items():
                traverse(domain_obj, [tld, domain_name])

        return jsonify(results), 200

    except Exception as e:
        logger.error("Error al obtener los dominios:", exc_info=True)
        return jsonify({"error": "No se pudo obtener la información"}), 500


# Valida que exista dominio
def validate_domain(data):
    domain = data.get("domain")
    if not domain:
        return None, jsonify({"error": "No se brindó un dominio"}), 400
    return domain, None, None


def create_Domain(ref, domain, data):
    domain_type = data.get("type")
    direction = data.get("direction")
    status_flag = data.get("status")
    counter_value = data.get("counter", 0)
    weights = data.get("weight")
    healthcheck_settings = data.get("healthcheck_settings", {})

    if not all([domain_type, direction is not None, status_flag is not None]):
        return jsonify({"error": "Faltan campos"}), 400

    # Validate healthcheck settings
    required_healthcheck_fields = [
        "acceptable_codes",
        "crontab",
        "max_retries",
        "path",
        "port",
        "timeout",
        "type",
    ]
    if not all(field in healthcheck_settings for field in required_healthcheck_fields):
        return (
            jsonify({"error": "Falta la configuración del healthcheck"}),
            400,
        )

    try:
        # Convert numeric fields to integers
        healthcheck_settings["max_retries"] = int(healthcheck_settings["max_retries"])
        healthcheck_settings["port"] = int(healthcheck_settings["port"])
        healthcheck_settings["timeout"] = int(healthcheck_settings["timeout"])
    except ValueError:
        return (
            jsonify(
                {
                    "error": "Valores numéricos inválidos en la configuración del healthcheck"
                }
            ),
            400,
        )

    ip_data = {"routing_policy": domain_type}

    # Se van creando los dominios según sus tipos
    if domain_type == "single":
        ip_data["ip"] = {
            "address": direction,
            "health": status_flag,
            "healthcheck_settings": healthcheck_settings,
        }

    elif domain_type in ["multi", "round-trip"]:
        if not isinstance(direction, str):
            return jsonify(
                {
                    "error": f"Para el tipo de dominio '{domain_type}', 'direction' tiene que ser un string de IPs separados por comas"
                },
                400,
            )
        ip_list = [ip.strip() for ip in direction.split(",")]
        ip_data["ips"] = [
            {
                "address": ip,
                "health": status_flag,
                "healthcheck_settings": healthcheck_settings,
            }
            for ip in ip_list
        ]
        if domain_type == "multi":
            ip_data["counter"] = counter_value or 0  # Solo multi tiene contador

    elif domain_type == "weight":
        if not isinstance(direction, str):
            return jsonify(
                {
                    "error": "Para el tipo weight, 'direction' tiene que ser un string de pares de IP: weight separados por comas"
                },
                400,
            )
        try:
            weighted_pairs = direction.split(",")
            ip_data["ips"] = []
            for pair in weighted_pairs:
                ip, weight = pair.strip().split(":")
                ip_data["ips"].append(
                    {
                        "address": ip.strip(),
                        "health": status_flag,
                        "weight": int(weight.strip()),
                        "healthcheck_settings": healthcheck_settings,
                    }
                )
        except ValueError:
            return jsonify({"error": "Formato inválido para IPs con peso."}), 400

    elif domain_type == "geo":
        if not isinstance(direction, str):
            return jsonify(
                {
                    "error": "Para el tipo 'geo', 'direction' tiene que ser un string de pares de IP: country separados por comas"
                },
                400,
            )
        try:
            geo_pairs = direction.split(",")
            ip_data["ips"] = {}
            for pair in geo_pairs:
                ip, country = pair.strip().split(":")
                ip_data["ips"][country.strip()] = {
                    "address": ip.strip(),
                    "health": status_flag,
                    "healthcheck_settings": healthcheck_settings,
                }
        except ValueError:
            return jsonify({"error": "Formato inválido para IPs de geo"}), 400

    try:
        ref.update(ip_data)
        return (
            jsonify(
                {
                    "message": f"El dominio {domain} creado exitosamente con el routing policy {domain_type}",
                    "status": "created",
                }
            ),
            201,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Ruta para crear, acutalizar o eliminar un dominio
@app.route("/api/domains", methods=["POST", "PUT", "DELETE"])
def manage_domain():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Cuerpo del JSON inválido o faltante"}), 400

    # Se valida el dominio enviado en el JSON
    domain, error_response, status = validate_domain(data)
    if error_response:
        return error_response, status

    # Se separa el dominio en partes (por ejemplo: "www.example.com" → ["www", "example", "com"])
    domain_parts = domain.strip().split(".")
    # Se valida que el dominio tenga al menos dos partes ("example.com")
    if len(domain_parts) < 2:
        return jsonify({"error": "Formato de dominio inválido"}), 400

    # construye la ruta invertida
    flipped_path = "/".join(reversed(domain.strip().split(".")))
    ref = domain_ref.child(flipped_path)

    # Si es una solicitud POST, se crea el dominio nuevo
    if request.method == "POST" or request.method == "PUT":
        return create_Domain(ref, domain, data)

    # Si es una solicitud DELETE, se elimina el dominio
    elif request.method == "DELETE":
        try:
            ref.delete()
            return jsonify({"message": "Dominio eliminado", "status": "success"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route("/api/ip-to-country", methods=["GET"])
def get_country_from_ip():
    ip_str = request.args.get("ip")
    if not ip_str:
        return jsonify({"error": "La dirección IP address es requerida"}), 400
    try:
        ip_int = ip_to_int(ip_str)

        # Buscar el registro con la clave (start_ip_int) más cercana hacia abajo
        snapshot = (
            ip_to_country_ref.order_by_key().end_at(str(ip_int)).limit_to_last(1).get()
        )

        if snapshot:
            for key, record in snapshot.items():
                record_start = int(key)
                record_end = ip_to_int(record["end_ip"])

                if record_start <= ip_int <= record_end:
                    return (
                        jsonify(
                            {
                                "id": record_start,
                                "country_name": record["country_name"],
                                "country_iso_code": record["country_iso_code"],
                                "continent_name": record["continent_name"],
                                "continent_code": record["continent_code"],
                                "start_ip": record["start_ip"],
                                "end_ip": record["end_ip"],
                            }
                        ),
                        200,
                    )

            return jsonify({"error": "No hay un registro para este IP"}), 404

    except Exception as e:
        logger.debug("Error buscando país por IP", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/ip-to-country", methods=["POST", "PUT", "DELETE"])
def manage_ip_to_country():
    data = request.get_json() or {}
    logger.debug(data)

    if request.method == "DELETE":
        record_id = data.get("id")

        if record_id is None:
            return jsonify({"error": "Falta el 'id' para la eliminación"}), 400

        key = str(int(record_id))
        ref = ip_to_country_ref.child(key)

        if not ref.get():
            return jsonify({"error": f"No hay un registro {record_id}"}), 404

        ref.delete()
        return jsonify({"message": f"Eliminado el registro {record_id}"}), 200

    start_ip = data.get("start_ip")
    end_ip = data.get("end_ip")
    if start_ip is None or end_ip is None:
        return jsonify({"error": "Se necesitan 'start_ip' y 'end_ip'"}), 400

    try:
        start_int = ip_to_int(start_ip)
        end_int = ip_to_int(end_ip)
    except ValueError:
        return jsonify({"error": "Formato de IP inválido"}), 400

    if start_int >= end_int:
        return jsonify({"error": "'start_ip' debe estar antes de 'end_ip'"}), 400

    new_key = str(start_int)
    required = ["continent_code", "continent_name", "country_iso_code", "country_name"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": "Faltan campos", "missing": missing}), 400

    if request.method == "POST":
        try:
            pk, prec = get_previous_conflict(start_int)
            if pk:
                return (
                    jsonify(
                        {
                            "error": "Hay traslape con el registro anterior.",
                            "conflict": make_conflict_obj(pk, prec),
                        }
                    ),
                    409,
                )

            nk, nrec = get_next_conflict(start_int, end_int)
            if nk:
                return (
                    jsonify(
                        {
                            "error": "Hay traslape con el registro siguiente.",
                            "conflict": make_conflict_obj(nk, nrec),
                        }
                    ),
                    409,
                )

            ref = ip_to_country_ref.child(new_key)

            if ref.get():
                return jsonify({"error": f"El registro ya existe en {start_ip}"}), 409

            payload = {
                "start_ip": start_ip,
                "end_ip": end_ip,
                **{k: data[k] for k in required},
            }

            ref.set(payload)
            logger.debug(payload)
            record = {"id": start_int, **payload}

            return (
                jsonify(
                    {"message": f"Registro creado en {start_ip}", "record": record}
                ),
                201,
            )
        except Exception as e:
            logger.debug("Error creando el registro", e)
            return jsonify({"error": str(e)}), 500

    if request.method == "PUT":
        orig_id = data.get("original_start_ip")
        if orig_id is None:
            return jsonify({"error": "Falta el 'original_start_ip'"}), 400

        old_key = str(int(orig_id))
        old_ref = ip_to_country_ref.child(old_key)

        if not old_ref.get():
            return (
                jsonify({"error": f"No hay un registro para actualizer en {orig_id}"}),
                404,
            )

        pk, prec = get_previous_conflict(start_int, exclude_key=old_key)
        if pk:
            return (
                jsonify(
                    {
                        "error": "Hay traslape con el registro anterior.",
                        "conflict": make_conflict_obj(pk, prec),
                    }
                ),
                409,
            )

        nk, nrec = get_next_conflict(start_int, end_int, exclude_key=old_key)
        if nk:
            return (
                jsonify(
                    {
                        "error": "Hay traslape con el registro siguiente.",
                        "conflict": make_conflict_obj(nk, nrec),
                    }
                ),
                409,
            )

        payload = {
            "start_ip": start_ip,
            "end_ip": end_ip,
            **{k: data[k] for k in required},
        }
        logger.debug(payload)

        if new_key != old_key:
            ip_to_country_ref.child(new_key).set(payload)
            old_ref.delete()
            msg = f"Renombrado registro {old_key} → {new_key}"
        else:
            old_ref.update(payload)
            msg = f"Actualizado registro {new_key}"

        record = {"id": start_int, **payload}

        return jsonify({"message": msg, "record": record}), 200


@app.route("/api/ip-to-country/all", methods=["GET"])
def get_all_ip_to_country_records():
    try:
        snapshot = ip_to_country_ref.get()

        if not snapshot:
            return jsonify([]), 200

        result = [
            {"id": int(start_key), **record} for start_key, record in snapshot.items()
        ]

        result.sort(key=lambda r: r["id"])

        return jsonify(result), 200

    except Exception as e:
        logger.exception("Error al obtener todos los registros de IPToCountry")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Uso de HTTPS sacado de https://blog.miguelgrinberg.com/post/running-your-flask-application-over-https
    app.run(host="0.0.0.0", ssl_context=("fullchain.pem", "privkey.pem"))
