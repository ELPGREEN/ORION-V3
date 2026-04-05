import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageLightboxProps {
  src?: string;
  alt?: string;
  isOpen?: boolean;
  onClose?: () => void;
  images?: { src: string; alt?: string }[];
  selectedIndex?: number;
  onNext?: () => void;
  onPrev?: () => void;
  useWatermark?: boolean;
}

export function ImageLightbox({ src, alt, isOpen, onClose, images, selectedIndex = 0, onNext, onPrev, useWatermark }: ImageLightboxProps) {
  if (!isOpen) return null;
  const displaySrc = images ? images[selectedIndex]?.src : src;
  const displayAlt = images ? images[selectedIndex]?.alt : alt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white z-10" onClick={onClose}><X /></button>
      {images && onPrev && selectedIndex > 0 && (
        <button className="absolute left-4 text-white z-10" onClick={(e) => { e.stopPropagation(); onPrev(); }}><ChevronLeft className="h-8 w-8" /></button>
      )}
      <img src={displaySrc} alt={displayAlt} className="max-h-[90vh] max-w-[90vw] object-contain" onClick={e => e.stopPropagation()} />
      {images && onNext && selectedIndex < images.length - 1 && (
        <button className="absolute right-4 text-white z-10" onClick={(e) => { e.stopPropagation(); onNext(); }}><ChevronRight className="h-8 w-8" /></button>
      )}
    </div>
  );
}
