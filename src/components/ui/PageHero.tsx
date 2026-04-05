import { useRef, useEffect, useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { StarfieldBackground } from "@/components/ui/StarfieldBackground";
import heroBg from "@/assets/bg-carbon-hero.jpg";

interface PageHeroProps {
  /** Small label above the title (e.g. "CONTATO DIRETO") */
  label?: string;
  /** Icon element to show before the label */
  labelIcon?: ReactNode;
  /** Page title — H1 */
  title: string;
  /** Optional highlighted last word(s) in gold */
  highlightLastWord?: boolean;
  /** Subtitle text */
  subtitle?: string;
  /** Extra content below subtitle (stats, buttons, etc.) */
  children?: ReactNode;
  /** Min height — defaults to 55vh */
  minHeight?: string;
  /** Show scroll indicator */
  showScrollIndicator?: boolean;
  /** Text alignment */
  align?: "center" | "left";
  /** Hide the background image (useful when AlienCoreBackground / Three.js is already active) */
  hideBackgroundImage?: boolean;
}

export function PageHero({
  label,
  labelIcon,
  title,
  highlightLastWord = false,
  subtitle,
  children,
  minHeight = "60vh",
  showScrollIndicator = true,
  align = "center",
  hideBackgroundImage = false,
}: PageHeroProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrollY(y);
          if (parallaxRef.current) {
            parallaxRef.current.style.transform = `translateY(${y * 0.4}px) scale(${1 + y * 0.0002})`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroTranslateY = scrollY * 0.15;

  // Split title for highlight
  const words = title.split(" ");
  const mainWords = highlightLastWord ? words.slice(0, -1).join(" ") : title;
  const lastWord = highlightLastWord ? words.slice(-1)[0] : "";

  const isCenter = align === "center";

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden"
      style={{ minHeight }}
    >
      {/* Parallax BG */}
      {!hideBackgroundImage && (
        <div
          ref={parallaxRef}
          className="absolute inset-0 -top-20 -bottom-20"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            willChange: "transform",
          }}
        />
      )}

      {/* Cinematic overlays — same as home */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/75 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.6)_70%,hsl(var(--background))_100%)]" />

      {/* Starfield — matching home density */}
      <StarfieldBackground starCount={120} speed={0.08} depth={800} className="z-[1] opacity-50" />

      {/* Dual nebula glows — like home */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-[100px] pointer-events-none" />

      {/* Multiple light beams — like home */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: Math.max(0, 0.6 - scrollY * 0.001) }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-[60%] hero-beam"
          style={{ background: `linear-gradient(to bottom, hsl(var(--primary) / 0.3), transparent)`, animationDelay: "0s" }}
        />
        <div
          className="absolute top-0 left-[30%] w-[1px] h-[40%] hero-beam"
          style={{ background: `linear-gradient(to bottom, hsl(var(--primary) / 0.15), transparent)`, animationDelay: "0.8s" }}
        />
        <div
          className="absolute top-0 right-[25%] w-[1px] h-[50%] hero-beam"
          style={{ background: `linear-gradient(to bottom, hsl(var(--primary) / 0.2), transparent)`, animationDelay: "1.6s" }}
        />
      </div>

      {/* Floating geometric elements — like home */}
      <div
        className="absolute top-20 right-4 sm:right-10 lg:right-40 w-16 h-16 sm:w-24 sm:h-24 md:w-36 md:h-36 border border-primary/20 opacity-30 parallax-float"
        style={{ transform: `translateY(${scrollY * -0.1}px) rotate(${scrollY * 0.02}deg)` }}
      />
      <div
        className="absolute bottom-40 left-4 sm:left-10 lg:left-32 w-12 h-12 sm:w-20 sm:h-20 md:w-28 md:h-28 border border-primary/15 opacity-20 parallax-float-delayed"
        style={{ transform: `translateY(${scrollY * -0.15}px)` }}
      />
      <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-primary/40 rounded-full glow-pulse hidden lg:block" />
      <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-primary/30 rounded-full glow-pulse hidden lg:block" style={{ animationDelay: "1s" }} />

      {/* Dot grid pattern — like home */}
      <div className="absolute inset-0 opacity-[0.03] hidden sm:block">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }} />
      </div>

      {/* Content */}
      <div
        className={`container relative z-10 py-16 sm:py-24 px-4 sm:px-6 ${isCenter ? "text-center" : ""}`}
        style={{
          opacity: heroOpacity,
          transform: `translate3d(0, ${heroTranslateY}px, 0)`,
        }}
      >
        <div className={isCenter ? "max-w-4xl mx-auto" : "max-w-3xl"}>
          {/* Label */}
          {label && (
            <div
              className={`inline-flex items-center gap-2 text-primary mb-5 text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase ${isCenter ? "justify-center" : ""}`}
              style={{
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translate3d(0,0,0)" : "translate3d(0, 20px, 0)",
                transition: "opacity 0.8s ease 0.2s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s",
              }}
            >
              {labelIcon}
              {label}
            </div>
          )}

          {/* Title — matching home sizes */}
          <h1
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-foreground tracking-wide mb-4 sm:mb-6"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translate3d(0,0,0)" : "translate3d(0, 40px, 0)",
              transition: "opacity 1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s, transform 1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s",
            }}
          >
            {highlightLastWord ? (
              <>
                {mainWords}{" "}
                <span className="text-gold-shine">{lastWord}</span>
              </>
            ) : (
              title
            )}
          </h1>

          {/* Gold line — matching home size */}
          <div
            className={`w-16 sm:w-24 h-1 bg-primary mb-4 sm:mb-6 ${isCenter ? "mx-auto" : ""}`}
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "scaleX(1)" : "scaleX(0)",
              transformOrigin: isCenter ? "center" : "left",
              transition: "opacity 0.8s ease 0.5s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.5s",
            }}
          />

          {/* Subtitle — matching home typography */}
          {subtitle && (
            <p
              className={`text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed font-light max-w-3xl ${isCenter ? "mx-auto text-justify px-2" : "text-justify"}`}
              style={{
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translate3d(0,0,0)" : "translate3d(0, 30px, 0)",
                transition: "opacity 0.8s ease 0.7s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.7s",
              }}
            >
              {subtitle}
            </p>
          )}

          {/* Extra content */}
          {children && (
            <div
              style={{
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translate3d(0,0,0)" : "translate3d(0, 30px, 0)",
                transition: "opacity 0.8s ease 0.9s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.9s",
              }}
            >
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      {showScrollIndicator && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: heroOpacity }}
        >
          <span className="text-[10px] text-muted-foreground/60 tracking-[0.2em] uppercase">scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-primary/40 to-transparent" />
        </div>
      )}
    </section>
  );
}
