import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Auth helper ───
async function authenticateUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "Autenticação obrigatória." }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !user) return json({ error: "Não autorizado." }, 401);
  return { userId: user.id };
}

// ─── Supabase admin helper ───
function getSupabaseAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// ═══════════════════════════════════════════════════
// MQTT v3.1.1 Binary Packet Builder (Native WebSocket)
// ═══════════════════════════════════════════════════

const textEncoder = new TextEncoder();

function normalizeBrokerHost(rawBrokerUrl: string): string {
  const trimmed = rawBrokerUrl.trim();
  if (!trimmed) return trimmed;

  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `mqtt://${trimmed}`;

  try {
    return new URL(withProtocol).hostname;
  } catch {
    return trimmed
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");
  }
 }

function encodeRemainingLength(len: number): number[] {
  const bytes: number[] = [];
  do {
    let b = len % 128;
    len = Math.floor(len / 128);
    if (len > 0) b |= 0x80;
    bytes.push(b);
  } while (len > 0);
  return bytes;
}

function encodeUTF8String(str: string): Uint8Array {
  const encoded = textEncoder.encode(str);
  const result = new Uint8Array(2 + encoded.length);
  result[0] = (encoded.length >> 8) & 0xff;
  result[1] = encoded.length & 0xff;
  result.set(encoded, 2);
  return result;
}

function buildConnectPacket(clientId: string, username: string, password: string): Uint8Array {
  const protocolName = textEncoder.encode("MQTT");
  const clientIdBytes = encodeUTF8String(clientId);
  const usernameBytes = encodeUTF8String(username);
  const passwordBytes = encodeUTF8String(password);

  // Variable header: protocol name (2+4) + protocol level (1) + flags (1) + keepalive (2) = 10
  // Flags: username(1) password(1) willRetain(0) willQoS(00) willFlag(0) cleanSession(1) reserved(0) = 0b11000010 = 0xC2
  const variableHeader = new Uint8Array([
    0x00, 0x04, ...protocolName, // Protocol Name
    0x04,                        // Protocol Level (MQTT 3.1.1)
    0xC2,                        // Connect Flags: username + password + clean session
    0x00, 0x3C,                  // Keep Alive: 60 seconds
  ]);

  const payloadLength = clientIdBytes.length + usernameBytes.length + passwordBytes.length;
  const remainingLength = variableHeader.length + payloadLength;
  const rlBytes = encodeRemainingLength(remainingLength);

  const packet = new Uint8Array(1 + rlBytes.length + remainingLength);
  let offset = 0;
  packet[offset++] = 0x10; // CONNECT packet type
  for (const b of rlBytes) packet[offset++] = b;
  packet.set(variableHeader, offset); offset += variableHeader.length;
  packet.set(clientIdBytes, offset); offset += clientIdBytes.length;
  packet.set(usernameBytes, offset); offset += usernameBytes.length;
  packet.set(passwordBytes, offset);

  return packet;
}

function buildPublishPacket(topic: string, payload: string, qos: 0 | 1 | 2 = 1, retain = false, packetId = 1): Uint8Array {
  const topicBytes = encodeUTF8String(topic);
  const payloadBytes = textEncoder.encode(payload);

  // Fixed header first byte: 0x30 | (retain ? 0x01 : 0) | (qos << 1)
  const firstByte = 0x30 | (retain ? 0x01 : 0x00) | ((qos & 0x03) << 1);

  const hasPacketId = qos > 0;
  const remainingLength = topicBytes.length + (hasPacketId ? 2 : 0) + payloadBytes.length;
  const rlBytes = encodeRemainingLength(remainingLength);

  const packet = new Uint8Array(1 + rlBytes.length + remainingLength);
  let offset = 0;
  packet[offset++] = firstByte;
  for (const b of rlBytes) packet[offset++] = b;
  packet.set(topicBytes, offset); offset += topicBytes.length;
  if (hasPacketId) {
    packet[offset++] = (packetId >> 8) & 0xff;
    packet[offset++] = packetId & 0xff;
  }
  packet.set(payloadBytes, offset);

  return packet;
}

// ─── MQTT publish via native Deno WebSocket ───
async function mqttPublish(
  brokerUrl: string, username: string, password: string,
  topic: string, payload: string, qos: 0 | 1 | 2 = 1, retain = false
): Promise<{ ok: boolean; status: number; body: string; latencyMs: number }> {
  const start = Date.now();
  const brokerHost = normalizeBrokerHost(brokerUrl);
  const wssUrl = `wss://${brokerHost}:8884/mqtt`;
  const clientId = `orion_edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  return new Promise((resolve) => {
    let resolved = false;
    const done = (result: { ok: boolean; status: number; body: string }) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* ignore */ }
      resolve({ ...result, latencyMs: Date.now() - start });
    };

    const timer = setTimeout(() => {
      done({ ok: false, status: 504, body: `Timeout após ${Date.now() - start}ms` });
    }, 10000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wssUrl, ["mqtt"]);
      ws.binaryType = "arraybuffer";
    } catch (e: any) {
      clearTimeout(timer);
      resolved = true;
      resolve({ ok: false, status: 503, body: `Falha ao criar WebSocket: ${e.message}`, latencyMs: Date.now() - start });
      return;
    }

    ws.onopen = () => {
      try {
        const connectPacket = buildConnectPacket(clientId, username, password);
        ws.send(connectPacket);
      } catch (e: any) {
        done({ ok: false, status: 503, body: `Erro ao enviar CONNECT: ${e.message}` });
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      if (data.length < 2) return;

      const packetType = data[0] >> 4;

      // CONNACK = type 2 (0x20)
      if (packetType === 2) {
        const returnCode = data.length >= 4 ? data[3] : 255;
        if (returnCode !== 0) {
          const reasons: Record<number, string> = {
            1: "Protocolo inaceitável",
            2: "Client ID rejeitado",
            3: "Servidor indisponível",
            4: "Credenciais inválidas",
            5: "Não autorizado",
          };
          done({ ok: false, status: 401, body: reasons[returnCode] || `CONNACK code=${returnCode}` });
          return;
        }

        // Connected! Now publish
        try {
          const publishPacket = buildPublishPacket(topic, payload, qos, retain);
          ws.send(publishPacket);
          if (qos === 0) {
            // QoS 0: fire and forget
            done({ ok: true, status: 200, body: "Published via WSS (QoS 0)" });
          }
        } catch (e: any) {
          done({ ok: false, status: 500, body: `Erro ao enviar PUBLISH: ${e.message}` });
        }
        return;
      }

      // PUBACK = type 4 (0x40) — QoS 1 confirmation
      if (packetType === 4) {
        done({ ok: true, status: 200, body: "Published via WSS (QoS 1 PUBACK)" });
        return;
      }

      // PUBREC = type 5 (0x50) — QoS 2 step 1
      if (packetType === 5 && data.length >= 4) {
        // Send PUBREL
        const pubrel = new Uint8Array([0x62, 0x02, data[2], data[3]]);
        ws.send(pubrel);
        return;
      }

      // PUBCOMP = type 7 (0x70) — QoS 2 complete
      if (packetType === 7) {
        done({ ok: true, status: 200, body: "Published via WSS (QoS 2 PUBCOMP)" });
        return;
      }
    };

    ws.onerror = (event: Event) => {
      const msg = (event as any).message || "Erro WebSocket desconhecido";
      done({ ok: false, status: 503, body: msg });
    };

    ws.onclose = () => {
      if (!resolved) {
        done({ ok: false, status: 503, body: "WebSocket fechado inesperadamente" });
      }
    };
  });
}

// ─── Health check via WSS connect + publish ───
async function mqttHealthCheck(
  brokerUrl: string, username: string, password: string
): Promise<{ healthy: boolean; latencyMs: number; message: string; error?: string }> {
  const result = await mqttPublish(
    brokerUrl, username, password,
    "orion/health", JSON.stringify({ ping: true, timestamp: Date.now() }), 0, false
  );
  if (result.ok) {
    return { healthy: true, latencyMs: result.latencyMs, message: "Broker acessível via WSS e credenciais válidas" };
  }
  return {
    healthy: false, latencyMs: result.latencyMs,
    message: result.status === 401 ? "Credenciais inválidas" : `Erro [${result.status}]: ${result.body}`,
    error: result.body,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateUser(req);
    if (auth instanceof Response) return auth;

    const brokerUrl = Deno.env.get("HIVEMQ_BROKER_URL");
    const username = Deno.env.get("HIVEMQ_USERNAME");
    const password = Deno.env.get("HIVEMQ_PASSWORD");

    if (!brokerUrl || !username || !password) {
      return json({ error: "Credenciais HiveMQ não configuradas." }, 500);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Corpo JSON inválido" }, 400); }

    const action = typeof body.action === "string" ? body.action : "";

    // ═══ get_config ═══
    if (action === "get_config") {
      const brokerHost = normalizeBrokerHost(brokerUrl);
      const clusterId = brokerHost.replace(/\.s\d+\.hivemq\.cloud$/, "").split(".")[0];
      return json({
        wsUrl: `wss://${brokerHost}:8884/mqtt`,
        clusterId, broker: brokerHost,
        ports: { tls: 8883, wss: 8884 },
        protocol: "MQTT over WSS (Native WebSocket)",
      });
    }

    // ═══ publish ═══
    if (action === "publish") {
      const topic = typeof body.topic === "string" ? body.topic.trim() : "";
      if (!topic) return json({ error: "Campo obrigatório: topic" }, 400);
      if (topic.length > 256) return json({ error: "Topic excede 256 caracteres" }, 400);

      const payload = typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload || {});
      const qos = typeof body.qos === "number" && [0, 1, 2].includes(body.qos) ? body.qos as 0 | 1 | 2 : 1;
      const retain = body.retain === true;

      const result = await mqttPublish(brokerUrl, username, password, topic, payload, qos, retain);

      if (!result.ok) {
        console.error(`MQTT publish failed [${result.status}]: ${result.body}`);
        return json({
          success: false,
          error: result.status === 401 ? "Credenciais HiveMQ inválidas" : `MQTT erro [${result.status}]: ${result.body}`,
          detail: result.body, latencyMs: result.latencyMs,
        }, result.status >= 500 ? 502 : result.status);
      }

      // Auto-store telemetry for IoT topics
      if (topic.startsWith("robot/") || topic.startsWith("home/") || topic.startsWith("sensor/")) {
        try {
          const sb = getSupabaseAdmin();
          const parsedPayload = (() => { try { return JSON.parse(payload); } catch { return { raw: payload }; } })();
          const deviceId = parsedPayload.device_id || topic.split("/")[1] || "unknown";
          await sb.from("iot_telemetry").insert({
            device_id: deviceId, topic, payload: parsedPayload, received_at: new Date().toISOString(),
          });
        } catch (e) { console.warn("Auto-telemetry store failed:", e); }
      }

      return json({ success: true, topic, qos, retain, latencyMs: result.latencyMs });
    }

    // ═══ publish_batch ═══
    if (action === "publish_batch") {
      const msgs = Array.isArray(body.messages) ? body.messages : [];
      if (msgs.length === 0) return json({ error: "Nenhuma mensagem fornecida" }, 400);
      if (msgs.length > 20) return json({ error: "Máximo 20 mensagens por batch" }, 400);

      const results = await Promise.allSettled(
        msgs.map((m: any) => mqttPublish(
          brokerUrl, username, password,
          m.topic || "", typeof m.payload === "string" ? m.payload : JSON.stringify(m.payload || {}),
          m.qos ?? 1, m.retain ?? false
        ))
      );

      const summary = results.map((r, i) => ({
        topic: msgs[i]?.topic,
        success: r.status === "fulfilled" && r.value.ok,
        latencyMs: r.status === "fulfilled" ? r.value.latencyMs : null,
        error: r.status === "rejected" ? r.reason?.message : (r.status === "fulfilled" && !r.value.ok ? r.value.body : null),
      }));

      return json({
        success: summary.every(s => s.success),
        sent: summary.filter(s => s.success).length,
        failed: summary.filter(s => !s.success).length,
        results: summary,
      });
    }

    // ═══ health_check ═══
    if (action === "health_check") {
      const result = await mqttHealthCheck(brokerUrl, username, password);
      return json({ ...result, broker: brokerUrl, ports: { tls: 8883, wss: 8884 }, protocol: "MQTT over WSS (Native WebSocket)" });
    }

    // ═══ status ═══
    if (action === "status") {
      return json({ connected: true, broker: brokerUrl, protocol: "MQTT over WSS (Native WebSocket)", wsPort: 8884, tlsPort: 8883, userId: auth.userId });
    }

    // ═══ ingest ═══
    if (action === "ingest") {
      const deviceId = typeof body.device_id === "string" ? body.device_id : (typeof body.deviceId === "string" ? body.deviceId : "");
      if (!deviceId) return json({ error: "device_id é obrigatório" }, 400);

      const topic = typeof body.topic === "string" ? body.topic : null;
      const payload = body.payload ?? body.data ?? {};
      const sb = getSupabaseAdmin();
      const { data, error } = await sb.from("iot_telemetry").insert({
        device_id: deviceId, topic,
        payload: typeof payload === "string" ? JSON.parse(payload) : payload,
        received_at: new Date().toISOString(),
      }).select("id").single();

      if (error) { console.error("Telemetry insert error:", error); return json({ success: false, error: error.message }, 500); }
      return json({ success: true, telemetry_id: data.id, device_id: deviceId });
    }

    // ═══ ingest_batch ═══
    if (action === "ingest_batch") {
      const records = Array.isArray(body.records) ? body.records : [];
      if (records.length === 0) return json({ error: "Nenhum registro fornecido" }, 400);
      if (records.length > 100) return json({ error: "Máximo 100 registros por batch" }, 400);

      const rows = records.map((r: any) => ({
        device_id: r.device_id || r.deviceId || "unknown",
        topic: r.topic || null,
        payload: typeof r.payload === "string" ? JSON.parse(r.payload) : (r.payload || r.data || {}),
        received_at: r.received_at || new Date().toISOString(),
      }));

      const sb = getSupabaseAdmin();
      const { data, error } = await sb.from("iot_telemetry").insert(rows).select("id");
      if (error) { console.error("Batch insert error:", error); return json({ success: false, error: error.message }, 500); }
      return json({ success: true, inserted: data.length });
    }

    // ═══ device_command ═══
    if (action === "device_command") {
      const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
      const command = typeof body.command === "string" ? body.command : "";
      if (!deviceId || !command) return json({ error: "deviceId e command são obrigatórios" }, 400);

      const topic = `orion/devices/${deviceId}/command`;
      const payload = JSON.stringify({ command, params: body.params || {}, userId: auth.userId, timestamp: Date.now() });
      const result = await mqttPublish(brokerUrl, username, password, topic, payload, 1);

      return json({
        success: result.ok, deviceId, command, topic, latencyMs: result.latencyMs,
        error: result.ok ? null : result.body,
      });
    }

    // ═══ robot_command ═══
    if (action === "robot_command") {
      const robotId = typeof body.robotId === "string" ? body.robotId.trim() : "";
      const commandType = typeof body.commandType === "string" ? body.commandType : "";
      const payload = body.payload ?? {};

      if (!robotId) return json({ error: "robotId é obrigatório" }, 400);
      if (!commandType) return json({ error: "commandType é obrigatório" }, 400);

      // Validate command types and build topic
      const validCommands: Record<string, { topic: string; qos: 0 | 1 | 2 }> = {
        cmd_vel:        { topic: `robot/${robotId}/cmd_vel`,       qos: 1 },
        nav_goal:       { topic: `robot/${robotId}/nav/goal`,      qos: 1 },
        nav_cancel:     { topic: `robot/${robotId}/nav/cancel`,    qos: 1 },
        actuator:       { topic: `robot/${robotId}/actuator/${(payload as any)?.name || "default"}`, qos: 1 },
        emergency_stop: { topic: `robot/${robotId}/emergency_stop`, qos: 2 },
      };

      const cmdDef = validCommands[commandType];
      if (!cmdDef) return json({ error: `Comando inválido: ${commandType}. Válidos: ${Object.keys(validCommands).join(", ")}` }, 400);

      // Velocity safety limits
      if (commandType === "cmd_vel") {
        const p = payload as any;
        const maxLinear = 2.0; // m/s
        const maxAngular = 3.14; // rad/s
        if (p?.linear?.x != null && Math.abs(p.linear.x) > maxLinear) return json({ error: `Velocidade linear excede limite de ${maxLinear} m/s` }, 400);
        if (p?.angular?.z != null && Math.abs(p.angular.z) > maxAngular) return json({ error: `Velocidade angular excede limite de ${maxAngular} rad/s` }, 400);
      }

      // Actuator limits
      if (commandType === "actuator") {
        const val = (payload as any)?.data;
        if (val != null && (val < -1 || val > 1)) return json({ error: "Valor do atuador deve estar entre -1 e 1" }, 400);
      }

      const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
      const result = await mqttPublish(brokerUrl, username, password, cmdDef.topic, payloadStr, cmdDef.qos);

      // Store in telemetry
      try {
        const sb = getSupabaseAdmin();
        await sb.from("iot_telemetry").insert({
          device_id: `robot_${robotId}`,
          topic: cmdDef.topic,
          payload: typeof payload === "string" ? JSON.parse(payload) : payload,
          received_at: new Date().toISOString(),
        });
      } catch (e) { console.warn("Robot telemetry store failed:", e); }

      return json({
        success: result.ok,
        robotId, commandType,
        topic: cmdDef.topic,
        qos: cmdDef.qos,
        latencyMs: result.latencyMs,
        error: result.ok ? null : result.body,
      });
    }

    return json({ error: "Ação inválida. Use: get_config, publish, publish_batch, health_check, status, device_command, ingest, ingest_batch, robot_command" }, 400);
  } catch (error: any) {
    console.error("MQTT Bridge error:", error);
    return json({ error: error.message || "Erro interno" }, 500);
  }
});
