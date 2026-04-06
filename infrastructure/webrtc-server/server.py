#!/usr/bin/env python3
"""
ORION WebRTC Camera Signaling Server
Captures from V4L2/CSI camera, encodes H264, streams via WebRTC.
Signaling via HTTP POST /offer endpoint.
"""
import os
import json
import asyncio
import logging
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaPlayer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orion-webrtc")

CAMERA_DEVICE = os.getenv("CAMERA_DEVICE", "/dev/video0")
CAMERA_WIDTH = int(os.getenv("CAMERA_WIDTH", "1280"))
CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", "720"))
CAMERA_FPS = int(os.getenv("CAMERA_FPS", "30"))
WEBRTC_PORT = int(os.getenv("WEBRTC_PORT", "8443"))
STUN_SERVER = os.getenv("STUN_SERVER", "stun:stun.l.google.com:19302")

pcs = set()


def create_camera_player():
    """Create GStreamer pipeline for camera capture."""
    options = {
        "framerate": f"{CAMERA_FPS}/1",
        "video_size": f"{CAMERA_WIDTH}x{CAMERA_HEIGHT}",
    }
    try:
        player = MediaPlayer(CAMERA_DEVICE, format="v4l2", options=options)
        logger.info(f"Camera opened: {CAMERA_DEVICE} @ {CAMERA_WIDTH}x{CAMERA_HEIGHT} {CAMERA_FPS}fps")
        return player
    except Exception as e:
        logger.warning(f"Camera {CAMERA_DEVICE} unavailable: {e}, using test pattern")
        return MediaPlayer(
            "videotestsrc is-live=true pattern=ball ! videoconvert ! video/x-raw,width=640,height=480,framerate=30/1",
            format="gstreamer",
        )


async def offer_handler(request):
    """Handle WebRTC offer from browser client."""
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection(
        configuration={"iceServers": [{"urls": [STUN_SERVER]}]}
    )
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_state():
        logger.info(f"Connection state: {pc.connectionState}")
        if pc.connectionState in ("failed", "closed"):
            await pc.close()
            pcs.discard(pc)

    player = create_camera_player()
    if player.video:
        pc.addTrack(player.video)

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.json_response(
        {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type},
        headers={"Access-Control-Allow-Origin": "*"},
    )


async def health_handler(request):
    return web.json_response({"status": "ok", "peers": len(pcs)})


async def on_shutdown(app):
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()


app = web.Application()
app.on_shutdown.append(on_shutdown)

# CORS middleware
import aiohttp_cors
cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
        allow_methods="*",
    )
})

resource_offer = cors.add(app.router.add_resource("/offer"))
cors.add(resource_offer.add_route("POST", offer_handler))

resource_health = cors.add(app.router.add_resource("/health"))
cors.add(resource_health.add_route("GET", health_handler))

if __name__ == "__main__":
    logger.info(f"Starting WebRTC signaling on port {WEBRTC_PORT}")
    web.run_app(app, host="0.0.0.0", port=WEBRTC_PORT)
