#!/bin/bash

# Get the router instance's private IP from Terraform
export APACHE1="${APACHE1URL_PLACEHOLDER}"
export APACHE2="${APACHE2URL_PLACEHOLDER}"
export ASTERISK="${ASTERISKURL_PLACEHOLDER}"
export INGRESS="${INGRESSURL_PLACEHOLDER}"

# Save the variable permanently
echo "APACHE1=$APACHE1" >> /etc/environment
echo "APACHE2=$APACHE2" >> /etc/environment
echo "ASTERISK=$ASTERISK" >> /etc/environment
echo "INGRESS=$INGRESS" >> /etc/environment

sudo rm -f /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf

# Enable IP forwarding in the kernel - CRITICAL FOR ROUTING
echo 1 > /proc/sys/net/ipv4/ip_forward
# Make IP forwarding persistent after reboot
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p

# Allow all INPUT and OUTPUT traffic
iptables -P INPUT -j ACCEPT
iptables -P OUTPUT -j ACCEPT
iptables -P FORWARD -j ACCEPT

# Accept Forwarding Rules
iptables -A FORWARD -i eth0 -o eth0 -p udp --dport 5060 -j ACCEPT
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 5060 -j ACCEPT

iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 80 -j ACCEPT

# Allow inbound RTP traffic to Asterisk

iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 80 -j ACCEPT

# Forward RTP packets to Asterisk
iptables -t nat -A PREROUTING -i eth0 -p udp --dport 10000:10010 -j DNAT --to-destination $ASTERISK


# Apply DNAT (Destination NAT) for Apache1
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j DNAT --to-destination $APACHE1:80
iptables -t nat -A OUTPUT -p tcp --dport 8080 -j DNAT --to-destination $APACHE1:80

# Apply DNAT for Apache2
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8081 -j DNAT --to-destination $APACHE2:80
iptables -t nat -A OUTPUT -p tcp --dport 8081 -j DNAT --to-destination $APACHE2:80

# Apply DNAT for Asterisk (UDP and TCP)
iptables -t nat -A PREROUTING -i eth0 -p udp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
iptables -t nat -A OUTPUT -p udp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
iptables -t nat -A OUTPUT -p tcp --dport 5601 -j DNAT --to-destination $ASTERISK:5060

# DNAT rule for ingress controller
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j DNAT --to-destination $INGRESS:80
iptables -t nat -A OUTPUT -p tcp --dport 80 -j DNAT --to-destination $INGRESS:80

# Enable MASQUERADE for proper routing
iptables -t nat -A POSTROUTING -j MASQUERADE
