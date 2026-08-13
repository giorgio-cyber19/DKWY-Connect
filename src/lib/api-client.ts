"use client";

import { useAppStore } from "./store";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Central fetch wrapper for every store mutator and bootstrap(). Attaches the
 * bearer token and, on 401, clears the session and redirects to /login —
 * required now that token refresh isn't silent/automatic (see session.ts).
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAppStore.getState().sessionToken;
  const headers: HeadersInit = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init?.headers,
  };

  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      useAppStore.setState({ sessionToken: null, currentUserId: null });
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    throw new ApiError(res.status, data.error ?? "error", data.message ?? "Something went wrong.");
  }

  return data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
