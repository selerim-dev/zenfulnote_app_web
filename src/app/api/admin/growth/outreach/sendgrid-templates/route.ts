import { adminApiUnauthorized } from "@/lib/admin-auth";
import { getSendGridTemplates } from "@/lib/growth-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const result = await getSendGridTemplates();
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
