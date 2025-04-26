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

app = Flask(__name__)

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)


def run_health_check(check_type, *args):
    """Run the C health checker with specified check type and arguments

    Args:
        check_type (str): Type of health check ('tcp' or 'http')
        *args: Arguments for the health check command.
    """
    try:
        # Build command based on check type
        command = ["./health_checker"]  # For Linux/WSL

        if check_type == "tcp":
            if len(args) < 2:
                raise ValueError("TCP check requires hostname and port")

            # Basic required arguments
            command.extend(["--tcp", args[0], args[1]])

            # Optional timeout and retries
            if len(args) > 2 and args[2]:
                command.append(args[2])  # timeout
            if len(args) > 3 and args[3]:
                command.append(args[3])  # max retries

        elif check_type == "http":
            if len(args) < 3:
                raise ValueError("HTTP check requires hostname, port, and path")

            # Basic required arguments
            command.extend(["--http", args[0], args[1], args[2]])

            # Optional timeout, retries, and acceptable status codes
            if len(args) > 3 and args[3]:
                command.append(args[3])  # timeout
            if len(args) > 4 and args[4]:
                command.append(args[4])  # max retries
            if len(args) > 5 and args[5]:
                # For acceptable status codes with commas, we need to ensure proper quoting
                command.append(f"{args[5]}")  # acceptable status codes
            if len(args) > 6 and args[6]:
                # Add host header if provided
                command.append(f"{args[6]}")  # host header
        else:
            raise ValueError(f"Unknown check type: {check_type}")

        # Convert all arguments to strings
        command = [str(arg) for arg in command]

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"{timestamp} Running command: {' '.join(command)}")

        # Run the health checker
        result = subprocess.run(command, capture_output=True, text=True, check=False)

        stdout = result.stdout.strip() if result.stdout else ""
        stderr = result.stderr.strip() if result.stderr else ""

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"{timestamp} Command output: {stdout}")
        if stderr:
            logger.info(f"{timestamp} Command error: {stderr}")

        # Parse the output to find our JSON result
        for line in stdout.splitlines():
            if "RESULT:" in line:
                json_data = line.split("RESULT:", 1)[1].strip()
                try:
                    parsed_data = json.loads(json_data)
                    # Add additional fields to the parsed data
                    parsed_data["timestamp"] = timestamp
                    logger.info(parsed_data)
                    return parsed_data
                except json.JSONDecodeError as e:
                    logger.info(f"{timestamp} Error parsing JSON: {e}")
                    logger.info(f"{timestamp} Problematic data: {json_data}")

        # If we couldn't find a structured result, create one with the exit code
        return {
            "success": result.returncode == 0,
            "timestamp": timestamp,
            "duration": result.returncode,
        }

    except Exception as e:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"{timestamp} Exception in run_health_check: {str(e)}")
        # Handle any exceptions
        return {
            "timestamp": timestamp,
            "success": False,
            "duration": 0,
        }


def initialize_firebase():
    """Initialize Firebase connection and register health checker info"""
    # Find the credentials file
    credential_path = "dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json"

    # Initialize Firebase
    try:
        cred = credentials.Certificate(credential_path)
        firebase_admin.initialize_app(
            cred, {"databaseURL": "https://dnsfire-8c6fd-default-rtdb.firebaseio.com/"}
        )
        logger.info("Firebase initialized successfully.")

        # Register health checker information in a central location
        checker_id = os.environ.get("CHECKER_ID", "default-checker")
        checker_info = {
            "latitude": float(os.environ.get("CHECKER_LAT", "0.0")),
            "longitude": float(os.environ.get("CHECKER_LON", "0.0")),
            "country": os.environ.get("CHECKER_COUNTRY", "Unknown"),
            "continent": os.environ.get("CHECKER_CONTINENT", "Unknown"),
            "last_active": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        # Store checker info in a central location
        checker_ref = db.reference(f"/healthcheckers/{checker_id}")
        checker_ref.update(checker_info)
        logger.info(
            f"Registered health checker: {checker_id} from {checker_info['country']}"
        )

    except ValueError:
        # App already initialized, just update the last_active timestamp
        checker_id = os.environ.get("CHECKER_ID", "default-checker")
        checker_ref = db.reference(f"/healthcheckers/{checker_id}")
        checker_ref.update(
            {"last_active": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        )
        logger.info("Firebase already initialized, updated last_active timestamp.")
    except Exception as e:
        logger.info(f"Error initializing Firebase: {e}")
        sys.exit(1)


initialize_firebase()


def update_ip_health_status(domain_path, ip_idx, ip, health_result):
    """Update the health status of a specific IP in Firebase without storing history"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Get health checker information from environment
    checker_id = os.environ.get("CHECKER_ID", "default-checker")

    # Get the checker info from Firebase
    checker_ref = db.reference(f"/healthcheckers/{checker_id}")
    checker_info = checker_ref.get() or {}

    # Simulate varying latency based on location
    import random

    # Base multiplier depends on geographic distance (simulated)
    # US-based checkers: 1.0x baseline
    # EU-based checkers: 1.2-1.5x baseline
    # Asia-based checkers: 1.5-2.0x baseline
    # Unknown location: Random between 1.0-1.8x
    latency_multiplier = 1.0
    continent = checker_info.get("continent", "").lower()

    if "europe" in continent:
        latency_multiplier = random.uniform(1.2, 1.5)
    elif "asia" in continent:
        latency_multiplier = random.uniform(1.5, 2.0)
    elif "north america" in continent:
        latency_multiplier = random.uniform(0.9, 1.1)
    else:
        # For unknown or other continents
        latency_multiplier = random.uniform(1.0, 1.8)

    # Add some randomness to make it realistic (+/- 20%)
    latency_jitter = random.uniform(0.8, 1.2)
    final_multiplier = latency_multiplier * latency_jitter

    logger.info(health_result)
    # Apply the multiplier to duration
    original_duration = 0
    if "duration_ms" in health_result:
        original_duration = health_result["duration_ms"]
        simulated_duration = original_duration * final_multiplier
        health_result["duration_ms"] = simulated_duration
        logger.info(
            f"Simulated latency for {checker_id}: {original_duration:.2f}ms → {simulated_duration:.2f}ms (multiplier: {final_multiplier:.2f}x)"
        )

    # Update the health field for the IP using index
    # Check if this is a single IP case or multiple IPs case
    if ip_idx == "ip":
        # Single IP case - update at the subdomain level
        ip_ref = db.reference(f"/domains/{domain_path}/ip")
    else:
        # Multiple IPs case - update at the indexed IP level
        ip_ref = db.reference(f"/domains/{domain_path}/ips/{ip_idx}")

    # Get the current IP data to determine overall health
    ip_data = ip_ref.get()

    # Get all current checker results or initialize empty dict
    current_results = {}
    if ip_data and "healthcheck_results" in ip_data:
        current_results = ip_data["healthcheck_results"]

    # Update this checker's result - now just storing ID and basic results
    current_results[checker_id] = {
        "success": health_result["success"],
        "duration_ms": health_result["duration_ms"],
        "timestamp": health_result["timestamp"],
    }

    # Calculate overall health (true if any checker reports success)
    overall_health = any(
        result.get("success", False) for result in current_results.values()
    )

    # Prepare health data
    health_data = {"health": overall_health, "healthcheck_results": current_results}

    # Log the update to a file
    log_entry = {
        "timestamp": timestamp,
        "checker_id": checker_id,
        "domain_path": domain_path,
        "ip": ip,
        "ip_idx": ip_idx,
        "success": health_result["success"],
        "duration_ms": health_result["duration_ms"],
        "original_duration_ms": (
            original_duration if "duration_ms" in health_result else 0
        ),
        "latency_multiplier": final_multiplier,
        "health_data": health_data,
    }

    # Write to log file
    try:
        with open("/app/fb_update.log", "a") as log_file:
            log_file.write(
                f"{timestamp} - {checker_id} - {domain_path}/{ip}: {json.dumps(log_entry)}\n"
            )
    except Exception as e:
        logger.info(f"Error writing to log file: {e}")

    # Update Firebase
    ip_ref.update(health_data)
    logger.info(
        f"{timestamp} Updated health status for {ip} (idx: {ip_idx}) in {domain_path} from {checker_info.get('country', 'Unknown')}: {health_result['success']}"
    )


def build_health_check_args(check_type, ip, config, domain_path=None):
    """Build arguments for health check based on check type and configuration

    Args:
        check_type (str): Type of health check ('tcp' or 'http')
        ip (str): IP address to check
        config (dict): Health check configuration
        domain_path (str, optional): Path to the domain in Firebase (e.g., 'com/google/www')

    Returns:
        list: Arguments for the health check
    """
    if check_type == "tcp":
        # TCP check requires: hostname, port, [timeout], [max_retries]
        port = config.get("port", 80)
        timeout = config.get("timeout", 5)
        max_retries = config.get("max_retries", 3)

        return [ip, port, timeout, max_retries]

    elif check_type == "http":
        # HTTP check requires: hostname, port, path, [timeout], [max_retries], [acceptable_codes], [host_header]
        port = config.get("port", 80)
        path = config.get("path", "/")
        timeout = config.get("timeout", 5)
        max_retries = config.get("max_retries", 3)
        acceptable_codes = config.get("acceptable_codes", "200")

        # Check for explicit host_header in config
        host_header = config.get("host_header", "")

        # If no host_header specified but we have domain_path, create one from domain path
        if not host_header and domain_path:
            try:
                # Parse domain path (e.g., "com/example/www")
                parts = domain_path.split("/")
                if len(parts) >= 3:
                    tld = parts[0]
                    domain = parts[1]
                    subdomain = parts[2]

                    # If subdomain is "www", use "domain.tld"
                    if subdomain == "www":
                        host_header = f"{domain}.{tld}"
                    # Otherwise use "subdomain.domain.tld"
                    else:
                        host_header = f"{subdomain}.{domain}.{tld}"
                    logger.info(
                        f"Generated host header: {host_header} from domain path: {domain_path}"
                    )
            except Exception as e:
                logger.info(f"Error generating host header from domain path: {e}")

        args = [ip, port, path, timeout, max_retries, acceptable_codes]

        # Add host_header if available
        if host_header:
            args.append(host_header)
            logger.info(f"Using host header: {host_header} for IP: {ip}")

        return args

    else:
        logger.info(f"Unsupported health check type: {check_type}")
        return None


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

    # Handle both single IP and multiple IPs cases
    if ip_idx == "ip":
        # Single IP case
        ip_ref = db.reference(f"/domains/{domain_path}/ip")
    else:
        # Multiple IPs case
        ip_ref = db.reference(f"/domains/{domain_path}/ips/{ip_idx}")

    logger.info(f"Fetching data from: {ip_ref.path}")
    ip_data = ip_ref.get()

    if not ip_data:
        logger.info(f"No data found for IP {ip} at path {ip_ref.path}")
        return

    health_check_config = ip_data.get("healthcheck_settings", {})

    if not health_check_config:
        logger.info(f"No health check configuration for IP {ip}")
        return

    # Build health check arguments
    check_args = build_health_check_args(
        check_type, ip, health_check_config, domain_path
    )

    if check_args:
        # Run the health check
        health_result = run_health_check(check_type, *check_args)
        logger.info(f"Health check result for {ip}: {health_result}")

        # Update the health status in Firebase
        update_ip_health_status(domain_path, ip_idx, ip, health_result)
        logger.info(f"Health status updated in Firebase path: {ip_ref.path}")
    else:
        logger.info(f"Invalid health check configuration for {ip}")
    return jsonify({"status": "Health check executed"}), 200


if __name__ == "__main__":

    app.run(host="0.0.0.0", port=5000)
