import { useRef, useState, useCallback, useEffect } from "react";

interface Position { x: number; y: number }

export function useDraggable(initialPos?: Position) {
  const [pos, setPos] = useState<Position>(initialPos ?? { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offset = useRef<Position>({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from header area (data-drag-handle)
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;
    e.preventDefault();
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setIsDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;
    const touch = e.touches[0];
    offset.current = { x: touch.clientX - pos.x, y: touch.clientY - pos.y };
    setIsDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!isDragging) return;
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      setPos({ x: touch.clientX - offset.current.x, y: touch.clientY - offset.current.y });
    };
    const onTouchEnd = () => setIsDragging(false);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

  return { pos, isDragging, dragRef, onMouseDown, onTouchStart };
}
