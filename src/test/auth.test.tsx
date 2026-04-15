import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ReactNode } from "react";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock Analytics
vi.mock("@/lib/firebase-analytics-events", () => ({
  OrionAnalytics: {
    login: vi.fn(),
    signUp: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it("should call signIn and handle success", async () => {
    const mockSignIn = vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: "123" }, session: {} } as any,
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let signResult;
    await act(async () => {
      signResult = await result.current.signIn("test@example.com", "password123");
    });

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(signResult?.error).toBeNull();
  });

  it("should return error on failed signIn", async () => {
    const mockError = new Error("Invalid credentials");
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError as any,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let signResult;
    await act(async () => {
      signResult = await result.current.signIn("wrong@example.com", "wrong");
    });

    expect(signResult?.error).toBe(mockError);
  });

  it("should call signOut and clear session", async () => {
    const mockSignOut = vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });
});
