import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  await clearAdminSessionCookie();
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
