# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements.txt if you have one, else install Flask manually
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# Install Flask
RUN pip install --no-cache-dir flask

# Copy app code and pokedex.json
COPY rest_api.py .
COPY pokedex.json .

# Expose port
EXPOSE 5000

# Run the app
CMD ["python", "rest_api.py"]