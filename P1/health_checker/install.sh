#!/bin/bash

# Stop and remove any existing containers
docker rm -f checker-us checker-eu 2>/dev/null || true

# Build the base image
docker build -t health-checker .

# Run US checker with debugging
docker run -d --name checker-us \
  -e CHECKER_ID="us-east" \
  -e CHECKER_LAT="40.7128" \
  -e CHECKER_LON="-74.0060" \
  -e CHECKER_COUNTRY="USA" \
  -e CHECKER_CONTINENT="North America" \
  health-checker

# Run EU checker with debugging
docker run -d --name checker-eu \
  -e CHECKER_ID="europe" \
  -e CHECKER_LAT="48.8566" \
  -e CHECKER_LON="2.3522" \
  -e CHECKER_COUNTRY="France" \
  -e CHECKER_CONTINENT="Europe" \
  health-checker

# Check logs to verify environment variables
echo "US Checker Logs:"
docker logs checker-us | head -n 10
echo "EU Checker Logs:"
docker logs checker-eu | head -n 10