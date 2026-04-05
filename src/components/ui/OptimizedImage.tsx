import { ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

/**
 * Renders a <picture> element with WebP source fallback.
 * If a .webp version exists at the same path, it will be served first.
 * Falls back to the original format (jpg/png).
 */
export function OptimizedImage({ src, alt, width, height, className, ...props }: OptimizedImageProps) {
  // Only generate WebP path for non-bundled assets (public folder paths).
  // Vite-bundled imports contain hashed filenames that won't have .webp variants.
  const isBundledAsset = src.includes("/assets/") && src.includes("-");
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, ".webp");
  const hasWebpVariant = !isBundledAsset && webpSrc !== src;

  return (
    <picture>
      {hasWebpVariant && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </picture>
  );
}
