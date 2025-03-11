#!/bin/bash

# Execute the docker_installation.sh script
${DOCKER_INSTALL_SCRIPT}

# Check if the docker_installation.sh script executed successfully
if [ $? -ne 0 ]; then
  echo "Docker installation failed. Exiting."
  exit 1
fi

# Pull the Docker image
docker pull dandiego235/apache-po:1.0

# Check if the Docker image was pulled successfully
if [ $? -ne 0 ]; then
  echo "Failed to pull Docker image. Exiting."
  exit 1
fi

# Run the Docker container
docker run -d --name apache1 -p 80:80 dandiego235/apache-po:1.0

# Check if the Docker container started successfully
if [ $? -ne 0 ]; then
  echo "Failed to start Docker container. Exiting."
  exit 1
fi

echo "Apache server is running in Docker container."