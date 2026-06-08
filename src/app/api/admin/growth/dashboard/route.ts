import { adminApiUnauthorized } from "@/lib/admin-auth";
import { getGrowthDashboard } from "@/lib/growth-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const requestUrl = new URL(request.url);
  const days = Number(requestUrl.searchParams.get("days") ?? 30);
  const result = await getGrowthDashboard(Number.isFinite(days) ? days : 30);

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
