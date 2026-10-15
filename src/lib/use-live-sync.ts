"use client";

import { useEffect } from "react";
import { useAppStore } from "./store";

const POLL_INTERVAL_MS = 30_000;
/** Refocusing the window or switching browser tabs only re-syncs if the data is at least this stale. */
const MIN_REFRESH_GAP_MS = 15_000;

/** Near-live cross-device sync: re-fetches server data on an interval and whenever the tab regains focus. */
export function useLiveSync() {
  useEffect(() => {
    let lastSyncAt = Date.now();

    function sync(force = false) {
      if (!useAppStore.getState().sessionToken) return;
      if (document.visibilityState === "hidden") return; // nobody is looking — don't spend a request
      if (!force && Date.now() - lastSyncAt < MIN_REFRESH_GAP_MS) return;
      lastSyncAt = Date.now();
      void useAppStore.getState().bootstrap();
    }

    const interval = setInterval(() => sync(true), POLL_INTERVAL_MS);
    function onVisibility() {
      if (document.visibilityState === "visible") sync();
    }
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
