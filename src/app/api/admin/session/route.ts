import { NextResponse } from "next/server";
import {
  isAdminConfigured,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const redirectUrl = new URL("/admin", request.url);

  if (!isAdminConfigured()) {
    redirectUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(redirectUrl, 303);
  }

  if (!verifyAdminPassword(password)) {
    redirectUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(redirectUrl, 303);
  }

  await setAdminSessionCookie();
  return NextResponse.redirect(redirectUrl, 303);
}
