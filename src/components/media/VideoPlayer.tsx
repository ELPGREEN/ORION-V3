interface VideoPlayerProps {
  src?: string;
  poster?: string;
  className?: string;
  videoId?: string;
  title?: string;
  tagColors?: string;
  tags?: React.ReactNode;
  [key: string]: any;
}

export function VideoPlayer({ src, poster, className, videoId }: VideoPlayerProps) {
  const videoSrc = src || (videoId ? `https://www.youtube.com/embed/${videoId}` : "");
  
  if (videoId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (!src) return null;
  return (
    <video controls poster={poster} className={className}>
      <source src={src} type="video/mp4" />
    </video>
  );
}
