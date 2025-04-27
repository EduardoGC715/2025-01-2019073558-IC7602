#!/bin/bash

docker rm -f checker-us checker-eu 2>/dev/null || true

docker compose build

docker run -d --name checker-us \
  -e CHECKER_ID="us-east" \
  -e CHECKER_LAT="40.7128" \
  -e CHECKER_LON="-74.0060" \
  -e CHECKER_COUNTRY="USA" \
  -e CHECKER_CONTINENT="North America" \
  dandiego235/dns-health-checker

docker run -d --name checker-eu \
  -e CHECKER_ID="europe" \
  -e CHECKER_LAT="48.8566" \
  -e CHECKER_LON="2.3522" \
  -e CHECKER_COUNTRY="France" \
  -e CHECKER_CONTINENT="Europe" \
  dandiego235/dns-health-checker

echo "US Checker Logs:"
docker logs checker-us | head -n 10
echo "EU Checker Logs:"
docker logs checker-eu | head -n 10