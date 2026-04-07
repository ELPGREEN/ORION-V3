import { useRef, useEffect } from 'react';
import orionVideo from '@/assets/orion-tron-video.mp4';
import orionLogo from '@/assets/orion-logo-circle-gold.png';

export function OrionVideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-[#0a0a0f]">
      {/* Neon top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent z-10" />

      {/* Video container */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="relative aspect-video rounded-sm overflow-hidden border border-primary/10">
          {/* Video */}
          <video
            ref={videoRef}
            src={orionVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Round Logo Overlay */}
          <div className="absolute top-4 left-4 z-20">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <img
                src={orionLogo}
                alt="Orion Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.02) 2px, rgba(0,212,255,0.02) 4px)',
            }}
          />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-primary/30 z-10" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-primary/30 z-10" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-primary/30 z-10" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-primary/30 z-10" />

          {/* Bottom label */}
          <div className="absolute bottom-4 left-0 right-0 text-center z-10">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary/50 font-mono">
              ORION · A IA DO FUTURO
            </span>
          </div>
        </div>
      </div>

      {/* Neon bottom border */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent z-10" />
    </section>
  );
}
