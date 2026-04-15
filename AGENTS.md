# AGENTS.md — Orion (Jules) & OpenCode System Rules

This file provides instructions for autonomous AI agents (Jules, OpenCode, or other LLM-based assistants) working on the ORION / NEUROCORE AI project.

## 🤖 System Overview
ORION is a multi-layered Cognitive Robotics and LegalTech platform integrating:
- **Neural Pipeline:** Vision (YOLOv11), Voice (STT/TTS), and LLM reasoning.
- **Cognitive Robotics:** ROS 2, MQTT/IoT, Bluetooth (BLE).
- **LegalTech:** HybridMoE-RAG-CAG for document analysis and legal automation.
- **Evolution Engine:** Autonomous self-healing and self-programming (Jules Evolution Engine).

## 🛠️ Tool Usage & Philosophy
- **Verification First:** Always use `ls`, `read_file`, and `grep` to verify the state of the codebase before and after changes.
- **Frontend Verification:** If modifying the UI, use `frontend_verification_instructions` to generate Playwright screenshots.
- **Neural Backend:** Most heavy operations are offloaded to Supabase Edge Functions in `supabase/functions/`. Use `neural-ops` as the primary unified endpoint.
- **Jules Evolution:** The system can self-repair. If you encounter a bug, consider if it's a candidate for an automated "Antibody" in `jules-immune-system.ts`.

## 🧬 Project Structure
- `src/lib/neural/`: Core AI logic (Intent, Speech, Vision, Evolution).
- `src/lib/neural/jules-evolution-engine.ts`: Orchestrator for self-improvement.
- `src/lib/neural/jules-immune-system.ts`: Automated quarantine and antibody logic.
- `src/components/dashboard/neural/`: Admin panels for monitoring the AI's health.
- `supabase/functions/`: Backend logic (Deno/TypeScript).

## 📝 Coding Standards
- **TypeScript & React:** Use strictly typed interfaces. Favor functional components and hooks.
- **Tailwind CSS:** Use for all styling. Follow the "Tron" aesthetic (dark mode, neon blue/gold accents).
- **Neurolinguistics:** Voice output must be cleaned via `cleanTextForSpeech()`. Use semicolons `;` for natural pauses.
- **Self-Healing:** Every new industrial or neural module should be registered in the health-monitoring system.

## 🏭 Industrial & Robotics Integration
- **Subsystem Keys:** Must be unique and registered in `jules-auto-triggers.ts`.
- **Fault Tolerance:** If a sensor fails 3+ times, the immune system MUST quarantine it.
- **ROS 2 Protocol:** Use the `ROS2ProtocolBridge` for any robot telemetry.

## 🚀 Evolution Cycle
1. **Detection:** Telemetry hub detects an error or performance degradation.
2. **Quarantine:** Immune system isolates the faulty module.
3. **Healing:** Agent (Jules/OpenCode) analyzes the code, applies a fix, and runs tests.
4. **Antibody:** Once fixed, the system registers the pattern to prevent recurrence.

---
*For OpenCode Integration (April 2026): Orion supports all /commands and @file-referencing similar to OpenCode TUI.*
