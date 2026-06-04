import { revalidatePath } from "next/cache";
import { adminApiUnauthorized } from "@/lib/admin-auth";
import {
  deleteLooprailStoredArticle,
  looprailErrorResponse,
  updateLooprailStoredArticle,
  type LooprailStoredArticleUpdate,
} from "@/lib/looprail-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ArticleRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function PATCH(request: Request, context: ArticleRouteContext) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  try {
    const { slug } = await context.params;
    const payload = (await request.json()) as LooprailStoredArticleUpdate;
    const article = await updateLooprailStoredArticle(decodeURIComponent(slug), payload);

    revalidatePath("/blog");
    revalidatePath(`/blog/${article.slug}`);

    return Response.json({ article });
  } catch (error) {
    return looprailErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: ArticleRouteContext) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  try {
    const { slug } = await context.params;
    const decodedSlug = decodeURIComponent(slug);
    await deleteLooprailStoredArticle(decodedSlug);

    revalidatePath("/blog");
    revalidatePath(`/blog/${decodedSlug}`);

    return Response.json({ ok: true });
  } catch (error) {
    return looprailErrorResponse(error);
  }
}
