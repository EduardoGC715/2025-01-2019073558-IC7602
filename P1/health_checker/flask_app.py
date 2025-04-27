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

app = Flask(__name__)

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

initialize_firebase()


@app.route("/health-check", methods=["GET"])
def health_check():
    """
    Endpoint to execute a single health check.
    Query Parameters:
        - domain_path: Path to the domain in Firebase (e.g., 'com/google/www')
        - ip_idx: IP index for single check
        - ip: IP address for single check
        - check_type: Check type (tcp or http) for single check
    """
    domain_path = request.args.get("domain_path")
    ip_idx = request.args.get("ip_idx")
    ip = request.args.get("ip")
    check_type = request.args.get("check_type")

    logger.info(f"Executing health check for {ip} ({domain_path}, idx: {ip_idx})")

    try:
        execute_single_check(domain_path, ip_idx, ip, check_type)
        return jsonify({"status": "Health check executed"}), 200
    except:
        logger.error(f"Error executing health check: {sys.exc_info()[1]}")
        return jsonify({"status": "Error executing health check"}), 500


if __name__ == "__main__":

    app.run(host="0.0.0.0", port=5000)
