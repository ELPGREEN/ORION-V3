import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const AFFILIATE_KEY = "affiliate_ref";
const AFFILIATE_EXPIRY_KEY = "affiliate_ref_expiry";
const COOKIE_DAYS = 30;

export function AffiliateTracker() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem(AFFILIATE_KEY, ref);
      const expiry = Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(AFFILIATE_EXPIRY_KEY, expiry.toString());
    }
  }, [searchParams]);

  return null;
}

export function getAffiliateRef(): string | null {
  const ref = localStorage.getItem(AFFILIATE_KEY);
  const expiry = localStorage.getItem(AFFILIATE_EXPIRY_KEY);
  if (!ref || !expiry) return null;
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem(AFFILIATE_KEY);
    localStorage.removeItem(AFFILIATE_EXPIRY_KEY);
    return null;
  }
  return ref;
}
