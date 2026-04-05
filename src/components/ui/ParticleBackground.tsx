import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  opacityDir: number;
}

interface ParticleBackgroundProps {
  className?: string;
  particleCount?: number;
  color?: string;
}

export function ParticleBackground({ 
  className = "", 
  particleCount = 30,
  color = "180, 140, 80"
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // IntersectionObserver: only animate when visible
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
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
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.25 + 0.1,
        opacityDir: (Math.random() - 0.5) * 0.003,
      }));
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacityDir;

        if (p.opacity <= 0.05 || p.opacity >= 0.35) p.opacityDir *= -1;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.opacity * 0.15})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
        ctx.fill();
      }

      // Connection lines — limit to avoid O(n²) cost
      const len = Math.min(particles.length, 30);
      for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 25600) {
            const lineOpacity = (1 - Math.sqrt(distSq) / 160) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${color}, ${lineOpacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
    };
  }, [particleCount, color, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
}