import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { DriveNotConnectedError } from "@/lib/google-drive";
import {
  loadBackup,
  runBackup,
  planRestore,
  applyRestore,
  snapshotCategories,
  snapshotRecords,
  snapshotHasUser,
  categoryOf,
  type RestoreScope,
} from "@/lib/backup";
import { newId, appendFeed } from "@/lib/db";
import type { AuditLogEntry } from "@/lib/types";

export const maxDuration = 60;

const NEVER_RESTORED = ["backup", "ratelimit", "ai-rate", "password-reset"];

function adminClaims(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return { error: NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 }) };
  if (claims.role !== "admin") {
    return { error: NextResponse.json({ error: "forbidden", message: "Only administrators can manage backups." }, { status: 403 }) };
  }
  return { claims };
}

function failure(err: unknown) {
  if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
  const message = err instanceof Error ? err.message : "That backup could not be read.";
  return NextResponse.json({ error: "backup_unreadable", message }, { status: 422 });
}

/**
 * ?download=1          -> the decrypted snapshot as a JSON file
 * ?category=children   -> the records of one category (for the record picker)
 * (no query)           -> a summary: when it was made and its categories
 */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/backups/[fileId]">) {
  const auth = adminClaims(request);
  if (auth.error) return auth.error;
  const { fileId } = await ctx.params;
  const url = new URL(request.url);

  try {
    const snapshot = await loadBackup(fileId);

    if (url.searchParams.get("download") === "1") {
      return new NextResponse(JSON.stringify(snapshot, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="dwky-backup-${snapshot.createdAt.slice(0, 10)}.json"`,
        },
      });
    }

    const category = url.searchParams.get("category");
    if (category) return NextResponse.json({ records: snapshotRecords(snapshot, category) });

    return NextResponse.json({
      createdAt: snapshot.createdAt,
      keyCount: snapshot.entries.length,
      skipped: snapshot.skipped.length,
      categories: snapshotCategories(snapshot),
      includesYou: snapshotHasUser(snapshot, auth.claims!.userId),
    });
  } catch (err) {
    return failure(err);
  }
}

/** Body: { scope: {type:"all"} | {type:"category",category} | {type:"record",key}, dryRun?: boolean, confirm?: "RESTORE" } */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/backups/[fileId]">) {
  const auth = adminClaims(request);
  if (auth.error) return auth.error;
  const claims = auth.claims!;
  const { fileId } = await ctx.params;

  const body = await request.json().catch(() => null);
  const rawScope = body?.scope;
  let scope: RestoreScope | null = null;
  if (rawScope?.type === "all") scope = { type: "all" };
  else if (rawScope?.type === "category" && typeof rawScope.category === "string" && rawScope.category) {
    scope = { type: "category", category: rawScope.category };
  } else if (rawScope?.type === "record" && typeof rawScope.key === "string" && rawScope.key.startsWith("dwky-connect:")) {
    scope = { type: "record", key: rawScope.key };
  }
  if (!scope) return NextResponse.json({ error: "bad_request", message: "Choose what to restore." }, { status: 400 });

  const scopeCategory = scope.type === "category" ? scope.category : scope.type === "record" ? categoryOf(scope.key) : null;
  if (scopeCategory && NEVER_RESTORED.includes(scopeCategory)) {
    return NextResponse.json({ error: "bad_request", message: "That part of the data cannot be restored." }, { status: 400 });
  }

  try {
    const snapshot = await loadBackup(fileId);

    if (body?.dryRun === true) {
      return NextResponse.json({ plan: await planRestore(snapshot, scope), includesYou: snapshotHasUser(snapshot, claims.userId) });
    }

    if (scope.type === "all" && body?.confirm !== "RESTORE") {
      return NextResponse.json({ error: "bad_request", message: "Type RESTORE to confirm restoring everything." }, { status: 400 });
    }

    // Safety net first: if this restore turns out to be a mistake, the state just before it is recoverable.
    const safety = await runBackup("prerestore");
    const plan = await applyRestore(snapshot, scope);

    await appendFeed<AuditLogEntry>(
      "auditLog",
      {
        id: newId("al"),
        actor: claims.name,
        action: "Restored from backup",
        target: scope.type === "all" ? "everything" : scope.type === "category" ? scope.category : "one record",
        date: new Date().toISOString(),
      },
      200
    );
    return NextResponse.json({ ok: true, plan, safetyBackup: safety.fileName });
  } catch (err) {
    return failure(err);
  }
}
