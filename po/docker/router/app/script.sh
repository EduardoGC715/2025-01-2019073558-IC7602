#!/bin/bash
# apache.private.svc.cluster.local
APACHE1=$(nslookup $APACHE1URL | awk '/^Address: / { print $2 }')
APACHE2=$(nslookup $APACHE2URL | awk '/^Address: / { print $2 }')
ASTERISK=$(nslookup $ASTERISKURL | awk '/^Address: / { print $2 }')
INGRESS=$(nslookup $INGRESSURL | awk '/^Address: / { print $2 }')

# Allow all INPUT and OUTPUT traffic
iptables -A INPUT -j ACCEPT
iptables -A OUTPUT -j ACCEPT

# Log and Accept Forwarding Rules
# iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 8080 -j LOG --log-prefix "FORWARD APACHE1: " --log-level 4
iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 8080 -j ACCEPT

# iptables -A FORWARD -p udp --dport 5601 -j LOG --log-prefix "FORWARD ASTERISK UDP: " --log-level 4
iptables -A FORWARD -p udp --dport 5601 -j ACCEPT

# iptables -A FORWARD -p tcp --dport 5601 -j LOG --log-prefix "FORWARD ASTERISK TCP: " --log-level 4
iptables -A FORWARD -p tcp --dport 5601 -j ACCEPT

# Allow inbound RTP traffic to Asterisk
iptables -A FORWARD -p udp --dport 10000:10010 -j ACCEPT
iptables -A FORWARD -p udp --sport 10000:10010 -j ACCEPT

# Forward RTP packets to Asterisk
iptables -t nat -A PREROUTING -i eth0 -p udp --dport 10000:10010 -j DNAT --to-destination $ASTERISK


iptables -A FORWARD -i eth0 -o eth0 -p tcp --dport 80 -j ACCEPT

# Log and Apply DNAT (Destination NAT) for Apache1
# iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j LOG --log-prefix "DNAT APACHE1: " --log-level 4
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j DNAT --to-destination $APACHE1:80
# iptables -t nat -A OUTPUT -p tcp --dport 8080 -j LOG --log-prefix "DNAT OUTPUT APACHE1: " --log-level 4
iptables -t nat -A OUTPUT -p tcp --dport 8080 -j DNAT --to-destination $APACHE1:80

# Log and Apply DNAT for Apache2
# iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8081 -j LOG --log-prefix "DNAT APACHE2: " --log-level 4
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8081 -j DNAT --to-destination $APACHE2:80
# iptables -t nat -A OUTPUT -p tcp --dport 8081 -j LOG --log-prefix "DNAT OUTPUT APACHE2: " --log-level 4
iptables -t nat -A OUTPUT -p tcp --dport 8081 -j DNAT --to-destination $APACHE2:80

# Log and Apply DNAT for Asterisk (UDP and TCP)
# iptables -t nat -A PREROUTING -i eth0 -p udp --dport 5601 -j LOG --log-prefix "DNAT ASTERISK UDP: " --log-level 4
iptables -t nat -A PREROUTING -i eth0 -p udp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
# iptables -t nat -A OUTPUT -p udp --dport 5601 -j LOG --log-prefix "DNAT OUTPUT ASTERISK UDP: " --log-level 4
iptables -t nat -A OUTPUT -p udp --dport 5601 -j DNAT --to-destination $ASTERISK:5060

# iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 5601 -j LOG --log-prefix "DNAT ASTERISK TCP: " --log-level 4
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 5601 -j DNAT --to-destination $ASTERISK:5060
# iptables -t nat -A OUTPUT -p tcp --dport 5601 -j LOG --log-prefix "DNAT OUTPUT ASTERISK TCP: " --log-level 4
iptables -t nat -A OUTPUT -p tcp --dport 5601 -j DNAT --to-destination $ASTERISK:5060

# DNAT rule for ingress controller
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j DNAT --to-destination $INGRESS:80
iptables -t nat -A OUTPUT -p tcp --dport 80 -j DNAT --to-destination $INGRESS:80

# Enable MASQUERADE for proper routing
iptables -t nat -A POSTROUTING -j MASQUERADE

# Keep container running
tail -f /dev/null
