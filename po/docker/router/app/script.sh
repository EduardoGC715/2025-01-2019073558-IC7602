#!/bin/bash
# apache.private.svc.cluster.local
APACHE1=$(nslookup $APACHE1URL | awk '/^Address: / { print $2 }')
APACHE2=$(nslookup $APACHE2URL | awk '/^Address: / { print $2 }')
ASTERISK=$(nslookup $ASTERISKURL | awk '/^Address: / { print $2 }')
INGRESS=$(nslookup $INGRESSURL | awk '/^Address: / { print $2 }')

# Allow all INPUT and OUTPUT traffic
iptables -A INPUT -j ACCEPT
iptables -A OUTPUT -j ACCEPT

# Accept Forwarding Rules
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 8080 -j ACCEPT
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 8081 -j ACCEPT


iptables -A FORWARD -i eth0 -o eth0 -p udp --dport 5060 -j ACCEPT
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 5060 -j ACCEPT

iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 80 -j ACCEPT

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

# Keep container running
tail -f /dev/null
