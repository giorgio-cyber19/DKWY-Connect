import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import type { User } from "@/lib/types";

/** Unauthenticated: lets the login/setup pages know whether a first admin already exists. */
export async function GET() {
  const users = await getCollection<User>("users");
  return NextResponse.json({ needsSetup: users.length === 0 });
}
