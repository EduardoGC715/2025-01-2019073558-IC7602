# Base image
FROM ubuntu:noble

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

RUN mkdir -p /app/subdomain_caches

WORKDIR /app


COPY ./httpparser/ /app/httpparser/
COPY ./rapidjson/ /app/rapidjson/
COPY Makefile /app
COPY init.sh /app
COPY zonal_cache.h /app
COPY zonal_cache.cpp /app
COPY http_client.h /app
COPY http_client.cpp /app

# RUN make test
RUN make all

RUN chmod +x init.sh
RUN chmod +x zonal_cache

CMD ["./init.sh"]
