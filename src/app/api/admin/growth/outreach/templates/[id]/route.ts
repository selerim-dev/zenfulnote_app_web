import { adminApiUnauthorized } from "@/lib/admin-auth";
import { saveGrowthOutreachTemplate } from "@/lib/growth-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const { id } = await context.params;
  const templateId = Number(id);
  if (!Number.isInteger(templateId) || templateId < 1) {
    return Response.json({ ok: false, error: "Template id is invalid." }, { status: 422 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return Response.json({ ok: false, error: "Template payload is required." }, { status: 422 });
  }

  const result = await saveGrowthOutreachTemplate(payload, templateId);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
