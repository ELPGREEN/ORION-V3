import { useState, useCallback, useRef } from "react";

interface CachedResult {
  query: string;
  results: any;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Simple in-memory cache for legal search results.
 * Avoids re-searching the same references within a session.
 */
export function useLegalSearchCache() {
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());

  const getCached = useCallback((query: string) => {
    const key = query.toLowerCase().trim();
    const cached = cacheRef.current.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      cacheRef.current.delete(key);
      return null;
    }
    return cached.results;
  }, []);

  const setCache = useCallback((query: string, results: any) => {
    const key = query.toLowerCase().trim();
    cacheRef.current.set(key, { query: key, results, timestamp: Date.now() });
    // Limit cache size
    if (cacheRef.current.size > 50) {
      const oldest = [...cacheRef.current.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) cacheRef.current.delete(oldest[0]);
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { getCached, setCache, clearCache, cacheSize: cacheRef.current.size };
}
