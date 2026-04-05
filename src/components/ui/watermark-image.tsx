import { cn } from "@/lib/utils";

interface WatermarkImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  watermark?: string;
}

export function WatermarkImage({ className, watermark, ...props }: WatermarkImageProps) {
  return (
    <div className="relative">
      <img className={cn("w-full", className)} {...props} />
      {watermark && (
        <span className="absolute bottom-2 right-2 text-xs text-white/40">{watermark}</span>
      )}
    </div>
  );
}
