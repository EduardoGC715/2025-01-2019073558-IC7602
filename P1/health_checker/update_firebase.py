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

def run_health_check(check_type, *args):
    """Run the C health checker with specified check type and arguments"""
    try:
        # Build command based on check type
        command = ["./health_checker"]  # For Linux/WSL
        # command = ["health_checker.exe"]  # For Windows cmd
        
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
        else:
            raise ValueError(f"Unknown check type: {check_type}")
        
        # Convert all arguments to strings
        command = [str(arg) for arg in command]
        
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{timestamp} Running command: {' '.join(command)}")
        
        # Run the health checker
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False
        )
        
        stdout = result.stdout.strip() if result.stdout else ""
        stderr = result.stderr.strip() if result.stderr else ""
        
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{timestamp} Command output: {stdout}")
        if stderr:
            print(f"{timestamp} Command error: {stderr}")
        
        # Debug: print each line for better troubleshooting
        for i, line in enumerate(stdout.splitlines()):
            if "RESULT:" in line:
                print(f"{timestamp} Found result in line {i}: {line}")
        
        # Parse the output to find our JSON result
        for line in stdout.splitlines():
            if "RESULT:" in line:
                json_data = line.split("RESULT:", 1)[1].strip()
                try:
                    parsed_data = json.loads(json_data)
                    return parsed_data
                except json.JSONDecodeError as e:
                    print(f"{timestamp} Error parsing JSON: {e}")
                    print(f"{timestamp} Problematic data: {json_data}")
                
        # If we couldn't find a structured result, create one with the exit code
        return {
            "host": args[0],
            "port": args[1],
            "path": args[2] if len(args) > 2 and check_type == "http" else "",
            "check_type": check_type,
            "success": result.returncode == 0,
            "timeout": args[3] if len(args) > 3 else "5",
            "max_retries": args[4] if len(args) > 4 else "3",
            "acceptable_codes": args[5] if len(args) > 5 and check_type == "http" else "200",
            "error": "Couldn't parse structured output"
        }
    
    except Exception as e:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{timestamp} Exception in run_health_check: {str(e)}")
        # Handle any exceptions
        return {
            "host": args[0] if len(args) > 0 else "unknown",
            "port": args[1] if len(args) > 1 else "unknown",
            "path": args[2] if len(args) > 2 and check_type == "http" else "",
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
    
    # Add additional parameters if they exist in the result
    for field in ["path", "timeout", "max_retries", "acceptable_codes", "status_code", "duration_ms"]:
        if field in check_result:
            health_data[field] = check_result[field]
    
    # Add error if present
    if "error" in check_result:
        health_data["error"] = check_result["error"]
    
    # Generate a key for this host:port
    host_key = f"{check_result['host']}:{check_result['port']}".replace(".", "_")
    
    # Update Firebase
    ref = db.reference("/health_status")
    ref.child(host_key).set(health_data)
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{timestamp} Updated Firebase with health status for {check_result['host']}:{check_result['port']}")
    return health_data

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  TCP check: python update_firebase.py tcp <hostname> <port> [timeout] [max_retries]")
        print("  HTTP check: python update_firebase.py http <hostname> <port> <path> [timeout] [max_retries] [acceptable_status_codes]")
        sys.exit(1)
    
    check_type = sys.argv[1].lower()
    
    if check_type == "tcp":
        if len(sys.argv) < 4:
            print("TCP check requires hostname and port")
            sys.exit(1)
            
        # Extract arguments
        hostname = sys.argv[2]
        port = sys.argv[3]
        timeout = sys.argv[4] if len(sys.argv) > 4 else None
        max_retries = sys.argv[5] if len(sys.argv) > 5 else None
        
        result = run_health_check("tcp", hostname, port, timeout, max_retries)
        
    elif check_type == "http":
        if len(sys.argv) < 5:
            print("HTTP check requires hostname, port, and path")
            sys.exit(1)
            
        # Extract arguments
        hostname = sys.argv[2]
        port = sys.argv[3]
        path = sys.argv[4]
        timeout = sys.argv[5] if len(sys.argv) > 5 else None
        max_retries = sys.argv[6] if len(sys.argv) > 6 else None
        acceptable_codes = sys.argv[7] if len(sys.argv) > 7 else None
        
        result = run_health_check("http", hostname, port, path, timeout, max_retries, acceptable_codes)
        
    else:
        print(f"Unknown check type: {check_type}")
        print("Use 'tcp' or 'http'")
        sys.exit(1)
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{timestamp} Health check result: {json.dumps(result, indent=2)}")
    
    # Update Firebase
    updated = update_firebase(result)
    print(f"{timestamp} Firebase updated: {json.dumps(updated, indent=2)}")

if __name__ == "__main__":
    main()