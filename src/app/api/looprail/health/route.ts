import { requireLooprailAuth } from "@/lib/looprail-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireLooprailAuth(request);

  if (authError) {
    return authError;
  }

  return Response.json({
    ok: true,
    service: "looprail-custom-cms",
  });
}
