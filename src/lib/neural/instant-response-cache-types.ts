export interface CacheEntry {
  patterns: string[];
  answer: string;
  category: "tech" | "legal" | "general" | "identity";
}
