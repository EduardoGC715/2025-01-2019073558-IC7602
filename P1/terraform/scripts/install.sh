#!/bin/bash

sudo rm -f /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf

sudo apt-get update
sudo apt-get install docker.io -y
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

cat <<EOF > /home/ec2-user/docker-compose.yml
${DOCKER_COMPOSE_YML}
EOF

cd /home/ec2-user
docker compose up -d