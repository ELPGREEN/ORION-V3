/**
 * useGeocode — Hook for Google Maps geocoding with Nominatim fallback
 */
import { useState, useCallback } from "react";
import { geocodeAddress, reverseGeocode } from "@/lib/google-maps";

interface GeoResult {
  lat: number;
  lng: number;
  formatted: string;
}

export function useGeocode() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoResult | null>(null);

  const geocode = useCallback(async (address: string) => {
    setLoading(true);
    try {
      const r = await geocodeAddress(address);
      setResult(r);
      return r;
    } finally {
      setLoading(false);
    }
  }, []);

  const reverse = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      return await reverseGeocode(lat, lng);
    } finally {
      setLoading(false);
    }
  }, []);

  return { geocode, reverse, result, loading };
}
