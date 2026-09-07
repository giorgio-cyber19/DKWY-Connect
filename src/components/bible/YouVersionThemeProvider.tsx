"use client";

import { YouVersionProvider } from "@youversion/platform-react-ui";
import { useTheme } from "@/lib/theme-context";

export const youVersionAppKey = process.env.NEXT_PUBLIC_YOUVERSION_APP_KEY;
export const isYouVersionConfigured = !!youVersionAppKey;

/**
 * Only mounted inside AppShell's authenticated tree (never on login/setup),
 * so useTheme() is always safe here — see theme-context.tsx's mount gate.
 */
export function YouVersionThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  if (!youVersionAppKey) return <>{children}</>;

  return (
    <YouVersionProvider appKey={youVersionAppKey} theme={theme}>
      {children}
    </YouVersionProvider>
  );
}
