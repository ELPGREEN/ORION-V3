#!/bin/bash
###############################################################
# ORION Robotic Line — One-click Deploy Script
# Run on robot or edge device (Jetson/RPi/Industrial PC)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh              # Core only (rosbridge + mqtt + webrtc)
#   ./deploy.sh --full       # All services
#   ./deploy.sh --telemetry  # Core + InfluxDB + Grafana
#   ./deploy.sh --debug      # Core + Foxglove Bridge
###############################################################

set -euo pipefail
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   ORION Robotic Line — Deployment Script     ║"
echo "  ║   Industrial Robotics Infrastructure          ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
check_prereqs() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker not found. Install: https://docs.docker.com/engine/install/${NC}"; exit 1; }
    docker compose version >/dev/null 2>&1 || { echo -e "${RED}Docker Compose v2 not found.${NC}"; exit 1; }
    echo -e "${GREEN}✓ Docker & Compose ready${NC}"
}

# Copy env if not exists
setup_env() {
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env from template. Edit with your robot's settings.${NC}"
    fi
}

# Deploy
deploy() {
    local PROFILES=""
    case "${1:-core}" in
        --full)
            PROFILES="--profile debug --profile telemetry --profile automation"
            echo -e "${CYAN}Deploying ALL services...${NC}"
            ;;
        --telemetry)
            PROFILES="--profile telemetry"
            echo -e "${CYAN}Deploying Core + Telemetry (InfluxDB + Grafana)...${NC}"
            ;;
        --debug)
            PROFILES="--profile debug"
            echo -e "${CYAN}Deploying Core + Foxglove Bridge...${NC}"
            ;;
        --automation)
            PROFILES="--profile automation"
            echo -e "${CYAN}Deploying Core + Node-RED...${NC}"
            ;;
        *)
            echo -e "${CYAN}Deploying Core services (ROSBridge + MQTT + WebRTC)...${NC}"
            ;;
    esac

    docker compose -f docker-compose.rosbridge.yml $PROFILES up -d --build

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ORION Deployment Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ROSBridge WS:  ${CYAN}ws://$(hostname -I | awk '{print $1}'):${ROSBRIDGE_PORT:-9090}${NC}"
    echo -e "  WebRTC Camera: ${CYAN}http://$(hostname -I | awk '{print $1}'):${WEBRTC_PORT:-8443}${NC}"
    echo -e "  MQTT Broker:   ${CYAN}mqtt://$(hostname -I | awk '{print $1}'):${MQTT_PORT:-1883}${NC}"
    
    if [[ "$PROFILES" == *"telemetry"* ]] || [[ "$PROFILES" == *"debug"* && "$PROFILES" == *"telemetry"* ]]; then
        echo -e "  InfluxDB:      ${CYAN}http://$(hostname -I | awk '{print $1}'):${INFLUXDB_PORT:-8086}${NC}"
        echo -e "  Grafana:       ${CYAN}http://$(hostname -I | awk '{print $1}'):${GRAFANA_PORT:-3001}${NC}"
    fi
    if [[ "$PROFILES" == *"debug"* ]]; then
        echo -e "  Foxglove:      ${CYAN}ws://$(hostname -I | awk '{print $1}'):${FOXGLOVE_PORT:-8765}${NC}"
    fi
    if [[ "$PROFILES" == *"automation"* ]]; then
        echo -e "  Node-RED:      ${CYAN}http://$(hostname -I | awk '{print $1}'):${NODERED_PORT:-1880}${NC}"
    fi
    echo ""
    echo -e "  ${YELLOW}Use these URLs in the ORION frontend to connect.${NC}"
}

check_prereqs
setup_env
deploy "${1:-core}"
