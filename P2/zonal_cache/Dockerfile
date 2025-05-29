# Base image
FROM debian:bullseye

# Instalar build essentials y GCC
RUN apt-get update && \
    apt-get install -y \
      build-essential \
      gcc \
      g++ \
      check \
      curl \
      libcurl4 \
      libcurl4-openssl-dev \
      libssl-dev \
      openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY interceptor.h /app
COPY interceptor.c /app
COPY ./b64/ /app/b64/
COPY test_interceptor.c /app
COPY Makefile /app

RUN make test
RUN make all


CMD ["./interceptor"]
