#!/bin/bash
set -e  # Exit on error to prevent partial installs

# Ensure script runs from the correct directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Running script from: $SCRIPT_DIR"

# Install or upgrade the namespace chart
helm upgrade --install namespace "$SCRIPT_DIR/namespace"
sleep 10

# Install or upgrade the private chart
helm upgrade --install private "$SCRIPT_DIR/private"
sleep 20

# Install or upgrade the public chart
#helm repo add bitnami https://charts.bitnami.com/bitnami
#helm dependency update
helm upgrade --install public "$SCRIPT_DIR/public"
