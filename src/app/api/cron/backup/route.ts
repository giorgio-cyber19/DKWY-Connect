import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";

export const maxDuration = 60;

/**
 * Invoked by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`
 * automatically when the CRON_SECRET environment variable is set; without it this route stays closed.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured", message: "CRON_SECRET is not set." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized", message: "Not allowed." }, { status: 401 });
  }

  try {
    const result = await runBackup("daily");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: "backup_failed", message: err instanceof Error ? err.message : "Backup failed." }, { status: 500 });
  }
}
