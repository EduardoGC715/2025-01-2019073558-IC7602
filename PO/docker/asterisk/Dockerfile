FROM ubuntu:latest

WORKDIR /app

COPY app/. .

RUN apt-get update
RUN apt-get install build-essential -y
RUN apt-get install curl -y
RUN apt-get install dnsutils -y


CMD [ "tail", "-f", "/dev/null"]