FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Accept location parameters with defaults
ARG CHECKER_ID="default-checker"
ARG CHECKER_LAT="0.0"
ARG CHECKER_LON="0.0"
ARG CHECKER_COUNTRY="Unknown"
ARG CHECKER_CONTINENT="Unknown"

# Then set ENVs from those ARGs
ENV CHECKER_ID=$CHECKER_ID
ENV CHECKER_LAT=$CHECKER_LAT
ENV CHECKER_LON=$CHECKER_LON
ENV CHECKER_COUNTRY=$CHECKER_COUNTRY
ENV CHECKER_CONTINENT=$CHECKER_CONTINENT

# Install required packages
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    python3 \
    python3-pip \
    build-essential \
    libssl-dev \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Install Python requests library
RUN pip3 install requests firebase-admin python-crontab

# Create working directory
WORKDIR /app

# Copy source files
COPY health_checker.c update_firebase.py ./

# Copy the Firebase credentials file
COPY dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json ./

# Compile the C program
RUN gcc -o health_checker health_checker.c

# Make Python script executable
RUN chmod +x update_firebase.py

# Create a startup script
RUN echo '#!/bin/bash\n\
    echo "ENVIRONMENT VARIABLES:"\n\
    echo "CHECKER_ID=$CHECKER_ID"\n\
    echo "CHECKER_COUNTRY=$CHECKER_COUNTRY"\n\
    echo "CHECKER_LAT=$CHECKER_LAT CHECKER_LON=$CHECKER_LON"\n\
    echo "CHECKER_CONTINENT=$CHECKER_CONTINENT"\n\
    echo "Starting health checker: $CHECKER_ID from $CHECKER_COUNTRY ($CHECKER_LAT, $CHECKER_LON)"\n\
    # Create the cron job with environment variables included\n\
    echo "*/5 * * * * cd /app && CHECKER_ID=\"$CHECKER_ID\" CHECKER_LAT=\"$CHECKER_LAT\" CHECKER_LON=\"$CHECKER_LON\" CHECKER_COUNTRY=\"$CHECKER_COUNTRY\" CHECKER_CONTINENT=\"$CHECKER_CONTINENT\" python3 update_firebase.py --scan >> /var/log/cron.log 2>&1" > /etc/cron.d/health-scan\n\
    chmod 0644 /etc/cron.d/health-scan\n\
    crontab /etc/cron.d/health-scan\n\
    touch /var/log/cron.log\n\
    cron\n\
    # Run once immediately to set up initial jobs\n\
    python3 /app/update_firebase.py --scan\n\
    tail -f /var/log/cron.log\n' > /app/startup.sh

RUN chmod +x /app/startup.sh

# Run the startup script
CMD ["/app/startup.sh"]