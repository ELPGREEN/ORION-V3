import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, prevX: -1000, prevY: -1000 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;

      const dx = mouseRef.current.x - mouseRef.current.prevX;
      const dy = mouseRef.current.y - mouseRef.current.prevY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      const count = Math.min(Math.floor(speed * 0.3), 5);

      for (let i = 0; i < count; i++) {
        const t = i / Math.max(count, 1);
        const angle = Math.random() * Math.PI * 2;
        const v = Math.random() * 0.8 + 0.2;
        particlesRef.current.push({
          x: mouseRef.current.prevX + dx * t + (Math.random() - 0.5) * 6,
          y: mouseRef.current.prevY + dy * t + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * v + dx * 0.03,
          vy: Math.sin(angle) * v + dy * 0.03,
          life: 1,
          maxLife: Math.random() * 0.8 + 0.5,
        });
      }

      if (particlesRef.current.length > 120) {
        particlesRef.current = particlesRef.current.slice(-120);
      }
    };

    window.addEventListener("mousemove", onMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      const dt = 1 / 60;

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx;
        p.y += p.vy;
      }

      // Draw connections (the main visual — tech lines)
      const linkRadius = 90;
      const linkRadiusSq = linkRadius * linkRadius;
      const len = particles.length;

      for (let i = 0; i < len; i++) {
        const pi = particles[i];
        // Find closest 2 particles and draw links
        let closest1Idx = -1, closest1Dist = linkRadiusSq;
        let closest2Idx = -1, closest2Dist = linkRadiusSq;

        for (let j = 0; j < len; j++) {
          if (i === j) continue;
          const pj = particles[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < closest1Dist) {
            closest2Dist = closest1Dist;
            closest2Idx = closest1Idx;
            closest1Dist = distSq;
            closest1Idx = j;
          } else if (distSq < closest2Dist) {
            closest2Dist = distSq;
            closest2Idx = j;
          }
        }

        // Draw link to closest
        if (closest1Idx >= 0) {
          const pj = particles[closest1Idx];
          const dist = Math.sqrt(closest1Dist);
          const alpha = (1 - dist / linkRadius) * Math.min(pi.life, pj.life) * 0.7;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.strokeStyle = `rgba(170, 135, 75, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Draw link to 2nd closest
        if (closest2Idx >= 0) {
          const pj = particles[closest2Idx];
          const dist = Math.sqrt(closest2Dist);
          const alpha = (1 - dist / linkRadius) * Math.min(pi.life, pj.life) * 0.45;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.strokeStyle = `rgba(150, 120, 65, ${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // Draw tiny nodes (very subtle, not glowing balls)
      for (const p of particles) {
        const alpha = p.life * 0.65;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 160, 90, ${alpha})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
}
