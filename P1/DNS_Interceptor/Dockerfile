# Base image
FROM debian:bullseye

# Install build essentials and GCC
RUN apt-get update && \
    apt-get install -y build-essential gcc g++ && \
    apt-get clean

# Set working directory
WORKDIR /app

# Optional: Copy your source code to container
COPY interceptor.c /app

# Default command (can be changed)
CMD ["gcc", "-o", "interceptor", "interceptor.c"]
