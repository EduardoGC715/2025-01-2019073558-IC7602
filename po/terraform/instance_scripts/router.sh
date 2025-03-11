#!/bin/bash

# Execute the docker_installation.sh script
${DOCKER_INSTALL_SCRIPT}

# Check if the docker_installation.sh script executed successfully
if [ $? -ne 0 ]; then
  echo "Docker installation failed. Exiting."
  exit 1
fi

# Pull the Docker image
docker pull dandiego235/router-po:latest

# Check if the Docker image was pulled successfully
if [ $? -ne 0 ]; then
  echo "Failed to pull Docker image. Exiting."
  exit 1
fi

# Get the router instance's private IP from Terraform
export APACHE1="${APACHE1URL_PLACEHOLDER}"
export APACHE2="${APACHE2URL_PLACEHOLDER}"

# Save the variable permanently
echo "APACHE1=$APACHE1" >> /etc/environment
echo "APACHE2=$APACHE2" >> /etc/environment

# Enable IP forwarding in the kernel - CRITICAL FOR ROUTING
echo 1 > /proc/sys/net/ipv4/ip_forward
# Make IP forwarding persistent after reboot
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p

# Allow all INPUT and OUTPUT traffic
iptables -A INPUT -j ACCEPT
iptables -A OUTPUT -j ACCEPT

# Accept Forwarding Rules
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 8080 -j ACCEPT
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 8081 -j ACCEPT


iptables -A FORWARD -i eth0 -o eth0 -p udp --dport 5060 -j ACCEPT
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 5060 -j ACCEPT

iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 80 -j ACCEPT

# Allow inbound RTP traffic to Asterisk

iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 80 -j ACCEPT

# Forward RTP packets to Asterisk
iptables -t nat -A PREROUTING -i eth0 -p udp --dport 10000:10010 -j DNAT --to-destination $ASTERISK


# Log and Apply DNAT (Destination NAT) for Apache1
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j DNAT --to-destination $APACHE1:80
iptables -t nat -A OUTPUT -p tcp --dport 8080 -j DNAT --to-destination $APACHE1:80

# Log and Apply DNAT for Apache2
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8081 -j DNAT --to-destination $APACHE2:80
iptables -t nat -A OUTPUT -p tcp --dport 8081 -j DNAT --to-destination $APACHE2:80

# Log and Apply DNAT for Asterisk (UDP and TCP)
iptables -t nat -A PREROUTING -i eth0 -p udp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
iptables -t nat -A OUTPUT -p udp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
iptables -t nat -A OUTPUT -p tcp --dport 5601 -j DNAT --to-destination $ASTERISK:5060

# DNAT rule for ingress controller
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j DNAT --to-destination $INGRESS:80
iptables -t nat -A OUTPUT -p tcp --dport 80 -j DNAT --to-destination $INGRESS:80

# Enable MASQUERADE for proper routing
iptables -t nat -A POSTROUTING -j MASQUERADE


