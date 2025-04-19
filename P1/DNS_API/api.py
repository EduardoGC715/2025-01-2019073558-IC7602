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
import dns.message
import dns.query
import dns.rdatatype
from geopy.distance import geodesic

domain_ref = db.reference("/domains")
ip_to_country_ref = db.reference("/ip_to_country")
healthcheckers_ref = db.reference("/healthcheckers")

logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)


# enable cors
CORS(app)


# Retry with backoff implementado con base en https://keestalkstech.com/2021/03/python-utility-function-retry-with-exponential-backoff/#without-typings.
def retry_with_backoff(fn, backoff_in_seconds=1):
    x = 0
    while True:
        logger.info(x)
        try:
            return fn()
        except:
            # va subiendo de 1, 2, 4, ... hasta esperar 256 segundos entre intentos. Se queda esperando hasta que pueda conectar,
            # porque de lo contrario, no podría trabajar bien.
            sleep = backoff_in_seconds * 2**x + random.uniform(0, 1)
            time.sleep(sleep)
            if x < 8:
                x += 1


def ip_to_int(ip):
    return int(ipaddress.ip_address(ip))


@app.route("/")
def home():
    return render_template_string(
        """<!doctype html>
<html>
    <head>
        <link rel="stylesheet" href="css url"/>
    </head>
    <body>
        <p>Aplicación de Mongo!</p>
    </body>
</html>
"""
    )


# Código basado de
# https://stackoverflow.com/questions/58676559/how-to-authenticate-to-firebase-using-python/71398321#71398321
# https://datagy.io/python-requests-response-object/

# @app.route("/login", methods=["POST"])
# def login():
#     if request.method == "POST":

#         data = request.get_json()
#         try:

#             email =data["email"]
#             password = data["password"]

#             logger.debug(email)
#             logger.debug(password)
#             userInfo = json.dumps({"email": email, "password": password, "return_secure_token":True})
#             r = requests.post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyAFj0oFcEqOdCL1NFlbGVhvirpxrKqx_LY", userInfo)
#             logger.debug(r)
#             if r:
#                 logger.debug("El usuario sí existe")
#             else:
#                 logger.debug("El usuario no existe")
#             logger.debug(r.json())
#             return r.json()
#         except Exception as e:
#             logger.debug("Ese correo electrónico no está registado", e)
#         return json.dumps({"error": {"code": 500, "message": "ERROR"}})

# @app.route("/register", methods=["POST"])
# def register():
#     if request.method == "POST":
#         data = request.get_json()
#         pEmail = data["email"]
#         pPassword = data["password"]
#         pPhone = data["phone"]
#         pDisplayName = data["name"] + " " + data["last_name1"] + " " + data["last_name2"]
#         try:
#             user = auth.create_user(email = pEmail, password = pPassword, phone_number = pPhone, display_name = pDisplayName)
#             record = {'logId': int(time.time()) + random.randint(0, 30000), 'title': "register", 'bagInfo': json.dumps({"email": pEmail, "password": pPassword, "phone": pPhone, "name": pDisplayName})}
#             return {"success": {"code": 200, "message": "The user has been registered correctly"}}
#         except Exception as e:
#             logger.debug(str(e))
#             logger.debug("El usuario ya está registrado.", e)
#             return json.dumps({"error": {"code": 500, "message": "The user has already been registered"}})


# Example: 8.8.8.8 is Google Public DNS
dns_server = ("8.8.8.8", 53)


def request_dns(dns_query):
    # Create a UDP socket
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.sendto(dns_query, dns_server)
        data, _ = s.recvfrom(512)  # 512 bytes max in standard DNS over UDP
        print("Received response (raw bytes):", data)
    return data

def least_latency(ips, health_checker):
    return min(
        ip["healthcheck_results"][health_checker]["duration_ms"]
        for ip in ips
    )

@app.route("/api/set_dns_server", methods=["POST"])
def set_dns():
    if request.method == "POST":
        server = request.args.get("server")
        port = request.args.get("port")
        if server and port:
            try:
                port = int(port)
                dns_server = (server, port)
                return jsonify({"message": "DNS server updated successfully"}), 200
            except ValueError:
                return jsonify({"error": "Invalid port number"}), 400


@app.route("/api/dns_resolver", methods=["POST"])
def dns_resolver():
    if request.method == "POST":
        data = request.get_data(as_text=True)
        dns_query = base64.b64decode(data)
        logger.debug(dns_query)

        # Your binary DNS query (must be correctly constructed)
        dns_query = (
            b"\xaa\xbb\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00"
            b"\x03www\x06google\x03com\x00\x00\x01\x00\x01"
        )  # Example for www.google.com

        # Create a UDP socket
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.sendto(dns_query, dns_server)
            data, _ = s.recvfrom(512)  # 512 bytes max in standard DNS over UDP
            print("Received response (raw bytes):", data)
        codified_data = base64.b64encode(data).decode("utf-8")
        return codified_data


@app.route("/api/exists", methods=["GET"])
def exists():
    if request.method == "GET":
        domain = request.args.get("domain")
        ip_address = request.args.get("ip")  # Para usarlo más abajo si aplica

        if not domain:
            return jsonify({"error": "No domain provided"}), 400

        # Flip the domain: google.com -> com/google
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
                    case "round-trip":
                        geo_request = requests.get(f"http://ip-api.com/json/{ip_address}")
                        location = geo_request.json()

                        lat = location.get("lat")
                        lon = location.get("lon")
                        ip_location = (lat, lon)
                        closest_hc = None
                        closest_distance = float("inf")
                        try:
                            healthcheckers = healthcheckers_ref.get()
                            for health_checker, checker_info in healthcheckers.items():
                                distance = geodesic(ip_location, (checker_info["latitude"], checker_info["longitude"])).km
                                if distance < closest_distance:
                                    closest_distance = distance
                                    closest_hc = health_checker
                        except Exception as e:
                            logger.debug("No se encontró el healthcheck", e)
                            return "No se encontró el healthcheck", 500

                        # sorted_ips = sorted(
                        #     ip_data["ips"],
                        #     key=lambda ip: least_latency(ip, closest_hc)
                        # )
                        logger.debug(closest_hc)
                        sorted_ips = sorted(
                            (ip for ip in ip_data["ips"] if ip.get("healthcheck_results",{}).get(closest_hc, {}).get("success", False)),
                            key=lambda ip: ip["healthcheck_results"][closest_hc]["duration_ms"]
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
                            else:
                                break
                


                        # retries = 0
                        # minDistance = float("inf")
                        # closest_ip = None
                        # for ip in ip_data["ips"]:
                        #     for healthChecker in ip["healthcheck_results"]:
                        #         distance = geodesic((lat, lon), (healthChecker["latitude"], healthChecker["longitude"])).km
                        #         logger.debug(f"Distance: {distance} km")
                        #         if distance < minDistance:
                        #             minDistance = distance
                        #             closest_ip = ip
                        # try:
                        #     if closest_ip["health"]:
                        #         ip_response = closest_ip["address"]
                        #     else:
                        #         ip_response = "Unhealthy"
                        # except Exception:
                        #     retries = 0
                        #     while retries < 5:
                        #         if closest_ip["health"]:
                        #             ip_response = closest_ip["address"]
                        #             break
                        #         else:
                        #             ip_response = "Unhealthy"
                        #         if ip["health"]:
                        #             ip_response = ip["address"]
                        #             break
                        #         else:
                        #             retries += 1
                        #             ip_response = "Unhealthy"
                    case _:
                        return "El routing policy no existe", 500

            except Exception as e:
                logger.debug("Ese dominio no existe", e)
                return "Ese dominio no existe", 404
        if ip_response != "Unhealthy" and ip_response != "":
            logger.debug(ip_response)
            return str(ip_to_int(ip_response)), 200
        else:
            logger.debug(ip_response)
            # Create a DNS query message for the domain 'example.com' and record type 'A'
            query = dns.message.make_query(domain, dns.rdatatype.A)
            logger.debug(query.to_text())
            response = dns.query.udp(query, dns_server[0])
            logger.debug(response.to_text())
            answer = response.answer
            bytes = response.to_wire()
            encodedBytes = base64.b64encode(bytes).decode("utf-8")
            logger.debug("Received response (raw bytes) base 64:", bytes)
            # Print the response in a human-readable format
            # Convert all RRsets to text and join them into a single string
            answer_string = "\n".join(rrset.to_text() for rrset in answer)
            # Print the response

            return encodedBytes, 264


@app.route("/api/status", methods=["GET"])
def get_api_status():
    try:
        return jsonify([]), 200
    except Exception as e:
        print("Error con el API backend", e)
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
        raw_data = domain_ref.get()
        if not raw_data:
            logger.warning("No se encontraron datos en la base de datos")
            return jsonify([]), 200

        response = []
        id_counter = 0
        domain_map = {}

        # Ciclo por dominio
        for tld, domain_block in raw_data.items():
            for domain, www_data in domain_block.items():
                www_info = www_data.get("www", {})
                routing_policy = www_info.get("routing_policy")
                domain_name = f"{domain}.{tld}"

                # Clasifica el dominio por su tipo de routing policy
                if routing_policy == "single":
                    ip = www_info.get("ip")
                    if ip:
                        response.append(
                            {
                                "id": id_counter,
                                "domain": domain_name,
                                "type": routing_policy,
                                "direction": ip.get("address", "N/A"),
                                "status": ip.get("health", "unknown"),
                            }
                        )
                        id_counter += 1
                    else:
                        logger.warning(
                            f"No IP found for domain {domain_name} with routing policy {routing_policy}"
                        )

                elif routing_policy in ["multi", "weight", "geo", "round-trip"]:
                    # Para los otros tipos debido a que permiten mas de un address
                    if domain_name not in domain_map:
                        domain_map[domain_name] = {
                            "id": id_counter,
                            "domain": domain_name,
                            "type": routing_policy,
                            "direction": "",
                            "status": [],
                        }
                        id_counter += 1

                    # Para multi y round-trip: formato "ip1,ip2,ip3"
                    if routing_policy in ["multi", "round-trip"]:
                        ips = www_info.get("ips", [])
                        ip_addresses = [ip.get("address", "N/A") for ip in ips]
                        domain_map[domain_name]["direction"] = ",".join(ip_addresses)
                        domain_map[domain_name]["status"] = ",".join(
                            [str(ip.get("health", "unknown")) for ip in ips]
                        )

                    # Para weight: formato "ip1:peso1,ip2:peso2"
                    elif routing_policy == "weight":
                        ips = www_info.get("ips", [])
                        weighted_ips = [
                            f"{ip.get('address', 'N/A')}:{ip.get('weight', '0')}"
                            for ip in ips
                        ]
                        domain_map[domain_name]["direction"] = ",".join(weighted_ips)
                        domain_map[domain_name]["status"] = ",".join(
                            [str(ip.get("health", "unknown")) for ip in ips]
                        )

                    # Para geo: formato "ip1:país1,ip2:país2"
                    elif routing_policy == "geo":
                        geo_ips = www_info.get("ips", {})
                        geo_entries = []
                        statuses = []
                        for country, ip in geo_ips.items():
                            geo_entries.append(f"{ip.get('address', 'N/A')}:{country}")
                            statuses.append(ip.get("health", "unknown"))
                        domain_map[domain_name]["direction"] = ",".join(geo_entries)
                        domain_map[domain_name]["status"] = ",".join(map(str, statuses))

        # Añadir los dominios agrupados a la respuesta
        for domain_info in domain_map.values():
            if isinstance(domain_info["status"], list):
                domain_info["status"] = ",".join(map(str, domain_info["status"]))
            response.append(domain_info)

        # Ordenar respuesta por ID
        response.sort(key=lambda x: x["id"])
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error al obtener los dominios: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": "No se pudo obtener la información"}), 500


# Convierte google.com en com/google.
def flip_domain(domain):
    return "/".join(reversed(domain.strip().split(".")))


# Valida que exista dominio
def validate_domain(data):
    domain = data.get("domain")
    if not domain:
        return None, jsonify({"error": "No domain provided"}), 400
    return domain, None, None


def create_Domain(ref, domain, data):
    domain_type = data.get("type")
    direction = data.get("direction")
    status_flag = data.get("status")
    counter_value = data.get("counter")
    weights = data.get("weight")

    if not all([domain_type, direction is not None, status_flag is not None]):
        return jsonify({"error": "Missing one or more required fields"}), 400

    ip_data = {"routing_policy": domain_type}

    # Se van creando los dominos segun sus tipos
    if domain_type == "single":
        ip_data["ip"] = {"address": direction, "health": status_flag}

    elif domain_type in ["multi", "round-trip"]:
        if not isinstance(direction, list):
            return jsonify(
                {
                    "error": f"For '{domain_type}' type, 'direction' must be a list of IPs"
                },
                400,
            )
        ip_data["ips"] = [{"address": ip, "health": status_flag} for ip in direction]
        if domain_type == "multi":
            ip_data["counter"] = counter_value  # Solo multi tiene contador

    elif domain_type == "weight":
        if not isinstance(direction, list) or not isinstance(weights, list):
            return jsonify(
                {
                    "error": "For 'weight' type, both 'direction' and 'weight' must be lists"
                },
                400,
            )
        if len(direction) != len(weights):
            return jsonify(
                {"error": "'direction' and 'weight' lists must be of the same length"},
                400,
            )
        try:
            ip_data["ips"] = [
                {
                    "address": ip,
                    "health": status_flag,
                    "weight": int(weights[i]),
                }
                for i, ip in enumerate(direction)
            ]
        except ValueError:
            return jsonify({"error": "'weight' values must be integers"}), 400

    elif domain_type == "geo":
        if not isinstance(direction, dict):
            return jsonify(
                {
                    "error": "For 'geo' type, 'direction' must be a dictionary of country codes to IPs"
                },
                400,
            )
        ip_data["ips"] = {
            country: {"address": ip, "health": status_flag}
            for country, ip in direction.items()
        }

    try:
        ref.set(ip_data)
        return (
            jsonify(
                {
                    "message": f"Domain {domain} created successfully with {domain_type} routing policy",
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
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    # Se valida el dominio enviado en el JSON
    domain, error_response, status = validate_domain(data)
    if error_response:
        return error_response, status

    # Se separa el dominio en partes (por ejemplo: "www.example.com" → ["www", "example", "com"])
    domain_parts = domain.strip().split(".")
    # Se valida que el dominio tenga al menos dos partes ("example.com")
    if len(domain_parts) < 2:
        return jsonify({"error": "Invalid domain format"}), 400

    # construye la ruta invertida
    # "example.com" se guarda como "com/example/www"
    tld = domain_parts[-1]
    name = domain_parts[-2]
    flipped_path = f"{tld}/{name}/www"
    ref = domain_ref.child(flipped_path)

    # Si es una solicitud POST, se crea el dominio nuevo
    if request.method == "POST":
        return create_Domain(ref, domain, data)

    # Si es una solicitud PUT, primero se elimina el dominio anterior y luego se crea uno nuevo
    elif request.method == "PUT":
        try:
            ref.delete()
        except Exception as e:
            logger.warning(f"Warning deleting domain before re-creating: {str(e)}")

        return create_Domain(ref, domain, data)

    # Si es una solicitud DELETE, se elimina el dominio
    elif request.method == "DELETE":
        try:
            ref.delete()
            return jsonify({"message": "Domain deleted", "status": "success"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Start up the server to expose the metrics.
    app.run(host="0.0.0.0")
    # https://synchronizing.medium.com/running-a-simple-flask-application-inside-a-docker-container-b83bf3e07dd5
