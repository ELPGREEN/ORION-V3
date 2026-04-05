import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarouselProps {
  images: string[];
  title: string;
}

export function ImageCarousel({ images, title }: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="glass-card overflow-hidden">
        <img
          src={images[0]}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-[200px] sm:h-[280px] md:h-[340px] object-cover"
        />
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden relative group">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {images.map((src, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0">
              <img
                src={src}
                alt={`${title} - ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-[200px] sm:h-[280px] md:h-[340px] object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </button>
      <button
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
        aria-label="Próximo"
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? "w-6 bg-primary"
                : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
