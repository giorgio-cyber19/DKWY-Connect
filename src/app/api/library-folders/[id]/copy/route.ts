import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity } from "@/lib/db";
import { copyFolder, loadFolders, resolveTarget } from "@/lib/library-ops";
import type { LibraryFolder } from "@/lib/types";

export const maxDuration = 60;

/** { parentId } -> a copy of the folder, its subfolders and all their files, placed inside that folder (null = top level). */
export async function POST(request: Request, ctx: RouteContext<"/api/library-folders/[id]/copy">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const folder = await getEntity<LibraryFolder>("libraryFolders", id);
  if (!folder) return NextResponse.json({ error: "not_found", message: "That folder no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const folders = await loadFolders(folder.library);
  const target = await resolveTarget(folders, body?.parentId);
  if ("response" in target) return target.response;

  const result = await copyFolder(folder.library, folder, folders, target.folder, claims.userId);
  if (result instanceof NextResponse) return result;
  return NextResponse.json({ library: folder.library, ...result });
}
