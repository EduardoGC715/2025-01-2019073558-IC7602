# Base image
FROM debian:bullseye

# Instalar build essentials y GCC
RUN apt-get update && \
    apt-get install -y build-essential gcc g++ && \
    apt-get clean

RUN apt update && \
    apt install -y libcurl4 libcurl4-openssl-dev && \
    apt clean

WORKDIR /app

COPY interceptor.c /app
COPY ./b64/ /app/b64/

COPY Makefile /app
CMD ["make", "run"]
