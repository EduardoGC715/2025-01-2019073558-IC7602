#!/bin/bash

# Get the router instance's private IP from Terraform
export EXTERNAL_IP="${EXTERNAL_IP_PLACEHOLDER}"
export EXTERNAL_PORT="${EXTERNAL_PORT_PLACEHOLDER}"
# Save the variable permanently
echo "EXTERNAL_IP=$EXTERNAL_IP" >> /etc/environment
echo "EXTERNAL_PORT=$EXTERNAL_PORT" >> /etc/environment
# Execute the docker_installation.sh script
${DOCKER_INSTALL_SCRIPT}

# Check if the docker_installation.sh script executed successfully
if [ $? -ne 0 ]; then
  echo "Docker installation failed. Exiting."
  exit 1
fi

# Pull the Docker image
docker pull dandiego235/asterisk-po:latest

# Check if the Docker image was pulled successfully
if [ $? -ne 0 ]; then
  echo "Failed to pull Docker image. Exiting."
  exit 1
fi

# Run the Docker container
docker run -d --name asterisk \
  -p 5060:5060 \
  -p 5060:5060/udp \
  -p 10000-10010:10000-10010/udp \
  -p 10000-10010:10000-10010 \
  -e EXTERNAL_IP=$EXTERNAL_IP \
  -e EXTERNAL_PORT=$EXTERNAL_PORT \
  dandiego235/asterisk-po:latest

# Check if the Docker container started successfully
if [ $? -ne 0 ]; then
  echo "Failed to start Docker container. Exiting."
  exit 1
fi

echo "Apache server is running in Docker container."