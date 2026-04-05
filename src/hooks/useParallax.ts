import { useEffect, useState, useRef } from "react";

export function useParallax(speed?: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const actualSpeed = speed ?? 0.5;

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setOffset(rect.top * actualSpeed);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [actualSpeed]);

  return { ref, offset };
}
