import { cn } from "@/lib/utils";

interface VideoBackgroundProps {
  src?: string;
  className?: string;
  overlayClassName?: string;
  children?: React.ReactNode;
}

export function VideoBackground({ src, className, overlayClassName, children }: VideoBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {src && (
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30">
          <source src={src} type="video/mp4" />
        </video>
      )}
      {overlayClassName && <div className={cn("absolute inset-0", overlayClassName)} />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
