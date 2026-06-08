import { revalidatePath } from "next/cache";
import { adminApiUnauthorized } from "@/lib/admin-auth";
import {
  looprailErrorResponse,
  persistLooprailArticle,
  readLooprailStoredArticleBySlug,
  readLooprailStoredArticles,
} from "@/lib/looprail-cms";

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

export async function POST(request: Request) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  try {
    const payload = await request.json();
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const content = typeof payload.content === "string" ? payload.content.trim() : "";
    const slug = slugFromTitle(typeof payload.slug === "string" ? payload.slug : title);

    const result = await persistLooprailArticle(
      {
        title,
        slug,
        excerpt: payload.description,
        meta_description: payload.metaDescription,
        body_markdown: markdownFromEditorText(content),
        featured_image: payload.featuredImage,
        featured_image_alt: payload.featuredImageAlt,
        primary_keyword: payload.category || "ZenfulNote",
        author_name: payload.author || "ZenfulNote",
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        status: payload.published ? "published" : "draft",
        source: "manual_admin",
        external_article_id: slug,
      },
      payload.published ? "published" : "draft",
    );
    const article = await readLooprailStoredArticleBySlug(result.slug);

    if (!article) {
      return Response.json({ error: "Article was created, but could not be reloaded." }, { status: 500 });
    }

    revalidatePath("/blog");
    revalidatePath(`/blog/${article.slug}`);

    return Response.json({ article });
  } catch (error) {
    return looprailErrorResponse(error);
  }
}

function slugFromTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function markdownFromEditorText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n");
}
