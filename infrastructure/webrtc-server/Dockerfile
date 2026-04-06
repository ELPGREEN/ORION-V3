###############################################################
# WebRTC Camera Streamer — GStreamer + Python signaling server
# Streams camera to browser with sub-100ms latency
###############################################################
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-nice \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    python3-gst-1.0 \
    libgirepository1.0-dev \
    gir1.2-gst-webrtc-1.0 \
    gir1.2-gstsdp-1.0 \
    v4l-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE ${WEBRTC_PORT:-8443}

CMD ["python3", "server.py"]
