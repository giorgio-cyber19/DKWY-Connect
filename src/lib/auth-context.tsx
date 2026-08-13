"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "./store";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const hydrated = useAppStore((s) => s.hydrated);
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    if (!useAppStore.persist.hasHydrated()) {
      useAppStore.persist.rehydrate();
    } else {
      useAppStore.setState({ hydrated: true });
    }
  }, []);

  // Once the persisted session is known, either resync real data from the
  // server (we have a token) or check whether this is a brand-new workspace
  // (we don't) — this only needs to run once per load.
  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;

    (async () => {
      if (useAppStore.getState().sessionToken) {
        await useAppStore.getState().bootstrap();
      } else {
        try {
          const res = await fetch("/api/auth/status");
          const data = await res.json();
          setNeedsSetup(!!data.needsSetup);
        } catch {
          // Network hiccup — fall through to the login screen rather than
          // forcing setup; a genuine "no users yet" case will resurface on retry.
        }
      }
      setLoading(false);
    })();
  }, [hydrated]);

  const user = users.find((u) => u.id === currentUserId) ?? null;

  const login = useCallback(
    async (identifier: string, password: string) => {
      const loggedInUser = await useAppStore.getState().login(identifier, password);
      if (loggedInUser) {
        router.push(loggedInUser.mustChangePassword ? "/change-password" : "/dashboard");
        return true;
      }
      return false;
    },
    [router]
  );

  const logout = useCallback(() => {
    useAppStore.getState().logout();
    router.push("/login");
  }, [router]);

  return <AuthContext.Provider value={{ user, loading, needsSetup, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
