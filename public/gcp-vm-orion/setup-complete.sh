#!/bin/bash
# ============================================================
# ORION GCP VM — Complete Setup Script
# Instance: orion-backend | Zone: us-central1-f
# Machine: e2-standard-4 (4 vCPU, 16GB RAM, x86_64, CPU only)
# OS: Debian 12 Bookworm
# ============================================================
# Usage:
#   1. SSH into VM:
#      gcloud compute ssh orion-backend --zone=us-central1-f --tunnel-through-iap
#   2. Upload this script:
#      gcloud compute scp setup-complete.sh orion-backend:~ --zone=us-central1-f
#   3. Run:
#      chmod +x setup-complete.sh && sudo ./setup-complete.sh
# ============================================================

set -euo pipefail

ORION_HOME="/opt/orion"
MODELS_DIR="/opt/orion-models"
PIPER_DIR="/opt/piper-voices"
CACHE_DIR="/tmp/orion-cache"
SWAP_SIZE="4G"
DATA_DISK="/dev/sdb"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║        ORION VM — Complete Setup Script          ║"
echo "║   e2-standard-4 | 16GB RAM | Debian 12 x86_64   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ============================================================
# Step 1: System Dependencies
# ============================================================
echo "━━━ [1/9] Installing system dependencies ━━━"
apt-get update -qq
apt-get install -y --no-install-recommends \
    python3-pip python3-venv python3-dev \
    libsndfile1 ffmpeg \
    build-essential \
    wget curl htop \
    lsof net-tools \
    2>&1 | tail -5

pip3 install --break-system-packages psutil 2>/dev/null || true
echo "✅ System dependencies installed"

# ============================================================
# Step 2: Mount Additional 100GB Disk (for models & data)
# ============================================================
echo ""
echo "━━━ [2/9] Configuring storage ━━━"

if [ -b "$DATA_DISK" ]; then
    # Check if already formatted
    if ! blkid "$DATA_DISK" | grep -q ext4; then
        echo "Formatting $DATA_DISK as ext4..."
        mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0 "$DATA_DISK"
    fi

    mkdir -p "$MODELS_DIR"

    if ! mountpoint -q "$MODELS_DIR"; then
        mount "$DATA_DISK" "$MODELS_DIR"
        echo "Mounted $DATA_DISK → $MODELS_DIR"
    fi

    # Persist in fstab
    if ! grep -q "$MODELS_DIR" /etc/fstab; then
        echo "$DATA_DISK $MODELS_DIR ext4 defaults,nofail 0 2" >> /etc/fstab
        echo "Added to /etc/fstab"
    fi

    echo "✅ 100GB disk mounted at $MODELS_DIR"
else
    echo "⚠️  No additional disk at $DATA_DISK — using boot disk only"
    mkdir -p "$MODELS_DIR"
fi

# ============================================================
# Step 3: Swap (4GB — safety net for model loading)
# ============================================================
echo ""
echo "━━━ [3/9] Configuring swap ━━━"

if [ ! -f /swapfile ]; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    if ! grep -q swapfile /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    echo "✅ ${SWAP_SIZE} swap created"
else
    echo "✅ Swap already exists"
    swapon /swapfile 2>/dev/null || true
fi

# ============================================================
# Step 4: Create Orion user & directories
# ============================================================
echo ""
echo "━━━ [4/9] Creating Orion user & directories ━━━"

id -u orion &>/dev/null || useradd -r -s /bin/false orion
mkdir -p "$ORION_HOME" "$PIPER_DIR" "$CACHE_DIR" "$MODELS_DIR/huggingface"
chown -R orion:orion "$ORION_HOME" "$CACHE_DIR"
chown -R orion:orion "$MODELS_DIR"
echo "✅ User 'orion' and directories ready"

# ============================================================
# Step 5: Python Virtual Environment & Dependencies
# ============================================================
echo ""
echo "━━━ [5/9] Setting up Python environment ━━━"

if [ ! -d "$ORION_HOME/venv" ]; then
    python3 -m venv "$ORION_HOME/venv"
    echo "Created venv at $ORION_HOME/venv"
fi

source "$ORION_HOME/venv/bin/activate"

echo "Installing PyTorch (CPU x86_64)..."
pip install --no-cache-dir \
    torch==2.5.0 \
    torchvision==0.20.0 \
    --index-url https://download.pytorch.org/whl/cpu \
    2>&1 | tail -3

echo "Installing application dependencies..."
cat > "$ORION_HOME/requirements.txt" << 'REQS'
fastapi==0.115.0
uvicorn[standard]==0.32.0
piper-tts==1.2.0
faster-whisper==1.1.0
transformers==4.46.0
Pillow==11.0.0
easyocr==1.7.2
sentence-transformers==3.3.0
numpy==1.26.4
diskcache==5.6.3
httpx==0.28.0
python-multipart==0.0.18
psutil
REQS

pip install --no-cache-dir -r "$ORION_HOME/requirements.txt" 2>&1 | tail -5
echo "✅ Python environment ready"

# ============================================================
# Step 6: Pre-download Models (into 100GB disk)
# ============================================================
echo ""
echo "━━━ [6/9] Pre-downloading AI models ━━━"

export HF_HOME="$MODELS_DIR/huggingface"
export TRANSFORMERS_CACHE="$MODELS_DIR/huggingface"
export SENTENCE_TRANSFORMERS_HOME="$MODELS_DIR/huggingface"

# Download models via Python (in background-safe way)
python3 << 'PYMODELS'
import os, sys
os.environ["HF_HOME"] = "/opt/orion-models/huggingface"
os.environ["TRANSFORMERS_CACHE"] = "/opt/orion-models/huggingface"
os.environ["SENTENCE_TRANSFORMERS_HOME"] = "/opt/orion-models/huggingface"

models_ok = []
models_fail = []

# 1. Sentence Transformers (embeddings) — ~90MB
try:
    from sentence_transformers import SentenceTransformer
    SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    models_ok.append("all-MiniLM-L6-v2")
except Exception as e:
    models_fail.append(f"all-MiniLM-L6-v2: {e}")

# 2. DETR (object detection) — ~160MB
try:
    from transformers import DetrImageProcessor, DetrForObjectDetection
    DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
    DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
    models_ok.append("detr-resnet-50")
except Exception as e:
    models_fail.append(f"detr-resnet-50: {e}")

# 3. Whisper tiny (STT) — ~75MB
try:
    from faster_whisper import WhisperModel
    WhisperModel("tiny", device="cpu", compute_type="int8")
    models_ok.append("whisper-tiny")
except Exception as e:
    models_fail.append(f"whisper-tiny: {e}")

# 4. EasyOCR — downloads models on first use (~100MB)
try:
    import easyocr
    easyocr.Reader(["pt", "en"], gpu=False)
    models_ok.append("easyocr-pt-en")
except Exception as e:
    models_fail.append(f"easyocr: {e}")

print(f"\n✅ Models downloaded: {', '.join(models_ok)}")
if models_fail:
    print(f"⚠️  Failed: {'; '.join(models_fail)}")
PYMODELS

echo "✅ Model pre-download complete"

# ============================================================
# Step 7: Piper TTS Voice (pt_BR)
# ============================================================
echo ""
echo "━━━ [7/9] Downloading Piper TTS voice ━━━"

PIPER_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium"
if [ ! -f "$PIPER_DIR/pt_BR-faber-medium.onnx" ]; then
    wget -q --show-progress "${PIPER_URL}/pt_BR-faber-medium.onnx" -O "$PIPER_DIR/pt_BR-faber-medium.onnx" || echo "⚠️ Piper voice download failed"
    wget -q "${PIPER_URL}/pt_BR-faber-medium.onnx.json" -O "$PIPER_DIR/pt_BR-faber-medium.onnx.json" || true
    echo "✅ Piper voice downloaded"
else
    echo "✅ Piper voice already exists"
fi

# ============================================================
# Step 8: Copy Server & Configure Systemd
# ============================================================
echo ""
echo "━━━ [8/9] Configuring Orion service ━━━"

# Copy server.py (assume it's in same dir as this script)
if [ -f "$(dirname "$0")/server.py" ]; then
    cp "$(dirname "$0")/server.py" "$ORION_HOME/server.py"
    echo "Copied server.py"
elif [ -f ~/server.py ]; then
    cp ~/server.py "$ORION_HOME/server.py"
    echo "Copied server.py from home"
fi

chown -R orion:orion "$ORION_HOME"

# Systemd unit
cat > /etc/systemd/system/orion.service << EOF
[Unit]
Description=Orion AI Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=orion
Group=orion
WorkingDirectory=$ORION_HOME

# Environment
Environment="HF_HOME=$MODELS_DIR/huggingface"
Environment="TRANSFORMERS_CACHE=$MODELS_DIR/huggingface"
Environment="SENTENCE_TRANSFORMERS_HOME=$MODELS_DIR/huggingface"
Environment="PIPER_VOICE=$PIPER_DIR/pt_BR-faber-medium.onnx"
Environment="HF_SPACE_URL=https://ericsonv12-orion-gpu.hf.space"
Environment="PYTHONUNBUFFERED=1"

# Start server
ExecStart=$ORION_HOME/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8080 --workers 1 --timeout-keep-alive 75

# Resource limits
MemoryMax=12G
MemoryHigh=10G
CPUQuota=350%

# Restart policy
Restart=always
RestartSec=5
StartLimitBurst=5
StartLimitIntervalSec=60

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=orion

[Install]
WantedBy=multi-user.target
EOF

# Gemini API Key override (create drop-in if not exists)
mkdir -p /etc/systemd/system/orion.service.d
if [ ! -f /etc/systemd/system/orion.service.d/api-keys.conf ]; then
    cat > /etc/systemd/system/orion.service.d/api-keys.conf << 'APIKEYS'
[Service]
# Add your Gemini API key here:
# Environment="GEMINI_API_KEY=your-key-here"
APIKEYS
    echo "⚠️  Remember to add GEMINI_API_KEY in /etc/systemd/system/orion.service.d/api-keys.conf"
fi

systemctl daemon-reload
systemctl enable orion
echo "✅ Systemd service configured"

# ============================================================
# Step 9: Firewall, Security & Final Checks
# ============================================================
echo ""
echo "━━━ [9/9] Final configuration ━━━"

# Kernel tuning for better performance
cat > /etc/sysctl.d/99-orion.conf << 'SYSCTL'
# Network performance
net.core.somaxconn = 1024
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Memory management — prevent OOM-killer from killing Orion
vm.overcommit_memory = 1
vm.swappiness = 10

# File descriptors
fs.file-max = 65535
SYSCTL
sysctl -p /etc/sysctl.d/99-orion.conf 2>/dev/null

# Limits for orion user
cat > /etc/security/limits.d/orion.conf << 'LIMITS'
orion soft nofile 65535
orion hard nofile 65535
orion soft nproc 4096
orion hard nproc 4096
LIMITS

echo "✅ System tuning applied"

# ============================================================
# Start Orion
# ============================================================
echo ""
echo "━━━ Starting Orion ━━━"
systemctl start orion
sleep 3

if systemctl is-active --quiet orion; then
    echo "✅ Orion is RUNNING"
else
    echo "❌ Orion failed to start. Check: journalctl -u orion -f"
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              SETUP COMPLETE ✅                   ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  Service:  systemctl status orion                ║"
echo "║  Logs:     journalctl -u orion -f                ║"
echo "║  Health:   curl http://localhost:8080/health      ║"
echo "║                                                  ║"
echo "║  Models dir:  $MODELS_DIR                        ║"
echo "║  Cache dir:   $CACHE_DIR                         ║"
echo "║  Server:      $ORION_HOME/server.py              ║"
echo "║                                                  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  NEXT STEPS:                                     ║"
echo "║                                                  ║"
echo "║  1. Add Gemini API key:                          ║"
echo "║     sudo nano /etc/systemd/system/orion.service.d/api-keys.conf"
echo "║     Add: Environment=\"GEMINI_API_KEY=xxx\"       ║"
echo "║     sudo systemctl daemon-reload                 ║"
echo "║     sudo systemctl restart orion                 ║"
echo "║                                                  ║"
echo "║  2. GCP Console — add network tag:               ║"
echo "║     Tag: http-server                             ║"
echo "║     (enables firewall rule allow-orion-8080)     ║"
echo "║                                                  ║"
echo "║  3. Enable deletion protection in GCP Console    ║"
echo "║                                                  ║"
echo "║  4. Test externally:                             ║"
echo "║     curl http://136.114.97.124:8080/health       ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Quick health check
echo "━━━ Health Check ━━━"
curl -sf http://localhost:8080/health 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "⏳ Server still warming up... try again in 30s"
echo ""
