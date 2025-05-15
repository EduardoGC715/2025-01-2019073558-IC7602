import json
import subprocess
import time

with open("checkers.json", "r") as f:
    data = json.load(f)

checkers = data.get("checkers", [])

for checker in checkers:
    container_name = f"checker-{checker['id']}"

    cmd = [
        "docker",
        "run",
        "-d",
        "--name",
        container_name,
        "-e",
        f"CHECKER_ID={checker['id']}",
        "-e",
        f"CHECKER_LAT={checker['lat']}",
        "-e",
        f"CHECKER_LON={checker['lon']}",
        "-e",
        f"CHECKER_COUNTRY={checker['country']}",
        "-e",
        f"CHECKER_CONTINENT={checker['continent']}",
        "dandiego235/dns-health-checker:latest",
    ]

    print(f"Starting container: {container_name}")
    try:
        result = subprocess.run(cmd, text=True, check=True)
        print(f"Started: {container_name}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to start {container_name}")

time.sleep(5)


print("Starting Interceptor, API, and Web UI...")
compose_cmd = ["docker-compose", "up", "-d"]
try:
    result = subprocess.run(compose_cmd, text=True, check=True)
    print(f"Started containers.")
except subprocess.CalledProcessError as e:
    print(f"Failed to start containers.")
