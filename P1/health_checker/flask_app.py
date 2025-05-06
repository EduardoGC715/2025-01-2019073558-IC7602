from flask import Flask, request, jsonify
import subprocess
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import datetime
import sys
import os
from crontab import CronTab
import logging
from update_firebase import (
    initialize_firebase,
    execute_single_check,
)
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

initialize_firebase()

executor = ThreadPoolExecutor(max_workers=3)


@app.route("/health-check", methods=["GET"])
def health_check():
    """
    Endpoint para realizar un check de salud de los servidores.
    Se espera recibir los siguientes parámetros en la URL:
    - domain_path: ruta del dominio a verificar (ejemplo: "example.com")
    - ip_idx: índice de la IP a verificar (ejemplo: "0" para la primera IP)
    - ip: dirección IP a verificar
    - check_type: tipo de verificación a realizar (ejemplo: "ping", "http", etc.)
    """
    domain_path = request.args.get("domain_path")
    ip_idx = request.args.get("ip_idx")
    ip = request.args.get("ip")
    check_type = request.args.get("check_type")

    logger.info(
        f"Executing health check for {ip} ({domain_path}, idx: {ip_idx}, [PID: {os.getpid()}])"
    )

    def run_check():
        try:
            execute_single_check(domain_path, ip_idx, ip, check_type)
        except Exception as e:
            logger.error(f"Error executing health check: {e}")

    executor.submit(run_check)

    return jsonify({"status": "Health check executed"}), 200


if __name__ == "__main__":

    app.run(host="0.0.0.0", port=5000)
