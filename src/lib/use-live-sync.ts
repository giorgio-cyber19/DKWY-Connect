"use client";

import { useEffect } from "react";
import { useAppStore } from "./store";

const POLL_INTERVAL_MS = 30_000;

/** Near-live cross-device sync: re-fetches server data on an interval and whenever the tab regains focus. */
export function useLiveSync() {
  useEffect(() => {
    function sync() {
      if (useAppStore.getState().sessionToken) useAppStore.getState().bootstrap();
    }

    const interval = setInterval(sync, POLL_INTERVAL_MS);
    function onVisibility() {
      if (document.visibilityState === "visible") sync();
    }
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
