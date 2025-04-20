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
import argparse
from crontab import CronTab 

print("=" * 50)
print("DEBUG - ENVIRONMENT VARIABLES:")
print(f"CHECKER_ID: {os.environ.get('CHECKER_ID', 'NOT SET')}")
print(f"CHECKER_COUNTRY: {os.environ.get('CHECKER_COUNTRY', 'NOT SET')}")
print(f"CHECKER_LAT: {os.environ.get('CHECKER_LAT', 'NOT SET')}")
print(f"CHECKER_LON: {os.environ.get('CHECKER_LON', 'NOT SET')}")
print(f"CHECKER_CONTINENT: {os.environ.get('CHECKER_CONTINENT', 'NOT SET')}")
print("=" * 50)

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
        
        # Parse the output to find our JSON result
        for line in stdout.splitlines():
            if "RESULT:" in line:
                json_data = line.split("RESULT:", 1)[1].strip()
                try:
                    parsed_data = json.loads(json_data)
                    # Add additional fields to the parsed data
                    parsed_data["timestamp"] = timestamp
                    return parsed_data
                except json.JSONDecodeError as e:
                    print(f"{timestamp} Error parsing JSON: {e}")
                    print(f"{timestamp} Problematic data: {json_data}")
                
        # If we couldn't find a structured result, create one with the exit code
        return {
            "success": result.returncode == 0,
            "timestamp": timestamp,
            "duration": result.returncode,
        }
    
    except Exception as e:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{timestamp} Exception in run_health_check: {str(e)}")
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
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://dnsfire-8c6fd-default-rtdb.firebaseio.com/"
        })
        print("Firebase initialized successfully.")
        
        # Register health checker information in a central location
        checker_id = os.environ.get("CHECKER_ID", "default-checker")
        checker_info = {
            "latitude": float(os.environ.get("CHECKER_LAT", "0.0")),
            "longitude": float(os.environ.get("CHECKER_LON", "0.0")),
            "country": os.environ.get("CHECKER_COUNTRY", "Unknown"),
            "continent": os.environ.get("CHECKER_CONTINENT", "Unknown"),
            "last_active": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Store checker info in a central location
        checker_ref = db.reference(f"/healthcheckers/{checker_id}")
        checker_ref.update(checker_info)
        print(f"Registered health checker: {checker_id} from {checker_info['country']}")
        
    except ValueError:
        # App already initialized, just update the last_active timestamp
        checker_id = os.environ.get("CHECKER_ID", "default-checker")
        checker_ref = db.reference(f"/healthcheckers/{checker_id}")
        checker_ref.update({
            "last_active": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        print("Firebase already initialized, updated last_active timestamp.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        sys.exit(1)

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
    
    # Apply the multiplier to duration
    original_duration = 0
    if "duration_ms" in health_result:
        original_duration = health_result["duration_ms"]
        simulated_duration = original_duration * final_multiplier
        health_result["duration_ms"] = simulated_duration
        print(f"Simulated latency for {checker_id}: {original_duration:.2f}ms → {simulated_duration:.2f}ms (multiplier: {final_multiplier:.2f}x)")
    
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
    overall_health = any(result.get("success", False) for result in current_results.values())
    
    # Prepare health data
    health_data = {
        "health": overall_health,
        "healthcheck_results": current_results
    }
    
    # Log the update to a file
    log_entry = {
        "timestamp": timestamp,
        "checker_id": checker_id,
        "domain_path": domain_path,
        "ip": ip,
        "ip_idx": ip_idx,
        "success": health_result["success"],
        "duration_ms": health_result["duration_ms"],
        "original_duration_ms": original_duration if "duration_ms" in health_result else 0,
        "latency_multiplier": final_multiplier,
        "health_data": health_data
    }
    
    # Write to log file
    try:
        with open("/app/fb_update.log", "a") as log_file:
            log_file.write(f"{timestamp} - {checker_id} - {domain_path}/{ip}: {json.dumps(log_entry)}\n")
    except Exception as e:
        print(f"Error writing to log file: {e}")
    
    # Update Firebase
    ip_ref.update(health_data)
    print(f"{timestamp} Updated health status for {ip} (idx: {ip_idx}) in {domain_path} from {checker_info.get('country', 'Unknown')}: {health_result['success']}")

def fetch_domains_and_run_health_checks():
    """Fetch domains from Firebase and run health checks on all IPs"""
    # Get all TLDs (like 'com')
    root_ref = db.reference("/domains")
    all_tlds = root_ref.get()
    
    if not all_tlds:
        print("No TLDs found in Firebase.")
        return
    
    for tld_name, tld_data in all_tlds.items():
        # Skip non-TLD entries or non-dictionary entries
        if not isinstance(tld_data, dict):
            continue
            
        print(f"Processing TLD: {tld_name}")
        
        # Process each domain under the TLD
        for domain_name, domain_data in tld_data.items():
            if not isinstance(domain_data, dict):
                continue
                
            print(f"  Processing domain: {domain_name}")
            
            # Process each subdomain (www, etc.)
            for subdomain, subdomain_data in domain_data.items():
                domain_path = f"{tld_name}/{domain_name}/{subdomain}"
                
                if not isinstance(subdomain_data, dict):
                    continue
                
                # CASE 1: Single IP directly in the subdomain data
                if "ip" in subdomain_data:
                    ip_data = subdomain_data.get("ip", {})
                    
                    # Check if ip_data is a dictionary and has an address
                    if "address" in ip_data:
                        ip = ip_data.get("address")
                        print(f"      Checking single IP: {ip}")
                        
                        # Get health check settings from the IP data
                        health_check_config = ip_data.get("healthcheck_settings", {})
                        
                        if not health_check_config:
                            print(f"      No health check configuration for IP {ip}")
                            continue
                        
                        # Get health check type and parameters
                        check_type = health_check_config.get("type")
                        if not check_type:
                            print(f"      No health check type specified for IP {ip}")
                            continue
                        
                        # Build health check arguments based on the check type
                        check_args = build_health_check_args(check_type, ip, health_check_config, domain_path)
                        
                        if check_args:
                            # Run the health check
                            health_result = run_health_check(check_type, *check_args)
                            print(f"        Health check result for {ip}: {health_result}")
                            # Update the health status in Firebase (use "ip" as the key for single IP)
                            update_ip_health_status(domain_path, "ip", ip, health_result)
                        else:
                            print(f"        Invalid health check configuration for {ip}")
                    else:
                        print(f"      Invalid IP data structure for subdomain {subdomain}")
                # CASE 2: Multiple IPs in the "ips" field
                elif "ips" in subdomain_data:
                    ips_data = subdomain_data.get("ips", {})
                    
                    # Process each IP index
                    if isinstance(ips_data, dict):
                        # Handle dictionary case (keys are indices)
                        items = ips_data.items()
                    elif isinstance(ips_data, list):
                        # Handle list case (enumerate to get indices)
                        items = enumerate(ips_data)
                    else:
                        print(f"      IPs data is neither a dictionary nor a list: {type(ips_data)}")
                        continue
                    
                    # Process each IP in the collection
                    for ip_idx, ip_data in items:
                        # Convert index to string if it's an integer (from list enumeration)
                        ip_idx = str(ip_idx)
                        
                        # Get the IP address
                        if not isinstance(ip_data, dict) or "address" not in ip_data:
                            print(f"      Invalid IP data at index {ip_idx}")
                            continue
                        
                        ip = ip_data.get("address")
                        print(f"      Checking IP: {ip} (index: {ip_idx})")
                        
                        # Get health check settings from the IP data
                        health_check_config = ip_data.get("healthcheck_settings", {})
                        
                        if not health_check_config:
                            print(f"      No health check configuration for IP {ip}")
                            continue
                        
                        # Get health check type and parameters
                        check_type = health_check_config.get("type")
                        if not check_type:
                            print(f"      No health check type specified for IP {ip}")
                            continue
                        
                        # Build health check arguments based on the check type
                        check_args = build_health_check_args(check_type, ip, health_check_config, domain_path)
                        
                        if check_args:
                            # Run the health check
                            health_result = run_health_check(check_type, *check_args)
                            print(f"        Health check result for {ip}: {health_result}")
                            # Update the health status in Firebase
                            update_ip_health_status(domain_path, ip_idx, ip, health_result)
                        else:
                            print(f"        Invalid health check configuration for {ip}")
                else:
                    print(f"      No IPs found for subdomain: {subdomain}")

def setup_logging():
    """Initialize log file with header information"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    checker_id = os.environ.get("CHECKER_ID", "default-checker")
    checker_country = os.environ.get("CHECKER_COUNTRY", "Unknown")
    
    try:
        with open("/app/fb_update.log", "a") as log_file:
            log_file.write(f"\n{'-'*80}\n")
            log_file.write(f"{timestamp} - Health checker started: {checker_id} from {checker_country}\n")
            log_file.write(f"Environment variables:\n")
            log_file.write(f"  CHECKER_ID: {os.environ.get('CHECKER_ID', 'NOT SET')}\n")
            log_file.write(f"  CHECKER_COUNTRY: {os.environ.get('CHECKER_COUNTRY', 'NOT SET')}\n")
            log_file.write(f"  CHECKER_LAT: {os.environ.get('CHECKER_LAT', 'NOT SET')}\n")
            log_file.write(f"  CHECKER_LON: {os.environ.get('CHECKER_LON', 'NOT SET')}\n")
            log_file.write(f"  CHECKER_CONTINENT: {os.environ.get('CHECKER_CONTINENT', 'NOT SET')}\n")
            log_file.write(f"{'-'*80}\n\n")
    except Exception as e:
        print(f"Error initializing log file: {e}")

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
                parts = domain_path.split('/')
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
                    print(f"Generated host header: {host_header} from domain path: {domain_path}")
            except Exception as e:
                print(f"Error generating host header from domain path: {e}")
        
        args = [ip, port, path, timeout, max_retries, acceptable_codes]
        
        # Add host_header if available
        if host_header:
            args.append(host_header)
            print(f"Using host header: {host_header} for IP: {ip}")
        
        return args
    
    else:
        print(f"Unsupported health check type: {check_type}")
        return None

def scan_and_update_crontab():
    """
    Scans Firebase for domains and IPs to monitor and updates crontab with 
    individual health check jobs
    """
    print("Starting Firebase scan to update crontab...")

    # Get environment variables to pass to cron jobs
    checker_id = os.environ.get("CHECKER_ID", "default-checker")
    checker_lat = os.environ.get("CHECKER_LAT", "0.0")
    checker_lon = os.environ.get("CHECKER_LON", "0.0")
    checker_country = os.environ.get("CHECKER_COUNTRY", "Unknown")
    checker_continent = os.environ.get("CHECKER_CONTINENT", "Unknown")
    
    # Initialize Firebase if not already initialized
    initialize_firebase()
    
    # Get all TLDs
    root_ref = db.reference("/domains")
    all_tlds = root_ref.get()
    
    if not all_tlds:
        print("No TLDs found in Firebase.")
        return
    
    # Create a crontab for the current user
    cron = CronTab(user=True)
    
    # Clear existing health check jobs
    cron.remove_all(comment="health_check")
    
    job_count = 0
    
    # Iterate through the domains and create cron jobs
    for tld_name, tld_data in all_tlds.items():
        if not isinstance(tld_data, dict):
            continue
            
        for domain_name, domain_data in tld_data.items():
            if not isinstance(domain_data, dict):
                continue
                
            for subdomain, subdomain_data in domain_data.items():
                domain_path = f"{tld_name}/{domain_name}/{subdomain}"
                
                if not isinstance(subdomain_data, dict):
                    continue
                
                # CASE 1: Single IP directly in the subdomain data
                if "ip" in subdomain_data:
                    ip_data = subdomain_data.get("ip", {})
                    
                    # Check if ip_data is a dictionary and has an address
                    if "address" in ip_data:
                        ip = ip_data.get("address")
                        try:
                            with open("/app/fb_update.log", "a") as log_file:
                                log_file.write(f"{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Single IP reached in crontab: {ip} in {domain_path}\n")
                        except Exception as e:
                            print(f"Error writing to log file: {e}")
                        health_check_config = ip_data.get("healthcheck_settings", {})
                        
                        if not health_check_config:
                            continue
                        
                        check_type = health_check_config.get("type")
                        if not check_type:
                            continue
                        
                        # Create a cron job for this single IP
                        frequency = health_check_config.get("crontab", "*/2 * * * *")
                        
                        # Check if frequency already includes full cron format (5 parts)
                        if " " not in frequency or frequency.count(" ") < 4:
                            # If it's just the minute part or incomplete, add the rest
                            frequency = f"{frequency} * * * *"
                        
                        command = f"cd {os.getcwd()} && CHECKER_ID='{checker_id}' CHECKER_LAT='{checker_lat}' CHECKER_LON='{checker_lon}' CHECKER_COUNTRY='{checker_country}' CHECKER_CONTINENT='{checker_continent}' python3 update_firebase.py --execute --domain-path '{domain_path}' --ip-idx 'ip' --ip '{ip}' --check-type '{check_type}'"
                        
                        # Create cron job with the appropriate frequency
                        job = cron.new(command=command, comment="health_check")
                        try:
                            job.setall(frequency)  # Set the full cron expression
                        except Exception as e:
                            print(f"Error setting cron schedule '{frequency}' for {ip}: {e}")
                            print(f"Using default schedule '*/2 * * * *' instead")
                            job.setall("*/2 * * * *")
                        
                        job_count += 1
                
                # CASE 2: Multiple IPs in the "ips" field
                elif "ips" in subdomain_data:
                    ips_data = subdomain_data.get("ips", {})
                    
                    if isinstance(ips_data, dict):
                        items = ips_data.items()
                    elif isinstance(ips_data, list):
                        items = enumerate(ips_data)
                    else:
                        continue
                    
                    for ip_idx, ip_data in items:
                        ip_idx = str(ip_idx)
                        
                        if not isinstance(ip_data, dict) or "address" not in ip_data:
                            continue
                        
                        ip = ip_data.get("address")
                        health_check_config = ip_data.get("healthcheck_settings", {})
                        
                        if not health_check_config:
                            continue
                        
                        check_type = health_check_config.get("type")
                        if not check_type:
                            continue
                        
                        # Create a cron job for this specific IP
                        frequency = health_check_config.get("crontab", "*/2 * * * *")  # Default to every 2 minutes

                        # Check if frequency already includes full cron format (5 parts)
                        if " " not in frequency or frequency.count(" ") < 4:
                            # If it's just the minute part or incomplete, add the rest
                            frequency = f"{frequency} * * * *"

                        command = f"cd {os.getcwd()} && CHECKER_ID='{checker_id}' CHECKER_LAT='{checker_lat}' CHECKER_LON='{checker_lon}' CHECKER_COUNTRY='{checker_country}' CHECKER_CONTINENT='{checker_continent}' python3 update_firebase.py --execute --domain-path '{domain_path}' --ip-idx '{ip_idx}' --ip '{ip}' --check-type '{check_type}'"

                        # Create cron job with the appropriate frequency
                        job = cron.new(command=command, comment="health_check")
                        try:
                            job.setall(frequency)  # Set the full cron expression
                        except Exception as e:
                            print(f"Error setting cron schedule '{frequency}' for {ip}: {e}")
                            print(f"Using default schedule '*/2 * * * *' instead")
                            job.setall("*/2 * * * *")
                        
                        job_count += 1
    
    # Write the updated crontab
    cron.write()
    print(f"Crontab updated with {job_count} health check jobs")

def execute_single_check(domain_path, ip_idx, ip, check_type):
    """
    Executes a health check for a single IP and updates Firebase with the result
    
    Args:
        domain_path (str): Path to the domain in Firebase (e.g., 'com/google/www')
        ip_idx (str): The index of the IP in Firebase or "ip" for single IP case
        ip (str): The IP address
        check_type (str): Type of health check ('tcp' or 'http')
    """
    print(f"Executing health check for {ip} ({domain_path}, idx: {ip_idx})")
    
    # Initialize Firebase if not already initialized
    initialize_firebase()
    
    # Handle both single IP and multiple IPs cases
    if ip_idx == "ip":
        # Single IP case
        ip_ref = db.reference(f"/domains/{domain_path}/ip")
    else:
        # Multiple IPs case
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
    
    # Build health check arguments
    check_args = build_health_check_args(check_type, ip, health_check_config, domain_path)
    
    if check_args:
        # Run the health check
        health_result = run_health_check(check_type, *check_args)
        print(f"Health check result for {ip}: {health_result}")
        
        # Update the health status in Firebase
        update_ip_health_status(domain_path, ip_idx, ip, health_result)
        print(f"Health status updated in Firebase path: {ip_ref.path}")
    else:
        print(f"Invalid health check configuration for {ip}")

def main():
    """Main function with command-line argument parsing for dual mode operation"""
    setup_logging()
    
    parser = argparse.ArgumentParser(description="Firebase Health Checker")
    parser.add_argument("--scan", action="store_true", help="Scan Firebase and update crontab")
    parser.add_argument("--execute", action="store_true", help="Execute a single health check")
    parser.add_argument("--domain-path", help="Domain path for single check (e.g., 'com/google/www')")
    parser.add_argument("--ip-idx", help="IP index for single check")
    parser.add_argument("--ip", help="IP address for single check")
    parser.add_argument("--check-type", help="Check type (tcp or http) for single check")
    
    args = parser.parse_args()
    
    # Initialize Firebase
    initialize_firebase()
    
    if args.scan:
        # Scanner mode - update crontab with health check jobs
        scan_and_update_crontab()
    elif args.execute and args.domain_path and args.ip_idx and args.ip and args.check_type:
        # Execute a single health check
        execute_single_check(args.domain_path, args.ip_idx, args.ip, args.check_type)
    else:
        # Default behavior (backward compatibility) - scan all domains and run checks
        fetch_domains_and_run_health_checks()

if __name__ == "__main__":
    main()