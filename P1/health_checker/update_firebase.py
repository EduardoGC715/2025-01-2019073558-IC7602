#!/usr/bin/env python3
import subprocess
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import datetime
import sys
import os
import time
import random
import re
import argparse
from crontab import CronTab

# Código basado en:
# https://firebase.google.com/docs/reference/admin/python
# https://cronitor.io/guides/python-cron-jobs
# https://docs.python.org/3/library/subprocess.html


def run_health_check(check_type, *args):
    """ Correr el programa en C del healthchecker con los argumentos dados

    Args:
        check_type (str): Tipo de chequeo ('tcp' o 'http')
        *args: Argumentos para el chequeo de salud (hostname, port, path, etc.)
    """
    try:
        command = ["./health_checker"]

        if check_type == "tcp":
            if len(args) < 2:
                raise ValueError("TCP check requires hostname and port")

            # Argumentos requeridos
            command.extend(["--tcp", args[0], args[1]])

            if len(args) > 2 and args[2]:
                command.append(args[2])  # timeout
            if len(args) > 3 and args[3]:
                command.append(args[3])  # max retries

        elif check_type == "http":
            if len(args) < 3:
                raise ValueError("HTTP check requires hostname, port, and path")

            command.extend(["--http", args[0], args[1], args[2]])

            if len(args) > 3 and args[3]:
                command.append(args[3])  # timeout
            if len(args) > 4 and args[4]:
                command.append(args[4])  # reintentos
            if len(args) > 5 and args[5]:
                command.append(f"{args[5]}")  # status codes aceptables
            if len(args) > 6 and args[6]:
                # host si se proporciona, si no se crea a partir del domain_path
                command.append(f"{args[6]}")  # host
        else:
            raise ValueError(f"Unknown check type: {check_type}")

        # Convertir args a strings
        command = [str(arg) for arg in command]

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{timestamp} Running command: {' '.join(command)}")

        # Ejecutar el comando de health check
        result = subprocess.run(command, capture_output=True, text=True, check=False)

        stdout = result.stdout.strip() if result.stdout else ""
        stderr = result.stderr.strip() if result.stderr else ""

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{timestamp} Command output: {stdout}")
        if stderr:
            print(f"{timestamp} Command error: {stderr}")

        # Pasar la salida a JSON para obtener los resultados
        for line in stdout.splitlines():
            if "RESULT:" in line:
                json_data = line.split("RESULT:", 1)[1].strip()
                try:
                    parsed_data = json.loads(json_data)
                    # añadir el timestamp a los resultados
                    parsed_data["timestamp"] = timestamp
                    return parsed_data
                except json.JSONDecodeError as e:
                    print(f"{timestamp} Error parsing JSON: {e}")
                    print(f"{timestamp} Problematic data: {json_data}")

        # Si no se encuentra la salida JSON, devolver un resultado por defecto, en caso de algun error
        return {
            "success": result.returncode == 0,
            "timestamp": timestamp,
            "duration": result.returncode,
        }

    except Exception as e:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{timestamp} Exception in run health check function: {str(e)}")
        # Handle any exceptions
        return {
            "timestamp": timestamp,
            "success": False,
            "duration": 0,
        }


def initialize_firebase():
    """Inicializa Firebase para registrar la información del health checker"""
    credential_path = "dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json"
    try:
        cred = credentials.Certificate(credential_path)
        firebase_admin.initialize_app(
            cred, {"databaseURL": "https://dnsfire-8c6fd-default-rtdb.firebaseio.com/"}
        )
        print("Firebase initialized successfully.")

        # Registrar el health checker
        checker_id = os.environ.get("CHECKER_ID", "default-checker")
        checker_info = {
            "latitude": float(os.environ.get("CHECKER_LAT", "0.0")),
            "longitude": float(os.environ.get("CHECKER_LON", "0.0")),
            "country": os.environ.get("CHECKER_COUNTRY", "Unknown"),
            "continent": os.environ.get("CHECKER_CONTINENT", "Unknown"),
            "last_active": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        checker_ref = db.reference(f"/healthcheckers/{checker_id}")
        checker_ref.update(checker_info)
        print(f"Registered health checker: {checker_id} from {checker_info['country']}")

    except ValueError:
        # Si Firebase ya está inicializado, solo actualiza el timestamp
        checker_id = os.environ.get("CHECKER_ID", "default-checker")
        checker_ref = db.reference(f"/healthcheckers/{checker_id}")
        checker_ref.update(
            {"last_active": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        )
        print("Firebase already initialized, updated last_active timestamp.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        sys.exit(1)


def update_ip_health_status(domain_path, ip_idx, ip, health_result):
    """Actualizar el estado de salud del IP en Firebase"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Obtener el ID del health checker desde las variables de entorno
    checker_id = os.environ.get("CHECKER_ID", "default-checker")

    # Obtener la información del health checker desde Firebase
    checker_ref = db.reference(f"/healthcheckers/{checker_id}")
    checker_info = checker_ref.get() or {}

    # La latencia se simula en base a la región del health checker (de igual forma es un random)
    latency_multiplier = 1.0
    continent = checker_info.get("continent", "").lower()

    if "europe" in continent:
        latency_multiplier = random.uniform(1.2, 1.5)
    elif "asia" in continent:
        latency_multiplier = random.uniform(1.5, 2.0)
    elif "north america" in continent:
        latency_multiplier = random.uniform(0.9, 1.1)
    else:
        # Para otras regiones
        latency_multiplier = random.uniform(1.0, 1.8)

    latency_jitter = random.uniform(0.8, 1.2)
    final_multiplier = latency_multiplier * latency_jitter

    original_duration = 0
    if "duration_ms" in health_result:
        original_duration = health_result["duration_ms"]
        simulated_duration = original_duration * final_multiplier
        health_result["duration_ms"] = simulated_duration
        print(
            f"Simulated latency for {checker_id}: {original_duration:.2f}ms → {simulated_duration:.2f}ms (multiplier: {final_multiplier:.2f}x)"
        )

    # Actualizar el health checker con la información de la verificación
    # Verificar si es un IP único o una lista de IPs
    if ip_idx == "ip":
        ip_ref = db.reference(f"/domains/{domain_path}/ip")
    else:
        ip_ref = db.reference(f"/domains/{domain_path}/ips/{ip_idx}")

    # Obtener la información del IP desde Firebase
    ip_data = ip_ref.get()

    # Verificar si la información del IP existe
    current_results = {}
    if ip_data and "healthcheck_results" in ip_data:
        current_results = ip_data["healthcheck_results"]

    # Actualizar el estado de salud del IP en Firebase
    current_results[checker_id] = {
        "success": health_result["success"],
        "duration_ms": health_result["duration_ms"],
        "timestamp": health_result["timestamp"],
    }

    # Determinar el estado de salud general
    overall_health = any(
        result.get("success", False) for result in current_results.values()
    )

    health_data = {"health": overall_health, "healthcheck_results": current_results}

    # Actualizar Firebase
    ip_ref.update(health_data)
    print(
        f"{timestamp} Updated health status for {ip} (idx: {ip_idx}) in {domain_path} from {checker_info.get('country', 'Unknown')}: {health_result['success']}"
    )


def build_health_check_args(check_type, ip, config, domain_path=None):
    """ Construir los argumentos para el chequeo de salud

    Args:
        check_type (str): Tipo de chequeo ('tcp' o 'http')
        ip (str): IP a verificar
        config (dict): Configuración del chequeo de salud
        domain_path (str, optional): Ruta del dominio en Firebase (e.g., 'com/google/www'). Defaults to None.

    Returns:
        list: argumentos para ejecutar el programa en c del healthchecker
    """
    if check_type == "tcp":
        # TCP requiere: hostname, port, [timeout], [max_retries]
        port = config.get("port", 80)
        timeout = config.get("timeout", 5)
        max_retries = config.get("max_retries", 3)

        return [ip, port, timeout, max_retries]

    elif check_type == "http":
        # HTTP requiere: hostname, port, path, [timeout], [max_retries], [acceptable_codes], [host_header]
        port = config.get("port", 80)
        path = config.get("path", "/")
        timeout = config.get("timeout", 5)
        max_retries = config.get("max_retries", 3)
        acceptable_codes = config.get("acceptable_codes", "200")
        host_header = config.get("host_header", "")

        # Si no se proporciona un host_header, se genera a partir del domain_path
        if not host_header and domain_path:
            try:
                parts = domain_path.split("/")
                parts.reverse()  # Revertir el orden de los elementos
                host_header = ".".join(parts)  # Unir los elementos con '.'
                print(
                    f"Generated host header: {host_header} from domain path: {domain_path}"
                )
            except Exception as e:
                print(f"Error generating host header from domain path: {e}")

        args = [ip, port, path, timeout, max_retries, acceptable_codes]

        if host_header:
            args.append(host_header)
            print(f"Using host header: {host_header} for IP: {ip}")

        return args

    else:
        print(f"Unsupported health check type: {check_type}")
        return None


def scan_and_update_crontab():
    """
    Revisar y actualizar el crontab con los trabajos de verificación de salud
    """
    print("Starting Firebase scan to update crontab...")

    initialize_firebase()

    # Obtener la referencia a la base de datos de Firebase
    tlds_ref = db.reference("/domains")
    all_tlds = tlds_ref.get()

    if not all_tlds:
        print("No TLDs found in Firebase.")
        return

    # Crear un objeto CronTab para el usuario actual
    cron = CronTab(user=True)

    # Buscar trabajos existentes con el comentario "health_check"
    existing_jobs = {}
    for job in cron.find_comment("health_check"):
        # Extraer el comando y los parámetros del trabajo existente
        cmd = job.command
        domain_path_match = re.search(r"domain_path=([^&]+)", cmd)
        ip_idx_match = re.search(r"ip_idx=([^&]+)", cmd)
        ip_match = re.search(r"ip=([^&]+)", cmd)
        print(f"Job command: {cmd}")
        if domain_path_match and ip_idx_match and ip_match:
            domain_path = domain_path_match.group(1)
            ip_idx = ip_idx_match.group(1)
            ip = ip_match.group(1)

            # Crear un ID de trabajo único basado en el dominio y la IP
            job_id = f"{domain_path}|{ip_idx}|{ip}"
            existing_jobs[job_id] = job
            print(f"Found existing job: {job_id}")
    
    print(f"Found {len(existing_jobs)} existing health check jobs")

    # Conjunto para almacenar trabajos requeridos
    required_jobs = set()
    new_job_count = 0
    updated_job_count = 0

    # Recorrer todos los TLDs y dominios en Firebase
    all_ips = find_all_ips(all_tlds)
    for domain_path, ip_data in all_ips.items():
        if "address" in ip_data:
            # Caso 1: IP única en el campo "ip"
            ip_idx = "ip"
            ip = ip_data["address"]
            health_check_config = ip_data.get("healthcheck_settings", {})
            if not health_check_config:
                print(f"No health check configuration for IP {ip} at {domain_path}")
                continue
            check_type = health_check_config.get("type", "tcp")
            frequency = health_check_config.get("crontab", "*/2 * * * *")

            command = f"curl -X GET 'http://localhost:5000/health-check?domain_path={domain_path}&ip_idx=ip&ip={ip}&check_type={check_type}'"
            comment = f"health_check"
            job_id = f"{domain_path}|{ip_idx}|{ip}"
            required_jobs.add(job_id)
            if job_id in existing_jobs:
                print(f"Job {job_id} already exists in crontab")
                # Actualizar el trabajo existente
                old_frequency = str(existing_jobs[job_id].slices)
                if old_frequency != frequency:
                    existing_jobs[job_id].setall(frequency)
                    print(f"Updated job frequency for {job_id} from {old_frequency} to {frequency}")
                    updated_job_count += 1
                if existing_jobs[job_id].command != command:
                    existing_jobs[job_id].set_command(command)
                    print(f"Updated job command for {job_id} to {command}")
                    updated_job_count += 1
            else:
                print(f"Creating new job {job_id} in crontab")
                # Crear un nuevo trabajo
                job = cron.new(command=command, comment=comment)
                job.setall(frequency)
                new_job_count += 1
        else:
            if isinstance(ip_data, dict):
                items = ip_data.items()
            elif isinstance(ip_data, list):
                items = enumerate(ip_data)
            else:
                continue
            # Caso 2: IPs múltiples en el campo "ips"
            for ip_idx, single_ip in items:
                if not isinstance(single_ip, dict):
                    continue
                ip = single_ip.get("address")
                health_check_config = single_ip.get("healthcheck_settings", {})
                if not health_check_config:
                    print(f"No health check configuration for IP {ip} at {domain_path}")
                    continue
                check_type = health_check_config.get("type", "tcp")
                frequency = health_check_config.get("crontab", "*/2 * * * *")

                command = f"curl -X GET 'http://localhost:5000/health-check?domain_path={domain_path}&ip_idx={ip_idx}&ip={ip}&check_type={check_type}'"
                _comment = f"health_check"
                job_id = f"{domain_path}|{ip_idx}|{ip}"
                required_jobs.add(job_id)
                if job_id in existing_jobs:
                    # Actualizar el trabajo existente
                    old_frequency = str(existing_jobs[job_id].slices)
                    if old_frequency != frequency:
                        existing_jobs[job_id].setall(frequency)
                        print(f"Updated job frequency for {job_id} from {old_frequency} to {frequency}")
                        updated_job_count += 1
                else:
                    # Crear un nuevo trabajo
                    job = cron.new(command=command, comment=_comment)
                    job.setall(frequency)
                    new_job_count += 1
    # Eliminar trabajos que no están en required_jobs
    removal_count = 0
    for job_id, job in existing_jobs.items():
        if job_id not in required_jobs:
            cron.remove(job)
            removal_count += 1
            print(f"Removed job {job_id} from crontab")
    cron.write()
    print(f"Updated crontab: existing jobs {len(existing_jobs)}, {new_job_count} new jobs, {updated_job_count} updated jobs, {removal_count} removed jobs")

def find_all_ips(domains, path=""):
    """
    Recorre recursivamente los dominios para encontrar claves 'ip' o 'ips'.
    
    Args:
        domains: Diccionario a recorrer
        path: Ruta actual (usado en la recursión)
        
    Returns:
        Un diccionario donde las claves son las rutas y los valores son los diccionarios 'ip' o 'ips'
    """
    results = {}
    
    if not isinstance(domains, dict):
        return results
    
    # Buscar las claves ip o ips directamente en este nivel
    if 'ip' in domains:
        results[path] = domains['ip']
    
    if 'ips' in domains:
        results[path] = domains['ips']
    
    # Explorar recursivamente las demás claves
    for key, value in domains.items():
        if key != 'ip' and key != 'ips' and isinstance(value, dict):
            # Construir la nueva ruta
            new_path = f"{path}/{key}" if path else key
            # Llamada recursiva y fusionar resultados
            sub_results = find_all_ips(value, new_path)
            results.update(sub_results)
    
    return results

def execute_single_check(domain_path, ip_idx, ip, check_type):
    """
    Ejecutar un check de salud único para una IP específica en Firebase

    Args:
        domain_path (str): Ruta del dominio en Firebase (e.g., 'com/google/www')
        ip_idx (str): El índice de la IP (o 'ip' para una IP única)
        ip (str): Dirección IP a verificar
        check_type (str): Tipo de chequeo ('tcp' o 'http')
    """
    print(f"Executing health check for {ip} ({domain_path}, idx: {ip_idx})")

    # Manejar el caso de IP única o múltiples IPs
    if ip_idx == "ip":
        ip_ref = db.reference(f"/domains/{domain_path}/ip")
    else:
        ip_ref = db.reference(f"/domains/{domain_path}/ips/{ip_idx}")

    print(f"Fetching data from: {ip_ref.path}")
    ip_data = ip_ref.get()

    if not ip_data:
        print(f"No data found for IP {ip} at path {ip_ref.path}")
        return

    health_check_config = ip_data.get("healthcheck_settings", {})

    if not health_check_config:
        print(f"No health check configuration for IP {ip}")
        return

    # Construir los argumentos para el chequeo de salud
    check_args = build_health_check_args(
        check_type, ip, health_check_config, domain_path
    )

    if check_args:
        health_result = run_health_check(check_type, *check_args)
        print(f"Health check result for {ip}: {health_result}")

        update_ip_health_status(domain_path, ip_idx, ip, health_result)
        print(f"Health status updated in Firebase path: {ip_ref.path}")
    else:
        print(f"Invalid health check configuration for {ip}")


def main():
    """Función principal para ejecutar el script"""

    parser = argparse.ArgumentParser(description="Firebase Health Checker")
    parser.add_argument(
        "--scan", action="store_true", help="Scan Firebase and update crontab"
    )
    parser.add_argument(
        "--execute", action="store_true", help="Execute a single health check"
    )
    parser.add_argument(
        "--domain-path", help="Domain path for single check (e.g., 'com/google/www')"
    )
    parser.add_argument("--ip-idx", help="IP index for single check")
    parser.add_argument("--ip", help="IP address for single check")
    parser.add_argument(
        "--check-type", help="Check type (tcp or http) for single check"
    )

    args = parser.parse_args()

    if args.scan:
        scan_and_update_crontab()
    elif (
        args.execute
        and args.domain_path
        and args.ip_idx
        and args.ip
        and args.check_type
    ):
        execute_single_check(args.domain_path, args.ip_idx, args.ip, args.check_type)


if __name__ == "__main__":
    main()
