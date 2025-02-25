#!/bin/bash
docker login
cd flask
docker build -t nereo08/app-ic76020125 .
docker images
docker push nereo08/app-ic76020125
cd ../router
docker build -t nereo08/router-ic76020125 .
docker images
docker push nereo08/router-ic76020125
cd ../asterisk
docker build -t nereo08/asterisk-ic76020125 .
docker images
docker push nereo08/asterisk-ic76020125
cd ../apache
docker build -t nereo08/apache-ic76020125 .
docker images
docker push nereo08/apache-ic76020125
cd ..
