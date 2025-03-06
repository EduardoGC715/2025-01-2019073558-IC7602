FROM ubuntu:latest

RUN apt update && apt upgrade -y
RUN apt install -y \
  build-essential \
  gcc \
  g++ \
  make \
  nano \
  libjansson-dev \
  libsqlite3-dev \
  libxml2-dev \
  libxslt1-dev \
  libncurses5-dev \
  libssl-dev \
  uuid-dev \
  wget \
  curl \
  unixodbc \
  unixodbc-dev \
  libspeex-dev \
  libspeexdsp-dev \
  libsamplerate-dev \
  libcurl4-openssl-dev \
  libvorbis-dev \
  libogg-dev \
  libsrtp2-dev \
  libical-dev \
  libiksemel-dev \
  libneon27-dev \
  libgmime-3.0-dev \
  libunbound-dev \
  libedit-dev

WORKDIR /usr/local/src

RUN wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-22.2.0.tar.gz

RUN tar -zxvf asterisk-22.2.0.tar.gz

WORKDIR /usr/local/src/asterisk-22.2.0

RUN ./configure
RUN make && make install
RUN make samples
RUN make config

WORKDIR /etc/asterisk
RUN mv extensions.conf extensions.conf.bak
RUN mv pjsip.conf pjsip.conf.bak
RUN mv rtp.conf rtp.conf.bak
COPY ./app/extensions.conf .
COPY ./app/pjsip.conf .
COPY ./app/rtp.conf .

WORKDIR /app
COPY ./app/script.sh .

CMD ["sh", "script.sh"]
