#!/bin/bash
# ORION GCP VM Setup Script
# Run on the t2a-standard-1 (Arm64 Debian 12) instance
# Usage: chmod +x setup.sh && sudo ./setup.sh

set -euo pipefail

echo "=== ORION VM Setup ==="

# System deps
apt-get update
apt-get install -y python3-pip python3-venv libsndfile1 ffmpeg psutil

# Create app user and dir
useradd -r -s /bin/false orion || true
mkdir -p /opt/orion /opt/piper-voices /tmp/orion-cache
chown orion:orion /opt/orion /tmp/orion-cache

# Python venv
python3 -m venv /opt/orion/venv
source /opt/orion/venv/bin/activate

# Install deps (torch CPU for Arm64)
pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install --no-cache-dir -r /opt/orion/requirements.txt
pip install --no-cache-dir psutil

# Copy server
cp server.py /opt/orion/
cp requirements.txt /opt/orion/

# Download Piper voice (pt_BR)
echo "Downloading Piper pt_BR voice..."
PIPER_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium"
wget -q "${PIPER_URL}/pt_BR-faber-medium.onnx" -O /opt/piper-voices/pt_BR-faber-medium.onnx || echo "Piper voice download failed (optional)"
wget -q "${PIPER_URL}/pt_BR-faber-medium.onnx.json" -O /opt/piper-voices/pt_BR-faber-medium.onnx.json || true

# Systemd service
cat > /etc/systemd/system/orion.service << 'EOF'
[Unit]
Description=Orion AI Server
After=network.target

[Service]
Type=simple
User=orion
WorkingDirectory=/opt/orion
Environment="GEMINI_API_KEY="
Environment="PIPER_VOICE=/opt/piper-voices/pt_BR-faber-medium.onnx"
Environment="HF_SPACE_URL=https://ericsonv12-orion-gpu.hf.space"
ExecStart=/opt/orion/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8080 --workers 1
Restart=always
RestartSec=5
MemoryMax=3G
MemoryHigh=2.5G

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "=== IMPORTANT: GCP API Setup Required ==="
echo ""
echo "1. Enable Generative Language API in GCP Console:"
echo "   https://console.cloud.google.com/apis/library?project=orion-d3734"
echo "   Search 'Generative Language API' and click ENABLE"
echo ""
echo "2. Grant Vertex AI User role to the VM service account:"
echo "   gcloud projects add-iam-policy-binding orion-d3734 \\"
echo "     --member='serviceAccount:550674472945-compute@developer.gserviceaccount.com' \\"
echo "     --role='roles/aiplatform.user'"
echo ""
echo "3. Update VM access scopes (requires stop/start):"
echo "   gcloud compute instances stop instance-20260409-234130 --zone=us-central1-f"
echo "   gcloud compute instances set-service-account instance-20260409-234130 \\"
echo "     --zone=us-central1-f \\"
echo "     --scopes=cloud-platform"
echo "   gcloud compute instances start instance-20260409-234130 --zone=us-central1-f"
echo ""

systemctl daemon-reload
systemctl enable orion
systemctl start orion

echo "=== ORION VM Setup Complete ==="
echo "Server running on port 8080"
echo ""
echo "IMPORTANT: Configure firewall rule to allow port 8080:"
echo "  gcloud compute firewall-rules create allow-orion --allow tcp:8080 --target-tags=orion-server"
echo ""
echo "Set your Gemini API key:"
echo "  sudo systemctl edit orion"
echo '  Add: Environment="GEMINI_API_KEY=your-key-here"'
echo "  sudo systemctl restart orion"
