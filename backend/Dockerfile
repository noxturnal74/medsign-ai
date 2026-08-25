FROM python:3.11-slim

WORKDIR /app

# System deps: opencv/mediapipe butuh libGL & libglib
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kode aplikasi + model + metadata (DB dibuat otomatis saat startup via init_db)
COPY app ./app
COPY models ./models
RUN mkdir -p data/landmarks data/metadata reports backups

EXPOSE 8000
ENV PORT=8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
