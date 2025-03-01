#!/bin/sh
# Load nftables rules
nft -f /etc/nftables.conf

# Keep the container alive
exec tail -f /dev/null