import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Sanitize a filename for Supabase Storage (strip accents, special chars) */
export function sanitizeStorageFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-zA-Z0-9._-]/g, "_") // only safe chars
    .replace(/_{2,}/g, "_") // collapse multiple underscores
    .replace(/^_|_$/g, ""); // trim leading/trailing underscores
}
