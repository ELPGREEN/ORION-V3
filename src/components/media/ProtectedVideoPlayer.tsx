interface ProtectedVideoPlayerProps {
  src?: string;
  poster?: string;
  className?: string;
  [key: string]: any;
}

export function ProtectedVideoPlayer({ src, poster, className }: ProtectedVideoPlayerProps) {
  if (!src) return null;
  return (
    <div className={className}>
      <video controls poster={poster} className="w-full">
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
