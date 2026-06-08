import { NextResponse } from "next/server";
import { adminApiUnauthorized } from "@/lib/admin-auth";
import { runGrowthLifecycleDryRun } from "@/lib/growth-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const result = await runGrowthLifecycleDryRun();
  const requestUrl = new URL(request.url);
  const wantsJson =
    requestUrl.searchParams.get("format") === "json" ||
    request.headers.get("accept")?.includes("application/json");

  if (wantsJson) {
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 502 });
    }

    return Response.json({ ok: true, data: result.data });
  }

  const redirectUrl = new URL("/admin", request.url);
  redirectUrl.searchParams.set("growth_audit", result.ok ? "complete" : "failed");

  if (!result.ok) {
    redirectUrl.searchParams.set("growth_error", result.error.slice(0, 140));
  }

  return NextResponse.redirect(redirectUrl, 303);
}
