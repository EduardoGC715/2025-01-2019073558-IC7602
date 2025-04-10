# Código obtenido de https://www.freecodecamp.org/news/how-to-get-started-with-firebase-using-python/
import firebase_admin
from firebase_admin import credentials, auth
from firebase_admin import db
from pprint import pprint

cred = credentials.Certificate(
    "DNS_API/dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json"
)
firebase_admin.initialize_app(
    cred, {"databaseURL": "https://dnsfire-8c6fd-default-rtdb.firebaseio.com/"}
)

import datetime as dt
from flask import Flask, request, render_template_string, current_app, g, jsonify
from werkzeug.local import LocalProxy
from flask_cors import CORS
import os
import logging
import time
import json
import random
import requests
import ipaddress


domain_ref = db.reference("/domains")
ip_to_country_ref = db.reference("/ip_to_country")

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


@app.route("/api/dns_resolver", methods=["POST"])
def dns_resolver():
    if request.method == "POST":
        data = request.get_json()
        pEmail = data["email"]
        pPassword = data["password"]
        pPhone = data["phone"]
        pDisplayName = (
            data["name"] + " " + data["last_name1"] + " " + data["last_name2"]
        )
        try:
            user = auth.create_user(
                email=pEmail,
                password=pPassword,
                phone_number=pPhone,
                display_name=pDisplayName,
            )
            record = {
                "logId": int(time.time()) + random.randint(0, 30000),
                "title": "register",
                "bagInfo": json.dumps(
                    {
                        "email": pEmail,
                        "password": pPassword,
                        "phone": pPhone,
                        "name": pDisplayName,
                    }
                ),
            }
            return {
                "success": {
                    "code": 200,
                    "message": "The user has been registered correctly",
                }
            }
        except Exception as e:
            logger.debug(str(e))
            logger.debug("El usuario ya está registrado.", e)
            return json.dumps(
                {
                    "error": {
                        "code": 500,
                        "message": "The user has already been registered",
                    }
                }
            )


@app.route("/api/exists", methods=["GET"])
def exists():
    if request.method == "GET":
        domain = request.args.get("domain")
        ip_address = request.args.get("ip_address")  # Para usarlo más abajo si aplica

        if not domain:
            return jsonify({"error": "No domain provided"}), 400

        # Flip the domain: google.com -> com/google
        flipped_path = "/".join(reversed(domain.strip().split(".")))
        ref = domain_ref.child(flipped_path)
        ip_data = ref.get()

        if ip_data:
            try:
                match ip_data["routing_policy"]:
                    case "single":
                        if ip_data["ip"]["health"] == "healthy":
                            return ip_data["ip"]["address"]

                        else:
                            return "Unhealthy", 500
                    case "multi":
                        retries = 0
                        while retries < len(ip_data["ips"]):
                            index = ip_data["counter"] % len(ip_data["ips"])
                            ip = ip_data["ips"][index]
                            if ip["health"]:
                                ref.update({"counter": ip_data["counter"] + 1})
                                return ip["address"]
                            else:
                                ip_data["counter"] += 1
                                retries += 1
                        return "Unhealthy", 500
                    case "weight":
                        weights = [ip["weight"] for ip in ip_data["ips"]]
                        indices = list(range(len(weights)))
                        retries = 0
                        while retries < 5:
                            index = random.choices(indices, weights=weights, k=1)[0]
                            ip = ip_data["ips"][index]
                            if ip["health"]:
                                return ip["address"]
                            else:
                                retries += 1
                        return "Unhealthy", 500
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
                                return ip["address"]
                            else:
                                return "Unhealthy", 500
                        except Exception:
                            retries = 0
                            while retries < 5:
                                ip = random.choice(list(ip_data["ips"].values()))
                                if ip["health"]:
                                    return ip["address"]
                                else:
                                    retries += 1
                            return "Unhealthy", 500
                    case "round-trip":
                        return "Using latency-based routing policy"
                    case _:
                        return "El routing policy no existe", 500

            except Exception as e:
                logger.debug("Ese dominio no existe", e)
                return "Ese dominio no existe", 404
        else:
            return "Ese dominio no existe", 404


@app.route("/api/status", methods=["GET"])
def get_api_status():
    try:
        return jsonify([]), 200
    except Exception as e:
        print("Error con el API backend", e)
        return jsonify({"error": "No se pudo obtener la información"}), 500


@app.route("/api/all-domains", methods=["GET"])
def get_all_domains():
    try:
        raw_data = domain_ref.get()
        if not raw_data:
            return jsonify([]), 200

        response = []
        id_counter = 1

        for tld, domain_block in raw_data.items():  # tld = com, net, etc.
            for domain, www_data in domain_block.items():
                routing_policy = www_data["www"]["routing_policy"]
                www_info = www_data["www"]

                if routing_policy == "single":
                    ip = www_info["ip"]
                    response.append(
                        {
                            "id": id_counter,
                            "domain": f"{domain}.{tld}",
                            "type": routing_policy,
                            "direction": ip["address"],
                            "status": ip["health"],
                        }
                    )
                    id_counter += 1

                elif routing_policy == "multi" or routing_policy == "weight":
                    for ip in www_info["ips"]:
                        response.append(
                            {
                                "id": id_counter,
                                "domain": f"{domain}.{tld}",
                                "type": routing_policy,
                                "direction": ip["address"],
                                "status": ip["health"],
                            }
                        )
                        id_counter += 1

                elif routing_policy == "geo":
                    for country, ip in www_info["ips"].items():
                        response.append(
                            {
                                "id": id_counter,
                                "domain": f"{domain}.{tld}",
                                "type": f"{routing_policy} ({country})",
                                "direction": ip["address"],
                                "status": ip["health"],
                            }
                        )
                        id_counter += 1

                elif routing_policy == "round-trip":
                    ip = www_info["ip"]
                    response.append(
                        {
                            "id": id_counter,
                            "domain": f"{domain}.{tld}",
                            "type": routing_policy,
                            "direction": ip["address"],
                            "status": ip["health"],
                        }
                    )
                    id_counter += 1

        return jsonify(response), 200

    except Exception as e:
        print("Error al obtener los dominios:", e)
        return jsonify({"error": "No se pudo obtener la información"}), 500


@app.route("/domains", methods=["POST", "PUT", "DELETE"])
def add_domain():

    if request.method == "POST":
        data = request.get_json()
        domain = data.get("domain")
        print(domain)
        if not domain:
            return jsonify({"error": "No domain provided"}), 400
        routing_policy = data.get("routing_policy")

        # Depending on the routing policy, we can add more information to the domain.
        ip_data = {}
        match routing_policy:
            case "single":
                return "Using single routing policy"
            case "multi":
                return "Using multi-value routing policy"
            case "weight":
                return "Using weighted routing policy"
            case "geo":
                return "Using geolocation routing policy"
            case "round-trip":
                return "Using latency-based routing policy"
            case _:
                return "El routing policy no existe", 500

        # Flip the domain
        flipped_path = "/".join(reversed(domain.strip().split(".")))
        print(flipped_path)
        ref = domain_ref.child(flipped_path)
        result = ref.set(ipData)
        print(result)

        if result:
            return result
        else:
            return "El dominio no se pudo crear", 500
    elif request.method == "PUT":
        data = request.get_json()
        domain = data.get("domain")
        print(domain)
        if not domain:
            return jsonify({"error": "No domain provided"}), 400

        # Flip the domain: google.com -> com/google
        flipped_path = "/".join(reversed(domain.strip().split(".")))
        print(flipped_path)
        ref = domain_ref.child(flipped_path)
        result = ref.update(data)
        print(result)

        if result:
            return result
        else:
            return "El dominio no se pudo actualizar", 500
    elif request.method == "DELETE":
        data = request.get_json()
        domain = data.get("domain")
        print(domain)
        if not domain:
            return jsonify({"error": "No domain provided"}), 400

        # Flip the domain: google.com -> com/google
        flipped_path = "/".join(reversed(domain.strip().split(".")))
        print(flipped_path)
        ref = domain_ref.child(flipped_path)
        result = ref.delete()

        print(result)

        if result:
            return result
        else:
            return "El dominio no se pudo eliminar", 500


if __name__ == "__main__":
    # Start up the server to expose the metrics.
    app.run()
    # https://synchronizing.medium.com/running-a-simple-flask-application-inside-a-docker-container-b83bf3e07dd5
