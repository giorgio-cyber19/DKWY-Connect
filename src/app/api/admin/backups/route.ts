import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { DriveNotConnectedError } from "@/lib/google-drive";
import { listBackups, getBackupStatus, runBackup, DAILY_RETENTION_DAYS, MONTHLY_RETENTION_MONTHS } from "@/lib/backup";

export const maxDuration = 60;

function adminClaims(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return { error: NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 }) };
  if (claims.role !== "admin") {
    return { error: NextResponse.json({ error: "forbidden", message: "Only administrators can manage backups." }, { status: 403 }) };
  }
  return { claims };
}

export async function GET(request: Request) {
  const auth = adminClaims(request);
  if (auth.error) return auth.error;

  const status = await getBackupStatus();
  let backups: Awaited<ReturnType<typeof listBackups>> = [];
  let driveError: string | null = null;
  try {
    backups = await listBackups();
  } catch (err) {
    driveError = err instanceof DriveNotConnectedError ? err.message : "Couldn't read the Backups folder in Google Drive.";
    if (!(err instanceof DriveNotConnectedError)) console.error("Listing backups failed:", err);
  }

  return NextResponse.json({
    status,
    backups,
    driveError,
    cronConfigured: !!process.env.CRON_SECRET,
    retention: { dailyDays: DAILY_RETENTION_DAYS, monthlyMonths: MONTHLY_RETENTION_MONTHS },
  });
}

/** "Back up now". */
export async function POST(request: Request) {
  const auth = adminClaims(request);
  if (auth.error) return auth.error;

  try {
    const result = await runBackup("daily");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    return NextResponse.json({ error: "backup_failed", message: "The backup failed. Check that Google Drive is connected and try again." }, { status: 502 });
  }
}
