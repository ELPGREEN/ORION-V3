import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface OrionStatusOrbProps {
  percentage: number;
  label?: string;
}

export function OrionStatusOrb({ percentage, label = "OPERACIONAL" }: OrionStatusOrbProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(percentage), 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-[260px] h-[260px] mx-auto">
      {/* Outer glow rings */}
      <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-pulse" />
      <div className="absolute inset-2 rounded-full border border-cyan-500/5" />
      <div className="absolute inset-4 rounded-full border border-blue-500/10" />

      {/* SVG rings */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 220 220">
        {/* Background track */}
        <circle cx="110" cy="110" r={radius} fill="none" stroke="hsl(210 50% 15% / 0.5)" strokeWidth="3" />
        {/* Progress arc */}
        <motion.circle
          cx="110" cy="110" r={radius}
          fill="none"
          stroke="url(#orbGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        {/* Inner decorative ring */}
        <circle cx="110" cy="110" r="70" fill="none" stroke="hsl(200 80% 50% / 0.15)" strokeWidth="1" strokeDasharray="4 8" />
        {/* HUD arc segments */}
        <circle cx="110" cy="110" r="80" fill="none" stroke="hsl(200 80% 50% / 0.2)" strokeWidth="2" strokeDasharray="20 40" className="animate-spin" style={{ animationDuration: "20s" }} />
        <circle cx="110" cy="110" r="100" fill="none" stroke="hsl(200 80% 50% / 0.1)" strokeWidth="1" strokeDasharray="10 30" className="animate-spin" style={{ animationDuration: "30s", animationDirection: "reverse" }} />
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(200, 90%, 50%)" />
            <stop offset="50%" stopColor="hsl(210, 95%, 60%)" />
            <stop offset="100%" stopColor="hsl(190, 85%, 45%)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-400/60 uppercase">ORION</span>
        <span className="text-4xl font-mono font-bold text-cyan-300" style={{ textShadow: "0 0 20px hsl(200 80% 50% / 0.5)" }}>
          {animated.toFixed(1)}%
        </span>
        <span className="text-[9px] font-mono tracking-[0.25em] text-green-400/80 uppercase mt-1">{label}</span>
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-radial from-cyan-500/5 to-transparent pointer-events-none" />
    </div>
  );
}
