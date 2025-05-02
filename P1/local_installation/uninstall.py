import json
import subprocess

with open("checkers.json", "r") as f:
    data = json.load(f)

checkers = data.get("checkers", [])

for checker in checkers:
    container_name = f"checker-{checker['id']}"
    print(f"Stopping and removing container: {container_name}")

    try:
        subprocess.run(["docker", "rm", "-f", container_name], check=True, text=True)
        print(f"Removed: {container_name}")
    except subprocess.CalledProcessError as e:
        print(f"Could not remove {container_name}: {e}")

print("\nStopping and removing docker-compose services (Interceptor, API, Web UI)...")
try:
    subprocess.run(["docker-compose", "down"], check=True, text=True)
    print("Docker Compose services stopped and removed.")
except subprocess.CalledProcessError as e:
    print(f"Failed to stop docker-compose services: {e}")
