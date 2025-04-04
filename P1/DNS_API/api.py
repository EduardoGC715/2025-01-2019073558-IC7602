# Código obtenido de https://www.freecodecamp.org/news/how-to-get-started-with-firebase-using-python/
import firebase_admin
from firebase_admin import credentials, auth
cred = credentials.Certificate("dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://dnsfire-8c6fd-default-rtdb.firebaseio.com/' 
})

import datetime as dt
from flask import Flask, request, render_template_string, current_app, g, jsonify
from werkzeug.local import LocalProxy
# from flask_cors import CORS
from os import environ
import logging
import time
import json
import random
import requests


logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# 
app = Flask(__name__)


# enable cors
# CORS(app)

# Retry with backoff implementado con base en https://keestalkstech.com/2021/03/python-utility-function-retry-with-exponential-backoff/#without-typings.
def retry_with_backoff(fn, backoff_in_seconds = 1):
    x = 0
    while True:
        logger.info(x)
        try:
            return fn()
        except:
            # va subiendo de 1, 2, 4, ... hasta esperar 256 segundos entre intentos. Se queda esperando hasta que pueda conectar,
            # porque de lo contrario, no podría trabajar bien.
            sleep = backoff_in_seconds * 2 ** x + random.uniform(0, 1)
            time.sleep(sleep)
            if x < 8:
                x += 1


@app.route("/")
def home():
    return render_template_string('''<!doctype html>
<html>
    <head>
        <link rel="stylesheet" href="css url"/>
    </head>
    <body>
        <p>Aplicación de Mongo!</p>
    </body>
</html>
''')

# Código basado de 
# https://stackoverflow.com/questions/58676559/how-to-authenticate-to-firebase-using-python/71398321#71398321
# https://datagy.io/python-requests-response-object/

@app.route("/login", methods=["POST"]) 
def login():
    if request.method == "POST":
        
        data = request.get_json()
        try:
            
            email =data["email"]
            password = data["password"]
            record = {'logId': int(time.time()) + random.randint(0, 30000), 'title': "login", 'bagInfo': json.dumps({"email": email, "password": password})}

            logger.debug(email)
            logger.debug(password)
            userInfo = json.dumps({"email": email, "password": password, "return_secure_token":True})
            r = requests.post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyAFj0oFcEqOdCL1NFlbGVhvirpxrKqx_LY", userInfo)
            logger.debug(r)
            if r:
                logger.debug("El usuario sí existe")
            else:
                logger.debug("El usuario no existe")
            logger.debug(r.json())
            return r.json()
        except Exception as e:
            logger.debug("Ese correo electrónico no está registado", e)
        return json.dumps({"error": {"code": 500, "message": "ERROR"}})

@app.route("/register", methods=["POST"]) 
def register():
    if request.method == "POST":
        data = request.get_json()
        pEmail = data["email"]
        pPassword = data["password"]
        pPhone = data["phone"]
        pDisplayName = data["name"] + " " + data["last_name1"] + " " + data["last_name2"]        
        try:
            user = auth.create_user(email = pEmail, password = pPassword, phone_number = pPhone, display_name = pDisplayName)
            record = {'logId': int(time.time()) + random.randint(0, 30000), 'title': "register", 'bagInfo': json.dumps({"email": pEmail, "password": pPassword, "phone": pPhone, "name": pDisplayName})}
            return {"success": {"code": 200, "message": "The user has been registered correctly"}}
        except Exception as e:
            logger.debug(str(e))
            logger.debug("El usuario ya está registrado.", e)
            return json.dumps({"error": {"code": 500, "message": "The user has already been registered"}})    

@app.route("/api/dns_resolver", methods=["POST"]) 
def register():
    if request.method == "POST":
        data = request.get_json()
        pEmail = data["email"]
        pPassword = data["password"]
        pPhone = data["phone"]
        pDisplayName = data["name"] + " " + data["last_name1"] + " " + data["last_name2"]        
        try:
            user = auth.create_user(email = pEmail, password = pPassword, phone_number = pPhone, display_name = pDisplayName)
            record = {'logId': int(time.time()) + random.randint(0, 30000), 'title': "register", 'bagInfo': json.dumps({"email": pEmail, "password": pPassword, "phone": pPhone, "name": pDisplayName})}
            return {"success": {"code": 200, "message": "The user has been registered correctly"}}
        except Exception as e:
            logger.debug(str(e))
            logger.debug("El usuario ya está registrado.", e)
            return json.dumps({"error": {"code": 500, "message": "The user has already been registered"}})    

@app.route("/api/get", methods=["POST"]) 
def register():
    if request.method == "GET":
        data = request.get_json()
        pEmail = data["email"]
        pPassword = data["password"]
        pPhone = data["phone"]
        pDisplayName = data["name"] + " " + data["last_name1"] + " " + data["last_name2"]        
        try:
            user = auth.create_user(email = pEmail, password = pPassword, phone_number = pPhone, display_name = pDisplayName)
            record = {'logId': int(time.time()) + random.randint(0, 30000), 'title': "register", 'bagInfo': json.dumps({"email": pEmail, "password": pPassword, "phone": pPhone, "name": pDisplayName})}
            return {"success": {"code": 200, "message": "The user has been registered correctly"}}
        except Exception as e:
            logger.debug(str(e))
            logger.debug("El usuario ya está registrado.", e)
            return json.dumps({"error": {"code": 500, "message": "The user has already been registered"}})    




if __name__ == "__main__":
    # Start up the server to expose the metrics.

    app.run(host='0.0.0.0')
    # https://synchronizing.medium.com/running-a-simple-flask-application-inside-a-docker-container-b83bf3e07dd5
    