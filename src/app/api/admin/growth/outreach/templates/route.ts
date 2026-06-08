import { adminApiUnauthorized } from "@/lib/admin-auth";
import { saveGrowthOutreachTemplate } from "@/lib/growth-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return Response.json({ ok: false, error: "Template payload is required." }, { status: 422 });
  }

  const result = await saveGrowthOutreachTemplate(payload);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
