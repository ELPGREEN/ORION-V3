import { describe, it, expect } from "vitest";

describe("Application smoke test", () => {
  it("Supabase config exports valid URL", async () => {
    const { SUPABASE_URL } = await import("@/integrations/supabase/config");
    expect(SUPABASE_URL).toMatch(/^https:\/\/.*\.supabase\.co$/);
  });

  it("Supabase config exports valid anon key", async () => {
    const { SUPABASE_PUBLISHABLE_KEY } = await import("@/integrations/supabase/config");
    expect(SUPABASE_PUBLISHABLE_KEY).toBeTruthy();
    expect(SUPABASE_PUBLISHABLE_KEY.split(".")).toHaveLength(3); // JWT format
  });
});
