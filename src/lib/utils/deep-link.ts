/**
 * ─── Smart Deep Linking — YouTube Only ───
 * Spotify and Amazon Music helpers were removed. YouTube is the only
 * supported media platform.
 */

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ─── Spotify ───

export function openSpotify(query: string) {
  const webUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;

  if (isMobileDevice()) {
    // spotify:// deep link opens the native app
    const deepLink = `spotify://search/${encodeURIComponent(query)}`;
    tryDeepLink(deepLink, webUrl);
  } else {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}

// ─── YouTube / YouTube Music ───

export function openYouTube(query: string, musicOnly = false) {
  const webUrl = musicOnly
    ? `https://music.youtube.com/search?q=${encodeURIComponent(query)}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  if (isMobileDevice()) {
    if (musicOnly) {
      // YouTube Music deep link
      const deepLink = isAndroid()
        ? `intent://music.youtube.com/search?q=${encodeURIComponent(query)}#Intent;package=com.google.android.apps.youtube.music;scheme=https;end`
        : `youtubemusic://search?q=${encodeURIComponent(query)}`;
      tryDeepLink(deepLink, webUrl);
    } else {
      // Regular YouTube — vnd.youtube:// works on both iOS and Android
      const deepLink = `vnd.youtube://results?search_query=${encodeURIComponent(query)}`;
      tryDeepLink(deepLink, webUrl);
    }
  } else {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}

export function openYouTubeVideo(videoId: string) {
  const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

  if (isMobileDevice()) {
    const deepLink = `vnd.youtube://${videoId}`;
    tryDeepLink(deepLink, webUrl);
  } else {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}

// ─── Amazon Music ───

export function openAmazonMusic(query?: string) {
  const webUrl = query?.trim()
    ? `https://music.amazon.com.br/search/${encodeURIComponent(query)}`
    : "https://music.amazon.com.br";

  if (isMobileDevice()) {
    const deepLink = isAndroid()
      ? `intent://music.amazon.com/search/${encodeURIComponent(query || "")}#Intent;package=com.amazon.mp3;scheme=https;end`
      : `amznmusic://search?query=${encodeURIComponent(query || "")}`;
    tryDeepLink(deepLink, webUrl);
  } else {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}

// ─── Generic deep link attempt with fallback ───

function tryDeepLink(deepLink: string, fallbackUrl: string) {
  // On Android intents, the fallback is built-in
  if (deepLink.startsWith("intent://")) {
    window.location.href = deepLink;
    return;
  }

  // For custom schemes (spotify://, vnd.youtube://, etc.)
  // Try to open the app, fall back to web after a timeout
  const start = Date.now();
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = deepLink;
  document.body.appendChild(iframe);

  setTimeout(() => {
    document.body.removeChild(iframe);
    // If the user hasn't left the page (app didn't open), open web
    if (Date.now() - start < 2500) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  }, 2000);
}
