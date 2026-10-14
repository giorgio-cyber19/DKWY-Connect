import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getCollection, putEntity, newId } from "@/lib/db";
import { isDriveConnected, createCategorySubfolder } from "@/lib/google-drive";
import type { LibraryFolder } from "@/lib/types";

const LIBRARIES = ["documents", "media"] as const;

export async function GET(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const library = searchParams.get("library");
  const folders = await getCollection<LibraryFolder>("libraryFolders");
  return NextResponse.json({ folders: library ? folders.filter((f) => f.library === library) : folders });
}

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const library = body?.library;

  if (!name || !LIBRARIES.includes(library)) {
    return NextResponse.json({ error: "bad_request", message: "A folder name is required." }, { status: 400 });
  }

  const existing = await getCollection<LibraryFolder>("libraryFolders");
  if (existing.some((f) => f.library === library && f.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "folder_exists", message: "A folder with that name already exists." }, { status: 409 });
  }

  let driveFolderId: string | undefined;
  if (await isDriveConnected()) {
    try {
      driveFolderId = await createCategorySubfolder(library, name);
    } catch (err) {
      // Folder is still useful without a Drive counterpart — uploads into it just
      // fall back to the library's root until this resolves. Don't block creation.
      console.error("Failed to create matching Drive subfolder:", err);
    }
  }

  const folder: LibraryFolder = {
    id: newId("fld"),
    name,
    library,
    driveFolderId,
    createdBy: claims.userId,
    createdAt: new Date().toISOString(),
  };
  await putEntity("libraryFolders", folder);
  return NextResponse.json(folder);
}
