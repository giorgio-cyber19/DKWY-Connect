"use client";

import { create } from "zustand";

/**
 * Live progress of file uploads, shown by <UploadProgress /> in the app shell.
 * `uploadToDrive` / `updateFileInDrive` report into it, so every place that uploads gets a progress bar
 * without having to wire anything up itself.
 */

export type UploadKind = "upload" | "save";

export interface UploadItem {
  id: number;
  name: string;
  kind: UploadKind;
  /** Bytes handed to the server so far. */
  loaded: number;
  total: number;
  status: "uploading" | "done" | "error";
}

interface UploadTrackerState {
  items: UploadItem[];
}

export const useUploadTracker = create<UploadTrackerState>(() => ({ items: [] }));

let nextId = 1;

function patch(id: number, change: Partial<UploadItem>) {
  useUploadTracker.setState((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...change } : i)) }));
}

function remove(id: number) {
  useUploadTracker.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));
}

export const uploadTracker = {
  start(name: string, total: number, kind: UploadKind): number {
    const id = nextId++;
    useUploadTracker.setState((s) => ({ items: [...s.items, { id, name, kind, loaded: 0, total, status: "uploading" }] }));
    return id;
  },
  progress(id: number, loaded: number) {
    patch(id, { loaded });
  },
  finish(id: number) {
    patch(id, { status: "done" });
    setTimeout(() => remove(id), 2500);
  },
  fail(id: number) {
    patch(id, { status: "error" });
    setTimeout(() => remove(id), 6000);
  },
  dismiss: remove,
};
