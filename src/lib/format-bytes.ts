/** Scales bytes into KB/MB for a single file's display — shared between the server (Drive metadata) and the client (immediately after a direct-to-Drive upload, before a page refresh re-fetches Drive's own value). */
export function formatFileBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
