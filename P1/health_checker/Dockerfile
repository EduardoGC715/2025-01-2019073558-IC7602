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

# Install required packages including check unit testing framework
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    python3 \
    python3-pip \
    build-essential \
    libssl-dev \
    cron \
    check \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

# Install Python requests library
RUN pip3 install -r requirements.txt

# Create working directory
WORKDIR /app

# Copy the Flask app files
COPY flask_app.py ./

# Copy source code and test files
COPY health_checker.c test_health_checker.c ./


# Compile and run tests - build will fail if tests don't pass
RUN mkdir -p /test-logs

RUN gcc -o test_health_checker test_health_checker.c -lcheck -lsubunit -lm -pthread && \
    ./test_health_checker && \
    if [ -f health_checker_unittest.log ]; then \
    cp health_checker_unittest.log /test-logs/ && \
    echo "Test logs saved to /test-logs/health_checker_unittest.log"; \
    fi && \
    echo "All tests passed successfully!"

# Continue with the rest of the build only if tests pass
# Copy the rest of the files needed for the application
COPY update_firebase.py ./

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
    echo "Starting Gunicorn API for flask_app..."\n\
    PYTHONUNBUFFERED=1 gunicorn -w 1 -t 60 -k gthread --threads 3 -b 0.0.0.0:5000 flask_app:app &\n\
    echo "Setting up cron job for update_firebase.py..."\n\
    echo "*/3 * * * * cd /app && CHECKER_ID=\"$CHECKER_ID\" CHECKER_LAT=\"$CHECKER_LAT\" CHECKER_LON=\"$CHECKER_LON\" CHECKER_COUNTRY=\"$CHECKER_COUNTRY\" CHECKER_CONTINENT=\"$CHECKER_CONTINENT\" python3 update_firebase.py --scan >> /var/log/cron.log 2>&1" > /etc/cron.d/health-scan\n\
    chmod 0644 /etc/cron.d/health-scan\n\
    crontab /etc/cron.d/health-scan\n\
    touch /var/log/cron.log\n\
    cron -f &\n\
    # Run once immediately to set up initial jobs\n\
    python3 /app/update_firebase.py --scan\n\
    tail -f /var/log/cron.log\n' > /app/startup.sh

RUN chmod +x /app/startup.sh

# Run the startup script
CMD ["/app/startup.sh"]