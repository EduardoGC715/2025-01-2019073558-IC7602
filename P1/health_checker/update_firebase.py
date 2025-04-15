import subprocess
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import datetime
import sys
import os

def run_health_check(check_type, *args):
    """Run the C health checker with specified check type and arguments"""
    try:
        # Build command based on check type
        command = ["./health_checker"]  # For Linux/WSL
        # command = ["health_checker.exe"]  # For Windows cmd
        
        if check_type == "tcp":
            if len(args) != 2:
                raise ValueError("TCP check requires hostname and port")
            command.extend(["--tcp", args[0], args[1]])
        elif check_type == "http":
            if len(args) != 3:
                raise ValueError("HTTP check requires hostname, port, and path")
            command.extend(["--http", args[0], args[1], args[2]])
        else:
            raise ValueError(f"Unknown check type: {check_type}")
            
        # Run the health checker
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False
        )
        
        # Parse the output to find our JSON result
        for line in result.stdout.splitlines():
            if line.startswith("RESULT: "):
                json_data = line[8:]  # Remove the "RESULT: " prefix
                return json.loads(json_data)
                
        # If we couldn't find a structured result, create one with the exit code
        return {
            "host": args[0],
            "port": args[1],
            "path": args[2] if len(args) > 2 else "",
            "check_type": check_type,
            "success": result.returncode == 0,
            "error": "Couldn't parse structured output"
        }
    
    except Exception as e:
        # Handle any exceptions
        return {
            "host": args[0] if len(args) > 0 else "unknown",
            "port": args[1] if len(args) > 1 else "unknown",
            "path": args[2] if len(args) > 2 else "",
            "check_type": check_type,
            "success": False,
            "error": str(e)
        }

def update_firebase(check_result):
    """Update Firebase with the health check results"""
    # Find the credentials file
    credential_path = "dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json"
    
    # Initialize Firebase
    try:
        cred = credentials.Certificate(credential_path)
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://dnsfire-8c6fd-default-rtdb.firebaseio.com/"
        })
    except ValueError:
        # App already initialized
        pass
    
    # Prepare data for Firebase
    health_data = {
        "host": check_result["host"],
        "port": check_result["port"],
        "check_type": check_result["check_type"],
        "success": check_result["success"],
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Add path for HTTP checks
    if "path" in check_result and check_result["path"]:
        health_data["path"] = check_result["path"]
    
    # Add error if present
    if "error" in check_result:
        health_data["error"] = check_result["error"]
    
    # Generate a key for this host:port
    host_key = f"{check_result['host']}:{check_result['port']}".replace(".", "_")
    
    # Update Firebase
    ref = db.reference("/health_status")
    ref.child(host_key).set(health_data)
    print(f"Updated Firebase with health status for {check_result['host']}:{check_result['port']}")
    return health_data

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  TCP check: python update_firebase.py tcp <hostname> <port>")
        print("  HTTP check: python update_firebase.py http <hostname> <port> <path>")
        sys.exit(1)
    
    check_type = sys.argv[1].lower()
    
    if check_type == "tcp":
        if len(sys.argv) < 4:
            print("TCP check requires hostname and port")
            sys.exit(1)
        result = run_health_check("tcp", sys.argv[2], sys.argv[3])
    elif check_type == "http":
        if len(sys.argv) < 5:
            print("HTTP check requires hostname, port, and path")
            sys.exit(1)
        result = run_health_check("http", sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(f"Unknown check type: {check_type}")
        print("Use 'tcp' or 'http'")
        sys.exit(1)
    
    print(f"Health check result: {result}")
    
    # Update Firebase
    updated = update_firebase(result)
    print(f"Firebase updated: {updated}")

if __name__ == "__main__":
    main()