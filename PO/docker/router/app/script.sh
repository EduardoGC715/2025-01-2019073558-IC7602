#!/bin/bash
# apache.private.svc.cluster.local
APACHE1=$(nslookup $APACHE1URL | awk '/^Address: / { print $2 }')
APACHE2=$(nslookup $APACHE1URL | awk '/^Address: / { print $2 }')
iptables -A INPUT -j ACCEPT
iptables -A FORWARD -i eth0 -o eth0 -p tcp -m tcp --dport 8080 -j ACCEPT
iptables -A OUTPUT -j ACCEPT
iptables -t nat -A PREROUTING -i eth0 -p tcp -m tcp --dport 8080 -j DNAT --to-destination $APACHE1:80
iptables -t nat -A OUTPUT -p tcp -m tcp --dport 8080 -j DNAT --to-destination $APACHE1:80
iptables -t nat -A PREROUTING -i eth0 -p tcp -m tcp --dport 8081 -j DNAT --to-destination $APACHE2:80
iptables -t nat -A OUTPUT -p tcp -m tcp --dport 8081 -j DNAT --to-destination $APACHE2:80
iptables -t nat -A POSTROUTING -j MASQUERADE
tail -f /dev/null