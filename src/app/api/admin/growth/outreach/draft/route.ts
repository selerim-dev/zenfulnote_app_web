import { adminApiUnauthorized } from "@/lib/admin-auth";
import { draftGrowthOutreachTemplate } from "@/lib/growth-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DraftPayload = {
  audience?: string;
  channel?: string;
  goal?: string;
  tone?: string;
};

export async function POST(request: Request) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const payload = (await request.json().catch(() => ({}))) as DraftPayload;
  const result = await draftGrowthOutreachTemplate(payload);

  return Response.json(result);
}
