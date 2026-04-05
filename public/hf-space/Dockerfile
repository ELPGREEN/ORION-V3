FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pymupdf
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libmupdf-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libcairo2 \
    libffi-dev \
    libglib2.0-0 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# HF Spaces expects port 7860
EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
