import { useState } from "react";

export function useLightbox(_totalImages?: number) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const open = (src: string | number, index = 0) => {
    setCurrentSrc(String(src));
    setSelectedIndex(typeof src === "number" ? src : index);
    setIsOpen(true);
  };

  const openLightbox = open;

  const close = () => {
    setIsOpen(false);
    setCurrentSrc("");
  };

  const closeLightbox = close;

  const next = () => setSelectedIndex(prev => prev + 1);
  const prev = () => setSelectedIndex(prev => Math.max(0, prev - 1));

  return { isOpen, currentSrc, selectedIndex, open, close, next, prev, openLightbox, closeLightbox };
}
