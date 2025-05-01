FROM python:3.11.12-slim

WORKDIR /app

RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api.py .
COPY logs ./logs
COPY dnsfire-8c6fd-firebase-adminsdk-fbsvc-0c1a5a0b20.json .
COPY fullchain.pem .
COPY privkey.pem .
EXPOSE 5000
CMD [ "gunicorn", "-b", "0.0.0.0:5000", "--certfile=fullchain.pem", "--keyfile=privkey.pem", "api:app" ]