import maxminddb
import ipaddress
import json
import csv

mmdb_path = 'dbip-country-lite-2025-04.mmdb'  # Replace with your actual file
output_file = 'ip_to_country_lite.json'
input_csv = 'dbip-country-lite-2025-04.csv'   
results = {}

def ip_to_int(ip):
    return int(ipaddress.ip_address(ip))

def is_ipv4(ip):
    try:
        return isinstance(ipaddress.ip_address(ip), ipaddress.IPv4Address)
    except ValueError:
        return False

with maxminddb.open_database(mmdb_path) as reader:
    with open(input_csv, newline='', encoding='utf-8') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            start_ip, end_ip, country_code = row[0], row[1], row[2]

            if not is_ipv4(start_ip):
                continue  # Se salta IPv6

            ip_int = ip_to_int(start_ip)

            try:
                data = reader.get(start_ip)
                # Formato obtenido de https://db-ip.com/db/format/ip-to-country-lite/mmdb.html
                if data:
                    results[str(ip_int)] = {
                        "start_ip": start_ip,
                        "end_ip": end_ip,
                        "continent_code": data.get("continent", {}).get("code"),
                        "continent_name": data.get("continent", {}).get("names", {}).get("en"),
                        "country_iso_code": data.get("country", {}).get("iso_code"),
                        "country_name": data.get("country", {}).get("names", {}).get("en")
                    }
            except Exception as e:
                print(f"Error processing {start_ip}: {e}")

# Save as JSON
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"Saved {len(results)} IPs to {output_file}")