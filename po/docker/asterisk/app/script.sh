#!/bin/bash

echo "EXTERNAL_IP is set to: $EXTERNAL_IP"
echo "EXTERNAL_PORT is set to: $EXTERNAL_PORT"

# Replace environment variables in the Asterisk configuration file
sed -i "s|\${EXTERNAL_IP}|$EXTERNAL_IP|g" /etc/asterisk/pjsip.conf
sed -i "s|\${EXTERNAL_PORT}|$EXTERNAL_PORT|g" /etc/asterisk/pjsip.conf

# Start Asterisk in verbose mode
asterisk -cvvvvv