import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

type WidgetState = "closed" | "minimized" | "expanded";

interface OrionWidgetContextValue {
  state: WidgetState;
  isOpen: boolean;
  isMinimized: boolean;
  isExpanded: boolean;
  openOrion: () => void;
  minimizeOrion: () => void;
  expandOrion: () => void;
  closeOrion: () => void;
  toggleOrion: () => void;
}

const OrionWidgetContext = createContext<OrionWidgetContextValue | null>(null);

export function OrionWidgetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WidgetState>("closed");
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const openOrion = useCallback(() => setState("expanded"), []);
  const minimizeOrion = useCallback(() => setState("minimized"), []);
  const expandOrion = useCallback(() => setState("expanded"), []);
  const closeOrion = useCallback(() => setState("closed"), []);
  const toggleOrion = useCallback(() => {
    setState(prev => prev === "expanded" ? "minimized" : prev === "minimized" ? "expanded" : "expanded");
  }, []);

  // Auto-minimize on route change
  useEffect(() => {
    if (prevPathRef.current !== location.pathname && state === "expanded") {
      setState("minimized");
      toast("Orion minimizado — clique para expandir", { duration: 2000 });

      // Try PiP for any video on the page
      setTimeout(() => {
        const video = document.querySelector("video") as HTMLVideoElement | null;
        if (video && !document.pictureInPictureElement && video.readyState >= 2) {
          video.requestPictureInPicture?.().catch(() => {});
        }
      }, 500);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, state]);

  return (
    <OrionWidgetContext.Provider value={{
      state,
      isOpen: state !== "closed",
      isMinimized: state === "minimized",
      isExpanded: state === "expanded",
      openOrion,
      minimizeOrion,
      expandOrion,
      closeOrion,
      toggleOrion,
    }}>
      {children}
    </OrionWidgetContext.Provider>
  );
}

export function useOrionWidget() {
  const ctx = useContext(OrionWidgetContext);
  if (!ctx) throw new Error("useOrionWidget must be used within OrionWidgetProvider");
  return ctx;
}
