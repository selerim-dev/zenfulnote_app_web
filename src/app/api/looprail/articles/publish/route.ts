import { revalidatePath } from "next/cache";
import { siteConfig } from "@/config/site";
import {
  getLooprailPublicBaseUrl,
  looprailErrorResponse,
  persistLooprailArticle,
  readLooprailJson,
  requireLooprailAuth,
} from "@/lib/looprail-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = requireLooprailAuth(request);

  if (authError) {
    return authError;
  }

  try {
    const payload = await readLooprailJson(request);
    const result = await persistLooprailArticle(payload, "published", {
      baseUrl: getLooprailPublicBaseUrl(process.env, siteConfig.url),
    });

    revalidatePath("/blog");
    revalidatePath(`/blog/${result.slug}`);

    return Response.json(result);
  } catch (error) {
    return looprailErrorResponse(error);
  }
}
