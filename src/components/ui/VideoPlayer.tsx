import { useState, useRef, useCallback } from "react";
import { Play, AlertTriangle, Loader2 } from "lucide-react";

interface VideoPlayerProps {
  /** Source URL for an MP4 (ignored if youtubeId is set) */
  src?: string;
  /** YouTube video ID — when present, renders the official YouTube IFrame embed instead of <video> */
  youtubeId?: string;
  poster?: string;
  title?: string;
  desc?: string;
}

export function VideoPlayer({ src, youtubeId, poster, title, desc }: VideoPlayerProps) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = useCallback(() => {
    // YouTube branch handled by iframe directly
    if (youtubeId) {
      setState("playing");
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    setState("loading");
    video.load();

    const onCanPlay = () => {
      setState("playing");
      video.play().catch(() => setState("error"));
      cleanup();
    };
    const onError = () => {
      setState("error");
      cleanup();
    };
    const cleanup = () => {
      video.removeEventListener("canplaythrough", onCanPlay);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("canplaythrough", onCanPlay, { once: true });
    video.addEventListener("error", onError, { once: true });
  }, [youtubeId]);

  return (
    <div className="border border-border/20 overflow-hidden group">
      <div className="relative aspect-video bg-card/50">
        {poster && state !== "playing" && (
          <img src={poster} alt={title || ""} className="absolute inset-0 w-full h-full object-cover" />
        )}

        {youtubeId ? (
          state === "playing" && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={title || "YouTube video player"}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )
        ) : (
          <video
            ref={videoRef}
            controls={state === "playing"}
            poster={poster}
            className={`w-full h-full object-cover ${state === "playing" ? "block" : "hidden"}`}
            preload="none"
            onEnded={() => setState("idle")}
            onError={() => { if (state === "playing") setState("error"); }}
          >
            {src && <source src={src} type="video/mp4" />}
          </video>
        )}

        {state === "idle" && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
            aria-label={`Play ${title}`}
          >
            <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-6 w-6 text-primary-foreground ml-1" />
            </div>
          </button>
        )}

        {state === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-xs text-muted-foreground">Vídeo indisponível</p>
            <button
              onClick={handlePlay}
              className="text-[10px] text-primary hover:underline cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      {(title || desc) && (
        <div className="p-4">
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          {desc && <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>}
        </div>
      )}
    </div>
  );
}
