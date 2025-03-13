#!/bin/bash

# Get the router instance's private IP from Terraform
export APACHE1="${APACHE1URL_PLACEHOLDER}"
export APACHE2="${APACHE2URL_PLACEHOLDER}"

# Save the variable permanently
echo "APACHE1=$APACHE1" >> /etc/environment
echo "APACHE2=$APACHE2" >> /etc/environment

sudo rm -f /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf

# https://nginx.org/en/linux_packages.html#Ubuntu
sudo apt update
sudo apt install curl gnupg2 ca-certificates lsb-release ubuntu-keyring -y

curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
    | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null


echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
http://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list

sudo apt install nginx -y

cat << 'EOF' | sudo tee /etc/nginx/conf.d/default.conf
server {
    listen 80;
    servername ;

    # Route for Apache1
    location /apache1 {
        proxy_pass http://$apache1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Route for Apache2
    location /apache2 {
        proxy_pass http://$apache2/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Default route
    location / {
        return 200 'Welcome to NGINX Router\n';
        add_header Content-Type text/plain;
    }
}
EOF