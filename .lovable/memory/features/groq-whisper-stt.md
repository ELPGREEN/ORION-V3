---
name: Groq Whisper STT
description: Speech-to-text via Groq Whisper free tier for Orion voice input
type: feature
---
Edge function: groq-whisper-stt
- Accepts base64 audio (JSON) or multipart/form-data
- Uses whisper-large-v3-turbo (default) or whisper-large-v3
- Free: 20 RPM, 2.000 RPD, 7.200 audio seconds/hour
- Returns: text, language, segments, duration
- GROQ_API_KEY already in secrets
