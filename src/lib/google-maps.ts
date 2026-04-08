/**
 * Google Maps / Geocoding Utilities
 * Uses free Google Maps JavaScript API and Geocoding API.
 * For Mapbox fallback, uses VITE_MAPBOX_TOKEN.
 */

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let mapsLoaded = false;
let mapsPromise: Promise<void> | null = null;

/**
 * Load Google Maps JavaScript API dynamically
 */
export function loadGoogleMaps(): Promise<void> {
  if (mapsLoaded) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  if (!GOOGLE_MAPS_KEY) {
    console.warn("[Maps] No Google Maps key (VITE_GOOGLE_MAPS_KEY). Using Mapbox fallback.");
    return Promise.resolve();
  }

  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      mapsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return mapsPromise;
}

/**
 * Geocode an address to lat/lng using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  if (!GOOGLE_MAPS_KEY) {
    // Fallback to free Nominatim (OpenStreetMap)
    return geocodeNominatim(address);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status === "OK" && data.results?.[0]) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted: result.formatted_address,
      };
    }
    return null;
  } catch {
    return geocodeNominatim(address);
  }
}

/**
 * Reverse geocode lat/lng to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_MAPS_KEY) {
    return reverseGeocodeNominatim(lat, lng);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return data.results?.[0]?.formatted_address || null;
  } catch {
    return reverseGeocodeNominatim(lat, lng);
  }
}

// ─── Free fallbacks using OpenStreetMap Nominatim ───

async function geocodeNominatim(address: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const resp = await fetch(url, { headers: { "User-Agent": "OrionApp/1.0" } });
    const data = await resp.json();
    if (data?.[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        formatted: data[0].display_name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function reverseGeocodeNominatim(lat: number, lng: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const resp = await fetch(url, { headers: { "User-Agent": "OrionApp/1.0" } });
    const data = await resp.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

/**
 * Check if Google Maps is available
 */
export function isGoogleMapsAvailable(): boolean {
  return !!GOOGLE_MAPS_KEY;
}
