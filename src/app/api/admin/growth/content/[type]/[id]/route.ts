import { adminApiUnauthorized } from "@/lib/admin-auth";
import { getGrowthContent, updateGrowthContent } from "@/lib/growth-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    type: string;
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const { type, id } = await context.params;
  const result = await getGrowthContent(type, id);

  return Response.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(request: Request, context: RouteContext) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const { type, id } = await context.params;
  const formData = await request.formData();
  const result = await updateGrowthContent(type, id, formData);

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
