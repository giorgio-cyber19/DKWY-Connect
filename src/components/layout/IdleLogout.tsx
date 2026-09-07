"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

// 30 minutes idle — enough to read a lesson plan without touching the mouse,
// short enough that a church office computer left signed in doesn't stay that
// way all afternoon. Adjust here if the workspace wants it shorter/longer.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

/** Mounted only inside the authenticated app shell — signs the user out (and back to
 * /login) after IDLE_TIMEOUT_MS with no mouse/keyboard/touch/scroll activity. */
export function IdleLogout() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        useAppStore.getState().logout();
        router.push("/login?reason=idle");
      }, IDLE_TIMEOUT_MS);
    }

    resetTimer();
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, resetTimer, { passive: true });
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, resetTimer);
    };
  }, [router]);

  return null;
}
