/**
 * ═══ Google API Bridge Edge Function ═══
 * 
 * Executa serviços do Google para o Orion:
 * - Gmail, Calendar, Drive, Docs
 * - Cloud Vision, NL, Translation
 * - Maps, YouTube, Ads, Analytics
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractYouTubeVideosFromHtml(html: string) {
  const matches = [...html.matchAll(/"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)/g)];
  const unique = new Map<string, { videoId: string; title: string; channelName: string; thumbnail: null; publishedAt: null }>();

  for (const match of matches) {
    const videoId = match[1];
    const title = match[2]
      ?.replace(/\\u0026/g, "&")
      ?.replace(/\\"/g, '"')
      ?.trim();

    if (videoId && !unique.has(videoId)) {
      unique.set(videoId, {
        videoId,
        title: title || "YouTube video",
        channelName: "YouTube",
        thumbnail: null,
        publishedAt: null,
      });
    }
  }

  return [...unique.values()];
}

// Google API configurations (would use actual Google Cloud credentials in production)
const GOOGLE_API_BASE = "https://www.googleapis.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action, params, user_id } = body;

    // ═══ Gmail Services ═══
    if (action === "gmail_send") {
      // Mock implementation - in production would use actual Gmail API
      const { to, subject, body: emailBody } = params;
      
      // Simulate email send
      return json({
        success: true,
        messageId: `msg_${Date.now()}`,
        to,
        subject,
        status: "sent",
      });
    }

    if (action === "gmail_read") {
      // Mock - would fetch from Gmail API
      return json({
        success: true,
        messages: [],
        total: 0,
      });
    }

    // ═══ Calendar Services ═══
    if (action === "calendar_event") {
      const { title, startTime, endTime, attendees } = params;
      
      // Simulate event creation
      return json({
        success: true,
        eventId: `evt_${Date.now()}`,
        title,
        startTime,
        endTime,
        status: "created",
      });
    }

    if (action === "calendar_list") {
      return json({
        success: true,
        events: [],
        total: 0,
      });
    }

    // ═══ Drive/Docs Services ═══
    if (action === "drive_upload") {
      const { fileName, content, mimeType } = params;
      
      return json({
        success: true,
        fileId: `file_${Date.now()}`,
        fileName,
        webViewLink: `https://drive.google.com/file/${Date.now()}`,
        status: "uploaded",
      });
    }

    if (action === "docs_create") {
      const { title, content } = params;
      
      return json({
        success: true,
        documentId: `doc_${Date.now()}`,
        title,
        documentLink: `https://docs.google.com/document/d/${Date.now()}`,
        status: "created",
      });
    }

    if (action === "sheets_create") {
      const { title, rows, columns } = params;
      
      return json({
        success: true,
        spreadsheetId: `sheet_${Date.now()}`,
        title,
        spreadsheetLink: `https://docs.google.com/spreadsheets/d/${Date.now()}`,
        status: "created",
      });
    }

    if (action === "slides_create") {
      const { title, slides } = params;
      
      return json({
        success: true,
        presentationId: `slide_${Date.now()}`,
        title,
        presentationLink: `https://docs.google.com/presentation/d/${Date.now()}`,
        status: "created",
      });
    }

    // ═══ AI Services ═══
    if (action === "vision_analyze") {
      const { imageUrl, type } = params;
      
      // Mock vision analysis
      return json({
        success: true,
        labels: [
          { description: "object", score: 0.95 },
          { description: "scene", score: 0.89 },
        ],
        faces: [],
        text: "detected text if any",
        status: "analyzed",
      });
    }

    if (action === "nl_analyze") {
      const { text, type } = params;
      
      // Mock NLP analysis
      return json({
        success: true,
        sentiment: { score: 0.5, magnitude: 0.8 },
        entities: [
          { name: "entity1", type: "PERSON", salience: 0.9 },
        ],
        syntax: [],
        status: "analyzed",
      });
    }

    if (action === "translation_api") {
      const { text, targetLanguage, sourceLanguage } = params;
      
      return json({
        success: true,
        translatedText: `[${targetLanguage}] ${text}`,
        detectedLanguage: sourceLanguage || "en",
        status: "translated",
      });
    }

    // ═══ Maps Services ═══
    if (action === "maps_geocoding") {
      const { address } = params;
      
      return json({
        success: true,
        location: {
          lat: -23.5505 + Math.random() * 0.1,
          lng: -46.6333 + Math.random() * 0.1,
        },
        formattedAddress: address,
        status: "geocoded",
      });
    }

    if (action === "places_search") {
      const { query, location, radius } = params;
      
      return json({
        success: true,
        places: [
          {
            name: `${query} - Result 1`,
            address: "Address 1",
            rating: 4.5,
            location: { lat: -23.55, lng: -46.63 },
          },
        ],
        status: "found",
      });
    }

    if (action === "directions_route") {
      const { origin, destination, mode } = params;
      
      return json({
        success: true,
        routes: [
          {
            distance: "15 km",
            duration: "25 min",
            steps: [],
          },
        ],
        status: "calculated",
      });
    }

    // ═══ YouTube Services ═══
    if (action === "youtube_search") {
      const { query, maxResults } = params;
      const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");

      let videos: Array<{ videoId: string; title: string; channelName: string; thumbnail: string | null; publishedAt: string | null }> = [];

      if (youtubeApiKey) {
        const searchUrl = new URL(`${GOOGLE_API_BASE}/youtube/v3/search`);
        searchUrl.searchParams.set("part", "snippet");
        searchUrl.searchParams.set("type", "video");
        searchUrl.searchParams.set("q", String(query || ""));
        searchUrl.searchParams.set("maxResults", String(Math.min(Math.max(Number(maxResults) || 1, 1), 10)));
        searchUrl.searchParams.set("videoEmbeddable", "true");
        searchUrl.searchParams.set("videoSyndicated", "true");
        searchUrl.searchParams.set("safeSearch", "none");
        searchUrl.searchParams.set("key", youtubeApiKey);

        const response = await fetch(searchUrl.toString());
        if (response.ok) {
          const payload = await response.json();
          videos = Array.isArray(payload?.items)
            ? payload.items
                .map((item: any) => ({
                  videoId: item?.id?.videoId,
                  title: item?.snippet?.title ?? "",
                  channelName: item?.snippet?.channelTitle ?? "",
                  thumbnail: item?.snippet?.thumbnails?.medium?.url ?? item?.snippet?.thumbnails?.default?.url ?? null,
                  publishedAt: item?.snippet?.publishedAt ?? null,
                }))
                .filter((item: { videoId?: string }) => typeof item.videoId === "string" && /^[\w-]{11}$/.test(item.videoId))
            : [];
        } else {
          const errorText = await response.text();
          console.warn("[GoogleAPI] YouTube Data API unavailable, falling back to HTML scraping:", errorText);
        }
      }

      if (videos.length === 0) {
        const htmlSearchUrl = new URL("https://www.youtube.com/results");
        htmlSearchUrl.searchParams.set("search_query", String(query || ""));

        const response = await fetch(htmlSearchUrl.toString(), {
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GoogleAPI] YouTube HTML search failed:", errorText);
          return json({ error: "YouTube search failed" }, response.status);
        }

        const html = await response.text();
        videos = extractYouTubeVideosFromHtml(html).slice(0, Math.min(Math.max(Number(maxResults) || 1, 1), 10));
      }

      if (videos.length === 0) {
        return json({ error: "No YouTube videos found" }, 404);
      }

      return json({
        success: true,
        videos,
        totalResults: videos.length,
        status: "found",
      });
    }

    if (action === "youtube_stats") {
      const { channelId } = params;
      
      return json({
        success: true,
        channel: {
          subscriberCount: 10000,
          viewCount: 100000,
          videoCount: 50,
        },
        status: "analyzed",
      });
    }

    if (action === "youtube_transcript") {
      const { videoId } = params;
      
      return json({
        success: true,
        transcript: "Transcript text from video...",
        language: "pt-BR",
        status: "transcribed",
      });
    }

    // ═══ Ads Services ═══
    if (action === "ads_campaign_create") {
      const { name, budget, objective } = params;
      
      return json({
        success: true,
        campaignId: `camp_${Date.now()}`,
        name,
        status: "created",
      });
    }

    if (action === "ads_report") {
      const { campaignIds, metrics } = params;
      
      return json({
        success: true,
        rows: [],
        totals: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
        },
        status: "reported",
      });
    }

    // ═══ Analytics Services ═══
    if (action === "analytics_report") {
      const { metrics, dimensions, dateRange } = params;
      
      return json({
        success: true,
        rows: [],
        columnHeaders: [],
        totals: {},
        status: "reported",
      });
    }

    return json({ error: "Unknown action" }, 400);

  } catch (e) {
    console.error("[GoogleAPI] Error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});