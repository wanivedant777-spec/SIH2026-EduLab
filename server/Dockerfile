FROM python:3.11-slim

# Prevent Python from writing .pyc files and keep stdout unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8000

WORKDIR /app

# Install system dependencies including C/C++ compiler and Java runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies with caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose backend port
EXPOSE 8000

# Run FastAPI via uvicorn respecting HOST and PORT
CMD ["sh", "-c", "uvicorn main:app --host ${HOST} --port ${PORT}"]
