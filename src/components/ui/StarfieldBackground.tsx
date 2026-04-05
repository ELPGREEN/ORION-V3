import { useEffect, useRef, useState } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: { r: number; g: number; b: number };
}

interface StarfieldBackgroundProps {
  className?: string;
  starCount?: number;
  speed?: number;
  depth?: number;
}

const GOLD_COLORS = [
  { r: 212, g: 175, b: 55 },   // gold
  { r: 180, g: 140, b: 80 },   // warm gold
  { r: 220, g: 200, b: 140 },  // light gold
  { r: 160, g: 130, b: 70 },   // dark gold
  { r: 200, g: 180, b: 160 },  // warm white
  { r: 240, g: 230, b: 210 },  // cream
];

export function StarfieldBackground({
  className = "",
  starCount = 120,
  speed = 0.15,
  depth = 800,
}: StarfieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      initStars(rect.width, rect.height);
    };

    const initStars = (w: number, h: number) => {
      starsRef.current = Array.from({ length: starCount }, () => ({
        x: (Math.random() - 0.5) * w * 2,
        y: (Math.random() - 0.5) * h * 2,
        z: Math.random() * depth,
        size: Math.random() * 2.5 + 0.5,
        brightness: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      }));
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const animate = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      timeRef.current += 1;

      const mx = mouseRef.current.x * 15;
      const my = mouseRef.current.y * 15;

      for (const star of starsRef.current) {
        // Move stars toward camera (z decreasing)
        star.z -= speed;
        if (star.z <= 0) {
          star.z = depth;
          star.x = (Math.random() - 0.5) * w * 2;
          star.y = (Math.random() - 0.5) * h * 2;
        }

        // Project 3D → 2D with perspective
        const scale = depth / (depth + star.z);
        const sx = (star.x + mx) * scale + cx;
        const sy = (star.y + my) * scale + cy;
        const r = star.size * scale;

        // Twinkle
        const twinkle = Math.sin(timeRef.current * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
        const alpha = star.brightness * twinkle * scale;

        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;

        const { r: cr, g: cg, b: cb } = star.color;

        // Glow
        if (r > 1) {
          ctx.beginPath();
          ctx.arc(sx, sy, r * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha * 0.08})`;
          ctx.fill();
        }

        // Star core
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();
      }

      // Subtle shooting star effect (rare)
      if (Math.random() < 0.003) {
        const sx = Math.random() * w;
        const sy = Math.random() * h * 0.5;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
        const len = 40 + Math.random() * 60;

        const gradient = ctx.createLinearGradient(
          sx, sy,
          sx + Math.cos(angle) * len,
          sy + Math.sin(angle) * len
        );
        gradient.addColorStop(0, "rgba(212, 175, 55, 0.6)");
        gradient.addColorStop(1, "rgba(212, 175, 55, 0)");

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
    };
  }, [starCount, speed, depth, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
}
