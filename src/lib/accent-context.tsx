"use client";

import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { deriveAccentPalette } from "./accent-color";

const VARS = ["--color-blue", "--color-blue-light", "--color-blue-deep"] as const;
/** This device's last-seen accent color — purely a cosmetic fallback so the sign-in screen
 * (shown before we know who's signing in) isn't stuck on the default green for a returning
 * teacher. The account's own value, once loaded, always wins. */
const LAST_ACCENT_KEY = "dwky-last-accent-color";

function applyAccent(accentColor: string | null | undefined) {
  const root = document.documentElement.style;
  if (!accentColor) {
    for (const name of VARS) root.removeProperty(name);
    return;
  }
  const { base, light, deep } = deriveAccentPalette(accentColor);
  root.setProperty(VARS[0], base);
  root.setProperty(VARS[1], light);
  root.setProperty(VARS[2], deep);
}

/**
 * Applies the signed-in teacher's personal accent color as inline overrides on `:root`, which
 * win over both the light-mode default and the dark-mode stylesheet rules. This is per-account,
 * not per-device — it always reflects whichever account is actually signed in, and only ever
 * affects the viewer's own session.
 *
 * While signed out (the login screen, or before the session check resolves), there's no account
 * to read a color from yet, so this falls back to whatever color was last applied on this
 * device — a cosmetic touch only, cleared the moment a signed-in account says otherwise.
 */
export function AccentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const accentColor = user?.accentColor;

  useEffect(() => {
    if (user) {
      if (accentColor) window.localStorage.setItem(LAST_ACCENT_KEY, accentColor);
      else window.localStorage.removeItem(LAST_ACCENT_KEY);
      applyAccent(accentColor);
    } else {
      applyAccent(window.localStorage.getItem(LAST_ACCENT_KEY));
    }
  }, [user, accentColor]);

  return <>{children}</>;
}
