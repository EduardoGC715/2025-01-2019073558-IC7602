FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && apt-get install -y \
    gcc \
    python3 \
    python3-pip \
    build-essential \
    libssl-dev \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Install Python requests library
RUN pip3 install requests firebase-admin

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
    echo "*/5 * * * * cd /app && python3 update_firebase.py tcp example.com 80 >> /var/log/cron.log 2>&1" > /etc/cron.d/health-checks\n\
    echo "*/5 * * * * cd /app && python3 update_firebase.py http example.com 80 / >> /var/log/cron.log 2>&1" >> /etc/cron.d/health-checks\n\
    chmod 0644 /etc/cron.d/health-checks\n\
    crontab /etc/cron.d/health-checks\n\
    touch /var/log/cron.log\n\
    cron\n\
    tail -f /var/log/cron.log\n' > /app/startup.sh

RUN chmod +x /app/startup.sh

# Run the startup script
CMD ["/app/startup.sh"]