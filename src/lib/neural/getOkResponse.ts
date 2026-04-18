/**
 * getOkResponse — short acknowledgement that includes the user's name only
 * when the voice was recognized (creator/owner). Otherwise returns just "Ok".
 * Never repeats: a single utterance, no impact phrase.
 */
export function getOkResponse(identityStatus?: string): string {
  const recognized = identityStatus === "creator" || identityStatus === "owner";
  if (!recognized) return "Ok.";
  try {
    const name = (typeof window !== "undefined" && (window as any).__orionUserName) || "Ericson";
    const first = String(name).trim().split(/\s+/)[0];
    return `Ok, ${first}.`;
  } catch {
    return "Ok.";
  }
}
