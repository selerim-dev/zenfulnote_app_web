import { adminApiUnauthorized } from "@/lib/admin-auth";
import { looprailErrorResponse, readLooprailStoredArticles } from "@/lib/looprail-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  try {
    const articles = await readLooprailStoredArticles();
    return Response.json({ articles });
  } catch (error) {
    return looprailErrorResponse(error);
  }
}
