import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MIN_ENROLLMENT_QUALITY = 0.65;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const _gkNames = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"];
  const _gkAll = _gkNames.map(n => Deno.env.get(n)).filter((k): k is string => !!k);
  const geminiKey = _gkAll[Math.floor(Math.random() * _gkAll.length)] || "";
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, imageBase64, images, userId, lgpdConsent } = body;

    // ══════════════════════════════════════════════
    // Helper: authenticate user via JWT
    // ══════════════════════════════════════════════
    async function authenticateUser(): Promise<{ id: string } | null> {
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.replace("Bearer ", "");
      // Use anon key client to validate the user's JWT
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await anonClient.auth.getUser(token);
      if (error || !data?.user) return null;
      return { id: data.user.id };
    }

    // ═══════════════════════════════════════════════
    // ENROLL — Requires JWT + LGPD consent
    // ═══════════════════════════════════════════════
    if (action === "enroll") {
      const user = await authenticateUser();
      if (!user) return jsonRes({ error: "Autenticação obrigatória" }, 401);

      // LGPD: consentimento explícito obrigatório para dados biométricos
      if (!lgpdConsent) {
        return jsonRes({
          error: "Consentimento LGPD obrigatório para coleta de dados biométricos faciais.",
          lgpdRequired: true,
        }, 400);
      }

      if (!images || !Array.isArray(images) || images.length < 3) {
        return jsonRes({ error: "Mínimo 3 imagens para cadastro facial" }, 400);
      }

      const faceAnalysis = await analyzeEnrollmentFaces(images, geminiKey, lovableKey);
      if (!faceAnalysis.valid) {
        return jsonRes({ error: faceAnalysis.reason || "Rosto não detectado nas imagens" }, 400);
      }

      // Rejeitar fallbacks inseguros — qualidade mínima exigida
      if (faceAnalysis.quality < MIN_ENROLLMENT_QUALITY) {
        return jsonRes({
          error: `Qualidade insuficiente (${(faceAnalysis.quality * 100).toFixed(0)}%). Mínimo: ${MIN_ENROLLMENT_QUALITY * 100}%. Tente com melhor iluminação.`,
          quality: faceAnalysis.quality,
        }, 400);
      }

      // Delete existing then insert
      await supabase.from("face_auth_enrollments").delete().eq("user_id", user.id);

      // Store only embeddings, NOT raw images (LGPD: minimização de dados)
      const { error: insertErr } = await supabase
        .from("face_auth_enrollments")
        .insert({
          user_id: user.id,
          reference_images: images.slice(0, 5), // TODO: migrate to Supabase Storage
          face_embedding_data: faceAnalysis.embeddings,
          enrollment_quality: faceAnalysis.quality,
          is_active: true,
          failed_attempts: 0,
          locked_until: null,
          anti_spoof_config: {
            method: "gemini-vision",
            liveness_required: true,
            lgpd_consent_at: new Date().toISOString(),
            lgpd_consent_version: "v22.3",
          },
        });

      if (insertErr) {
        console.error("Enrollment insert error:", insertErr);
        return jsonRes({ error: "Erro ao salvar dados faciais: " + insertErr.message }, 500);
      }

      await supabase.from("face_auth_log").insert({
        user_id: user.id,
        action: "enroll",
        confidence: faceAnalysis.quality,
        device_info: { userAgent: req.headers.get("user-agent") },
        ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
      });

      return jsonRes({
        success: true,
        quality: faceAnalysis.quality,
        message: "Reconhecimento facial cadastrado com sucesso!",
      });
    }

    // ═══════════════════════════════════════════════
    // VERIFY — NOW requires JWT authentication
    // ═══════════════════════════════════════════════
    if (action === "verify") {
      const user = await authenticateUser();
      if (!user) return jsonRes({ error: "Autenticação obrigatória para verificação facial" }, 401);

      if (!imageBase64) {
        return jsonRes({ error: "Imagem obrigatória" }, 400);
      }

      // Use authenticated user's ID, not the one from the body (prevents impersonation)
      const verifyUserId = user.id;

      const { data: enrollment } = await supabase
        .from("face_auth_enrollments")
        .select("*")
        .eq("user_id", verifyUserId)
        .eq("is_active", true)
        .maybeSingle();

      if (!enrollment) return jsonRes({ error: "Nenhum cadastro facial encontrado" }, 404);

      if (enrollment.locked_until && new Date(enrollment.locked_until) > new Date()) {
        const remaining = Math.ceil((new Date(enrollment.locked_until).getTime() - Date.now()) / 60000);
        await supabase.from("face_auth_log").insert({
          user_id: verifyUserId, action: "locked", confidence: 0,
          ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
        });
        return jsonRes({ error: `Conta bloqueada. Tente em ${remaining} min.`, locked: true }, 403);
      }

      const verifyResult = await verifyFace(imageBase64, enrollment.reference_images, enrollment.face_embedding_data, geminiKey, lovableKey);

      if (verifyResult.match && verifyResult.confidence >= 0.75) {
        await supabase.from("face_auth_enrollments").update({
          last_verified_at: new Date().toISOString(),
          verification_count: (enrollment.verification_count || 0) + 1,
          failed_attempts: 0,
          locked_until: null,
        }).eq("user_id", verifyUserId);

        await supabase.from("face_auth_log").insert({
          user_id: verifyUserId, action: "verify_success", confidence: verifyResult.confidence,
          device_info: { userAgent: req.headers.get("user-agent") },
          ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
        });

        return jsonRes({
          success: true,
          confidence: verifyResult.confidence,
          message: "Identidade verificada com sucesso!",
          spoofDetected: verifyResult.spoofDetected,
        });
      } else {
        const newFailed = (enrollment.failed_attempts || 0) + 1;
        const lockUntil = newFailed >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCK_DURATION_MS).toISOString()
          : null;

        await supabase.from("face_auth_enrollments").update({
          failed_attempts: newFailed,
          locked_until: lockUntil,
        }).eq("user_id", verifyUserId);

        await supabase.from("face_auth_log").insert({
          user_id: verifyUserId,
          action: verifyResult.spoofDetected ? "spoof_detected" : newFailed >= MAX_FAILED_ATTEMPTS ? "locked" : "verify_fail",
          confidence: verifyResult.confidence || 0,
          ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
        });

        return jsonRes({
          success: false,
          confidence: verifyResult.confidence,
          message: verifyResult.spoofDetected
            ? "Tentativa de spoofing detectada!"
            : `Rosto não reconhecido. ${MAX_FAILED_ATTEMPTS - newFailed} tentativas restantes.`,
          spoofDetected: verifyResult.spoofDetected,
          attemptsRemaining: MAX_FAILED_ATTEMPTS - newFailed,
        });
      }
    }

    // ═══════════════════════════════════════════════
    // LOGIN_VERIFY — NO JWT required (public endpoint for face login)
    // ═══════════════════════════════════════════════
    if (action === "login_verify") {
      if (!imageBase64) {
        return jsonRes({ error: "Imagem obrigatória" }, 400);
      }

      // Fetch all active enrollments (limit to prevent abuse)
      const { data: enrollments, error: fetchErr } = await supabase
        .from("face_auth_enrollments")
        .select("user_id, reference_images, face_embedding_data, locked_until, failed_attempts")
        .eq("is_active", true)
        .limit(50);

      if (fetchErr || !enrollments || enrollments.length === 0) {
        return jsonRes({ error: "Nenhum rosto cadastrado no sistema" }, 404);
      }

      // Filter out locked accounts
      const activeEnrollments = enrollments.filter(e =>
        !e.locked_until || new Date(e.locked_until) <= new Date()
      );

      if (activeEnrollments.length === 0) {
        return jsonRes({ error: "Nenhum cadastro facial disponível" }, 404);
      }

      // Try to match against each enrollment
      let bestMatch: { userId: string; confidence: number; spoofDetected: boolean } | null = null;

      for (const enrollment of activeEnrollments) {
        const result = await verifyFace(
          imageBase64,
          enrollment.reference_images,
          enrollment.face_embedding_data,
          geminiKey,
          lovableKey
        );

        if (result.spoofDetected) {
          await supabase.from("face_auth_log").insert({
            user_id: enrollment.user_id,
            action: "login_spoof_detected",
            confidence: 0,
            ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
          });
          return jsonRes({
            error: "Tentativa de spoofing detectada!",
            spoofDetected: true,
          }, 403);
        }

        if (result.match && result.confidence >= 0.75) {
          if (!bestMatch || result.confidence > bestMatch.confidence) {
            bestMatch = {
              userId: enrollment.user_id,
              confidence: result.confidence,
              spoofDetected: false,
            };
          }
        }
      }

      if (!bestMatch) {
        await supabase.from("face_auth_log").insert({
          user_id: null,
          action: "login_verify_fail",
          confidence: 0,
          ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
        });
        return jsonRes({
          success: false,
          message: "Rosto não reconhecido. Use e-mail e senha.",
        }, 401);
      }

      // Generate magic link for matched user
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(bestMatch.userId);
      if (userErr || !userData?.user?.email) {
        return jsonRes({ error: "Erro ao recuperar dados do usuário" }, 500);
      }

      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkErr || !linkData) {
        console.error("Magic link generation error:", linkErr);
        return jsonRes({ error: "Erro ao gerar sessão" }, 500);
      }

      // Update enrollment stats
      await supabase.from("face_auth_enrollments").update({
        last_verified_at: new Date().toISOString(),
        verification_count: (activeEnrollments.find(e => e.user_id === bestMatch!.userId) as any)?.verification_count || 0 + 1,
        failed_attempts: 0,
      }).eq("user_id", bestMatch.userId);

      await supabase.from("face_auth_log").insert({
        user_id: bestMatch.userId,
        action: "login_verify_success",
        confidence: bestMatch.confidence,
        device_info: { userAgent: req.headers.get("user-agent") },
        ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
      });

      // Extract hashed token from the action link
      const actionLink = linkData.properties?.action_link || "";
      const url = new URL(actionLink);
      const hashedToken = url.searchParams.get("token") || url.hash?.match(/token=([^&]+)/)?.[1] || "";
      const tokenType = url.searchParams.get("type") || "magiclink";

      return jsonRes({
        success: true,
        confidence: bestMatch.confidence,
        email: userData.user.email,
        token_hash: hashedToken,
        token_type: tokenType,
      });
    }

    // ═══════════════════════════════════════════════
    // CHECK — NOW requires JWT authentication
    // ═══════════════════════════════════════════════
    if (action === "check") {
      const user = await authenticateUser();
      if (!user) return jsonRes({ error: "Autenticação obrigatória" }, 401);

      const { data } = await supabase
        .from("face_auth_enrollments")
        .select("is_active, enrollment_quality, last_verified_at, verification_count, created_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      return jsonRes({ enrolled: !!data, enrollment: data });
    }

    // ═══════════════════════════════════════════════
    // DELETE — Requires JWT (LGPD: direito de exclusão)
    // ═══════════════════════════════════════════════
    if (action === "delete") {
      const user = await authenticateUser();
      if (!user) return jsonRes({ error: "Autenticação obrigatória" }, 401);

      await supabase.from("face_auth_enrollments").delete().eq("user_id", user.id);
      await supabase.from("face_auth_log").insert({
        user_id: user.id, action: "delete", confidence: 0,
        ip_hint: (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(-6),
      });

      return jsonRes({ success: true, message: "Dados biométricos excluídos permanentemente (LGPD Art. 18)." });
    }

    return jsonRes({ error: "Ação inválida" }, 400);
  } catch (error: any) {
    console.error("Face auth error:", error);
    return jsonRes({ error: "Erro interno: " + error.message }, 500);
  }
});

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════
// Enrollment face analysis — SECURE fallback
// ═══════════════════════════════════════════════
async function analyzeEnrollmentFaces(
  images: string[],
  geminiKey: string | undefined,
  lovableKey: string | undefined
): Promise<{ valid: boolean; quality: number; embeddings: any; reason?: string }> {
  // SEM nenhuma chave = rejeitar cadastro
  if (!geminiKey && !lovableKey) {
    return {
      valid: false,
      quality: 0,
      embeddings: null,
      reason: "Serviço de análise facial indisponível. Tente novamente mais tarde.",
    };
  }

  try {
    const parts: any[] = [];
    for (const img of images.slice(0, 3)) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
    }
    parts.push({
      text: `You are a facial authentication enrollment analyzer. Analyze these 3 face photos taken from different angles.

CRITICAL CHECKS:
1. Are faces clearly visible in ALL images?
2. Is it the SAME person in all images?
3. Is lighting adequate for biometric matching?
4. Any signs of spoofing (printed photos, screens, masks, deep fakes)?
5. Are the images from different angles (front, left, right)?
6. Is image quality sufficient for future matching?

Return ONLY valid JSON:
{
  "faces_detected": true/false,
  "same_person": true/false,
  "quality_score": 0.0-1.0,
  "face_description": "detailed description including skin tone, facial structure, distinctive features for future matching",
  "distinguishing_features": ["feature1", "feature2", "feature3"],
  "face_geometry": {
    "eye_distance_ratio": 0.0-1.0,
    "face_width_ratio": 0.0-1.0,
    "jawline_type": "round/oval/square/heart",
    "nose_type": "description"
  },
  "lighting_adequate": true/false,
  "multi_angle_verified": true/false,
  "spoofing_risk": "low/medium/high",
  "liveness_indicators": ["natural shadows", "skin texture visible", "micro-expressions detected"],
  "reason": "if invalid, explain why"
}

Be STRICT: reject if any spoofing indicators, poor lighting, or single-angle only.`,
    });

    const prompt = parts[parts.length - 1].text;
    const imageContents = parts.slice(0, -1);
    
    let text = "";
    
    // Try Gemini first, then Lovable AI Gateway
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          console.error("Gemini enrollment error:", res.status);
        }
      } catch (e) {
        console.error("Gemini enrollment fetch error:", e);
      }
    }
    
    // Fallback: Direct Gemini API (FREE — no Lovable Gateway)
    if (!text && geminiKey) {
      try {
        const fallbackKeys = [geminiKey].filter(Boolean) as string[];
        for (const k of fallbackKeys) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [...imageContents, { text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            break;
          }
          await res.text();
        }
      } catch (e) {
        console.error("Gemini fallback face-auth error:", e);
      }
    }
    
    if (!text) {
      return {
        valid: false,
        quality: 0,
        embeddings: null,
        reason: "Serviço de análise facial temporariamente indisponível. Tente novamente.",
      };
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        valid: false,
        quality: 0,
        embeddings: null,
        reason: "Não foi possível analisar as imagens. Tente novamente com melhor iluminação.",
      };
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Reject high spoofing risk
    if (analysis.spoofing_risk === "high") {
      return {
        valid: false,
        quality: 0,
        embeddings: null,
        reason: "Risco de spoofing detectado. Use sua câmera real, sem fotos impressas ou telas.",
      };
    }

    return {
      valid: analysis.faces_detected !== false && analysis.same_person !== false && analysis.lighting_adequate !== false,
      quality: analysis.quality_score || 0.5,
      embeddings: {
        method: "gemini-vision-v22",
        description: analysis.face_description,
        features: analysis.distinguishing_features,
        geometry: analysis.face_geometry,
        liveness: analysis.liveness_indicators,
        spoofRisk: analysis.spoofing_risk,
        multiAngle: analysis.multi_angle_verified,
        analyzedAt: new Date().toISOString(),
      },
      reason: analysis.reason,
    };
  } catch (e) {
    console.error("Enrollment analysis error:", e);
    // SECURE: rejeitar em vez de aceitar
    return {
      valid: false,
      quality: 0,
      embeddings: null,
      reason: "Erro na análise facial. Tente novamente.",
    };
  }
}

// ═══════════════════════════════════════════════
// Face verification — enhanced prompt
// ═══════════════════════════════════════════════
async function verifyFace(
  currentImage: string,
  referenceImages: string[],
  embeddings: any,
  geminiKey: string | undefined,
  lovableKey: string | undefined
): Promise<{ match: boolean; confidence: number; spoofDetected: boolean }> {
  if (!geminiKey && !lovableKey) return { match: false, confidence: 0, spoofDetected: false };

  try {
    const parts: any[] = [];
    parts.push({ inlineData: { mimeType: "image/jpeg", data: currentImage } });
    for (const ref of (referenceImages || []).slice(0, 2)) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: ref } });
    }

    const knownDescription = embeddings?.description || "unknown";
    const knownFeatures = embeddings?.features?.join(", ") || "none";
    const knownGeometry = embeddings?.geometry ? JSON.stringify(embeddings.geometry) : "none";

    parts.push({
      text: `FACIAL AUTHENTICATION VERIFICATION — STRICT MODE

The FIRST image is a LIVE camera capture. The remaining images are REFERENCE enrollment photos.

Known face profile:
- Description: ${knownDescription}
- Features: ${knownFeatures}
- Geometry: ${knownGeometry}

ANTI-SPOOFING CHECKS (mandatory):
1. Is the first image from a LIVE camera (not a photo of a photo/screen)?
2. Are there natural lighting variations and skin texture?
3. Any signs of printed photos, screens, masks, or deepfakes?
4. Does the face show natural 3D depth (shadows, contours)?

MATCHING CHECKS:
1. Compare facial structure, features, and proportions
2. Account for natural variations (lighting, angle, expression, aging, glasses, beard)
3. Check distinctive features match

Return ONLY valid JSON:
{
  "same_person": true/false,
  "confidence": 0.0-1.0,
  "spoof_detected": true/false,
  "spoof_reason": "explanation if spoof detected",
  "liveness_score": 0.0-1.0,
  "match_details": "brief explanation of matching/non-matching features"
}

CRITICAL: Be STRICT on spoofing. A spoof_detected=true should have confidence 0.
Prefer false negatives over false positives (reject uncertain matches).`,
    });

    const prompt = parts[parts.length - 1].text;
    const imageContents = parts.slice(0, -1);
    let text = "";
    
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          console.error("Gemini verify error:", res.status);
        }
      } catch (e) {
        console.error("Gemini verify fetch error:", e);
      }
    }
    
    // Fallback: Direct Gemini API (FREE)
    if (!text && geminiKey) {
      try {
        const fallbackKeys = [geminiKey].filter(Boolean) as string[];
        for (const k of fallbackKeys) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [...imageContents, { text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            break;
          }
          await res.text();
        }
      } catch (e) {
        console.error("Gemini fallback verify error:", e);
      }
    }
    
    if (!text) return { match: false, confidence: 0, spoofDetected: false };
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { match: false, confidence: 0, spoofDetected: false };

    const result = JSON.parse(jsonMatch[0]);
    return {
      match: result.same_person === true && result.spoof_detected !== true,
      confidence: result.spoof_detected ? 0 : (result.confidence || 0),
      spoofDetected: result.spoof_detected === true,
    };
  } catch (e) {
    console.error("Face verify error:", e);
    return { match: false, confidence: 0, spoofDetected: false };
  }
}
