import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

const GOLD_HUES = [20, 25, 30, 210, 215, 220];
const MAX_PARTICLES = 40; // Was 80 — halved for performance
const SPAWN_RATE = 1; // Was 2
const LINK_DISTANCE = 70; // Was 90 — reduces O(n²) checks

export function MouseTrailEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -9999, y: -9999, prevX: -9999, prevY: -9999, moving: false });
  const raf = useRef<number>(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunning = useRef(false);
  const animateFnRef = useRef<(() => void) | null>(null);
  const frameSkip = useRef(0);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    mouse.current.prevX = mouse.current.x;
    mouse.current.prevY = mouse.current.y;
    mouse.current.x = e.clientX;
    mouse.current.y = e.clientY;
    mouse.current.moving = true;

    if (!isRunning.current && animateFnRef.current) {
      isRunning.current = true;
      raf.current = requestAnimationFrame(animateFnRef.current);
    }

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      mouse.current.moving = false;
    }, 100);
  }, []);

  useEffect(() => {
    // Disable on mobile — saves significant GPU/CPU
    if (window.innerWidth < 768) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);

    const spawn = () => {
      const { x, y, prevX, prevY, moving } = mouse.current;
      if (x < -999 || !moving) return;
      for (let i = 0; i < SPAWN_RATE; i++) {
        const t = i / SPAWN_RATE;
        const px = prevX + (x - prevX) * t;
        const py = prevY + (y - prevY) * t;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.8;
        const p: Particle = {
          x: px + (Math.random() - 0.5) * 2,
          y: py + (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 0.6 + Math.random() * 0.6,
          size: 0.8 + Math.random() * 1.2,
          hue: GOLD_HUES[Math.floor(Math.random() * GOLD_HUES.length)],
        };
        if (particles.current.length >= MAX_PARTICLES) {
          const oldest = particles.current.reduce((a, b) => a.life < b.life ? a : b);
          Object.assign(oldest, p);
        } else {
          particles.current.push(p);
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      spawn();

      const dt = 0.016;
      const pts = particles.current;

      for (const p of pts) {
        p.life -= dt / p.maxLife;
        const nx = Math.sin(p.x * 0.012 + p.y * 0.009) * 0.15;
        const ny = Math.cos(p.y * 0.012 + p.x * 0.009) * 0.15;
        p.vx += nx * dt * 5;
        p.vy += ny * dt * 5;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx;
        p.y += p.vy;
      }

      // Links — only every other frame to reduce O(n²) cost
      frameSkip.current++;
      if (frameSkip.current % 2 === 0) {
        const linkDistSq = LINK_DISTANCE * LINK_DISTANCE;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          if (a.life <= 0) continue;
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j];
            if (b.life <= 0) continue;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < linkDistSq) {
              const dist = Math.sqrt(distSq);
              const alpha = (1 - dist / LINK_DISTANCE) * Math.min(a.life, b.life) * 0.08;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `hsla(${a.hue}, 55%, 50%, ${alpha})`;
              ctx.lineWidth = 0.3;
              ctx.stroke();
            }
          }
        }
      }

      // Particles — simplified: single glow + core (was 3 layers)
      for (const p of pts) {
        if (p.life <= 0) continue;
        const alpha = Math.pow(Math.max(0, p.life), 0.5) * 0.9;
        const r = p.size * (1 + (1 - p.life) * 0.3);

        // Single glow layer (was 2 separate radial gradients)
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        g.addColorStop(0, `hsla(${p.hue}, 75%, 80%, ${alpha * 0.6})`);
        g.addColorStop(0.4, `hsla(${p.hue}, 65%, 60%, ${alpha * 0.15})`);
        g.addColorStop(1, `hsla(${p.hue}, 55%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 50%, 92%, ${alpha})`;
        ctx.fill();
      }

      particles.current = pts.filter(p => p.life > 0);

      if (particles.current.length === 0 && !mouse.current.moving) {
        isRunning.current = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      raf.current = requestAnimationFrame(animate);
    };

    animateFnRef.current = animate;
    isRunning.current = true;
    raf.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [handlePointerMove]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
