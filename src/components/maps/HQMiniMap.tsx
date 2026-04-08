/**
 * HQMiniMap — Shows company HQ location using Google Maps or static fallback
 * Alessandria, Piemonte, Italy (ELP Green Technology HQ)
 */
import { useEffect, useRef, useState } from "react";
import { isGoogleMapsAvailable, loadGoogleMaps } from "@/lib/google-maps";
import { MapPin } from "lucide-react";

interface HQMiniMapProps {
  title?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  className?: string;
}

export function HQMiniMap({ 
  title = "ELP® Green Technology HQ", 
  lat = 44.9131, 
  lng = 8.6147, 
  zoom = 14,
  className = "" 
}: HQMiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isGoogleMapsAvailable() || !mapRef.current) return;

    loadGoogleMaps()
      .then(() => {
        const google = (window as any).google;
        if (!google?.maps || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#0a0f1a" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1a" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#4a9eff" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2332" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
          ],
        });

        new google.maps.Marker({
          position: { lat, lng },
          map,
          title,
        });

        setMapLoaded(true);
      })
      .catch(() => setError(true));
  }, [lat, lng, zoom, title]);

  // Fallback: static map using OpenStreetMap embed
  if (!isGoogleMapsAvailable() || error) {
    return (
      <div className={`w-full h-48 rounded-lg overflow-hidden border border-border relative ${className}`}>
        <iframe
          title={title}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.01}%2C${lng + 0.02}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
        />
        <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-primary" />
          <span className="text-xs text-foreground">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-48 rounded-lg overflow-hidden border border-border relative ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Carregando mapa...</p>
        </div>
      )}
    </div>
  );
}
