const YOUTUBE_ORIGIN = "https://www.youtube.com";
const YOUTUBE_PATTERN = /(youtube\.com|youtu\.be)/i;

export function clampPercent(value: number | undefined, fallback = 100): number {
  const resolved = Number.isFinite(value) ? Math.round(value as number) : fallback;
  return Math.max(0, Math.min(100, resolved));
}

export function buildYouTubeSearchEmbed(query: string): string {
  const url = new URL("https://www.youtube.com/embed");
  url.searchParams.set("listType", "search");
  url.searchParams.set("list", query);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("enablejsapi", "1");
  return url.toString();
}

export function normalizeYouTubeEmbedUrl(url: string): string {
  if (!url) return url;

  let resolved = url.trim();
  const watchMatch = resolved.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&\s?]+)/i);
  if (watchMatch) {
    resolved = `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  try {
    const parsed = new URL(resolved, "https://www.youtube.com");
    if (!YOUTUBE_PATTERN.test(parsed.hostname) && !/youtube\.com/i.test(parsed.href)) {
      return resolved;
    }
    parsed.searchParams.set("autoplay", "1");
    parsed.searchParams.set("enablejsapi", "1");
    return parsed.toString();
  } catch {
    return resolved;
  }
}

export function postYouTubeIframeCommand(
  iframe: HTMLIFrameElement | null,
  func: string,
  args: unknown[] = [],
): boolean {
  const src = iframe?.src ?? "";
  if (!iframe?.contentWindow || !YOUTUBE_PATTERN.test(src)) return false;

  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func, args }),
    YOUTUBE_ORIGIN,
  );

  return true;
}
