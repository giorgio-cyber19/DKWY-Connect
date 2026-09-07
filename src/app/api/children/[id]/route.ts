import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, deleteEntity, newId, appendFeed } from "@/lib/db";
import type { Child, AuditLogEntry } from "@/lib/types";

export async function DELETE(request: Request, ctx: RouteContext<"/api/children/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can delete a child's portfolio." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const child = await getEntity<Child>("children", id);
  if (!child) return NextResponse.json({ error: "not_found", message: "That child no longer exists." }, { status: 404 });

  await deleteEntity("children", id);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Deleted child portfolio", target: child.name, date: new Date().toISOString() },
    200
  );

  return NextResponse.json({ ok: true });
}
