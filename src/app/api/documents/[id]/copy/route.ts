import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { copyName } from "@/lib/library-folders";
import { copyItem, failureResponse, fileNamesIn, getItem, loadFolders, resolveTarget } from "@/lib/library-ops";

export const maxDuration = 60;

/** { folderId } -> an independent copy of the document (its own file in Google Drive) inside that folder (null = top level). */
export async function POST(request: Request, ctx: RouteContext<"/api/documents/[id]/copy">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const item = await getItem("documents", id);
  if (!item) return NextResponse.json({ error: "not_found", message: "That document no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const target = await resolveTarget(await loadFolders("documents"), body?.folderId);
  if ("response" in target) return target.response;

  try {
    const name = copyName(item.name, await fileNamesIn("documents", target.folder?.id ?? null));
    return NextResponse.json(await copyItem("documents", item, target.folder, claims.userId, name));
  } catch (err) {
    return failureResponse(err);
  }
}
