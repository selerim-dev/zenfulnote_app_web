import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import {
  BLOB_READ_WRITE_TOKEN_ENV,
  BLOB_STORE_ID_ENV,
  LOOPRAIL_API_KEY_ENV,
  LOOPRAIL_GITHUB_REPO_ENV,
  LOOPRAIL_GITHUB_TOKEN_ENV,
  LOOPRAIL_STORAGE_MODE_ENV,
  LooprailValidationError,
  LooprailStorageError,
  deleteLooprailStoredArticle,
  persistLooprailArticle,
  readLooprailStoredArticleBySlug,
  readLooprailStoredArticles,
  updateLooprailStoredArticle,
  validateLooprailApiKey,
  validateLooprailArticle,
} from "../src/lib/looprail-cms.ts";

const sampleArticle = {
  title: "Article title",
  slug: "Article title",
  excerpt: "Short excerpt",
  meta_description: "SEO meta description",
  body_markdown: "## Start\n\nMarkdown article body.",
  html: "",
  featured_image: "https://cdn.example.com/zenfulnote-cover.png",
  featured_image_alt: "ZenfulNote article cover",
  images: [
    {
      url: "https://cdn.example.com/zenfulnote-cover.png",
      role: "featured",
    },
  ],
  assets: [
    {
      url: "https://cdn.example.com/zenfulnote-cover.png",
      role: "featured",
    },
  ],
  primary_keyword: "keyword",
  secondary_keywords: ["related keyword"],
  search_intent: "informational",
  content_angle: "workflow playbook",
  author_name: "Looprail",
  tags: ["keyword"],
  status: "draft",
  source: "looprail",
  quality_evaluation: {
    passed: true,
    score: 100,
  },
};

async function createTempContentDir() {
  return mkdtemp(path.join(os.tmpdir(), "looprail-cms-"));
}

test("validates the configured Looprail API key header", () => {
  const headers = new Headers({
    "x-looprail-api-key": "site-generated-secret",
  });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    [LOOPRAIL_API_KEY_ENV]: "site-generated-secret",
  };

  assert.deepEqual(validateLooprailApiKey(headers, env), { ok: true });
});

test("rejects requests when the Looprail API key is missing", () => {
  const result = validateLooprailApiKey(new Headers());

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});

test("validates and normalizes Looprail article payloads", () => {
  const article = validateLooprailArticle(sampleArticle, "draft");

  assert.equal(article.slug, "article-title");
  assert.equal(article.status, "draft");
  assert.equal(article.contentFormat, "markdown");
  assert.equal(article.metaDescription, "SEO meta description");
  assert.equal(article.featuredImage, "https://cdn.example.com/zenfulnote-cover.png");
  assert.equal(article.featuredImageAlt, "ZenfulNote article cover");
  assert.equal(article.images?.length, 1);
  assert.equal(article.assets?.length, 1);
  assert.deepEqual(article.secondaryKeywords, ["related keyword"]);
});

test("accepts Looprail drafted status as a draft alias", () => {
  const article = validateLooprailArticle(
    {
      ...sampleArticle,
      status: "drafted",
    },
    "draft",
  );

  assert.equal(article.status, "draft");
});

test("drops non-renderable featured image URLs from Looprail payloads", () => {
  const article = validateLooprailArticle(
    {
      ...sampleArticle,
      featured_image:
        "https://drive.google.com/drive/folders/1NA65ljYZC7CRvXvXIMPdf1I_SK9FmA5D",
      featured_image_alt: "Drive folder that cannot render as an image",
    },
    "draft",
  );

  assert.equal(article.featuredImage, undefined);
  assert.equal(article.featuredImageAlt, undefined);
});

test("rejects invalid status, arrays, and unsafe content", () => {
  assert.throws(
    () =>
      validateLooprailArticle(
        {
          ...sampleArticle,
          body_markdown: '<script src="https://example.com/x.js"></script>',
          secondary_keywords: ["related keyword", 123],
          status: "published",
        },
        "draft",
      ),
    (error) => {
      if (!(error instanceof LooprailValidationError)) return false;
      assert.match(error.issues.join("\n"), /status must be "draft"/);
      assert.match(error.issues.join("\n"), /secondary_keywords\[1]/);
      assert.match(error.issues.join("\n"), /unsafe HTML tags/);
      return true;
    },
  );
});

test("writes an unpublished draft MDX file", async (t) => {
  const contentDirectory = await createTempContentDir();
  t.after(() => rm(contentDirectory, { recursive: true, force: true }));

  const result = await persistLooprailArticle(sampleArticle, "draft", {
    baseUrl: "https://example.com",
    contentDirectory,
    now: new Date("2026-06-03T12:00:00Z"),
  });

  assert.deepEqual(result, {
    id: "article-title",
    slug: "article-title",
    status: "draft",
    storage: "filesystem",
    rendering_status: "stored",
    visibility: "draft",
  });

  const raw = await readFile(path.join(contentDirectory, "article-title.mdx"), "utf8");
  const parsed = matter(raw);

  assert.equal(parsed.data.title, "Article title");
  assert.equal(parsed.data.description, "Short excerpt");
  assert.equal(parsed.data.metaDescription, "SEO meta description");
  assert.equal(parsed.data.date, "2026-06-03");
  assert.equal(parsed.data.published, false);
  assert.equal(parsed.data.author, "Looprail");
  assert.deepEqual(parsed.data.tags, ["keyword"]);
  assert.equal(parsed.data.looprail.source, "looprail");
  assert.match(parsed.content, /Markdown article body/);
});

test("writes runtime articles without touching MDX content", async (t) => {
  const runtimeDirectory = await createTempContentDir();
  t.after(() => rm(runtimeDirectory, { recursive: true, force: true }));

  const draft = await persistLooprailArticle(sampleArticle, "draft", {
    baseUrl: "https://example.com",
    runtimeDirectory,
    now: new Date("2026-06-02T12:00:00Z"),
  });

  assert.deepEqual(draft, {
    id: "article-title",
    slug: "article-title",
    status: "draft",
    storage: "filesystem",
    rendering_status: "stored",
    visibility: "draft",
  });

  const published = await persistLooprailArticle(
    {
      ...sampleArticle,
      title: "Updated article title",
      status: "published",
      external_article_id: draft.id,
    },
    "published",
    {
      baseUrl: "https://example.com",
      runtimeDirectory,
      now: new Date("2026-06-03T12:00:00Z"),
    },
  );

  assert.deepEqual(published, {
    id: "article-title",
    slug: "article-title",
    status: "published",
    storage: "filesystem",
    rendering_status: "public",
    visibility: "public",
    url: "https://example.com/blog/article-title",
    public_url: "https://example.com/blog/article-title",
  });

  const articles = await readLooprailStoredArticles({ runtimeDirectory });
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Updated article title");
  assert.equal(articles[0].description, "Short excerpt");
  assert.equal(articles[0].metaDescription, "SEO meta description");
  assert.equal(articles[0].date, "2026-06-02");
  assert.equal(articles[0].updatedAt, "2026-06-03");
  assert.equal(articles[0].published, true);
  assert.match(articles[0].content, /Markdown article body/);
});

test("edits, promotes, and deletes runtime articles", async (t) => {
  const runtimeDirectory = await createTempContentDir();
  t.after(() => rm(runtimeDirectory, { recursive: true, force: true }));

  await persistLooprailArticle(
    { ...sampleArticle, status: "published" },
    "published",
    {
    baseUrl: "https://example.com",
    runtimeDirectory,
    now: new Date("2026-06-02T12:00:00Z"),
    },
  );

  const updated = await updateLooprailStoredArticle(
    "article-title",
    {
      title: "Edited article title",
      description: "Edited description",
      category: "Promoted",
      tags: ["edited", "article"],
      content: "## Edited\n\nUpdated body.",
      promoted: true,
      published: true,
    },
    {
      runtimeDirectory,
      now: new Date("2026-06-04T12:00:00Z"),
    },
  );

  assert.equal(updated.title, "Edited article title");
  assert.equal(updated.description, "Edited description");
  assert.equal(updated.category, "Promoted");
  assert.equal(updated.promoted, true);
  assert.equal(updated.published, true);
  assert.equal(updated.status, "published");
  assert.equal(updated.updatedAt, "2026-06-04");
  assert.match(updated.content, /Updated body/);

  const stored = await readLooprailStoredArticleBySlug("article-title", {
    runtimeDirectory,
  });
  assert.equal(stored?.promoted, true);

  await deleteLooprailStoredArticle("article-title", { runtimeDirectory });
  assert.equal(
    await readLooprailStoredArticleBySlug("article-title", { runtimeDirectory }),
    undefined,
  );
  assert.equal((await readLooprailStoredArticles({ runtimeDirectory })).length, 0);
});

test("requires durable storage configuration on Vercel", async (t) => {
  const previousVercel = process.env.VERCEL;
  const previousStorageMode = process.env[LOOPRAIL_STORAGE_MODE_ENV];
  const previousGithubToken = process.env[LOOPRAIL_GITHUB_TOKEN_ENV];
  const previousGithubRepo = process.env[LOOPRAIL_GITHUB_REPO_ENV];
  const previousGenericGithubToken = process.env.GITHUB_TOKEN;
  const previousBlobToken = process.env[BLOB_READ_WRITE_TOKEN_ENV];
  const previousBlobStoreId = process.env[BLOB_STORE_ID_ENV];
  const previousOidcToken = process.env.VERCEL_OIDC_TOKEN;
  t.after(() => {
    restoreEnv("VERCEL", previousVercel);
    restoreEnv(LOOPRAIL_STORAGE_MODE_ENV, previousStorageMode);
    restoreEnv(LOOPRAIL_GITHUB_TOKEN_ENV, previousGithubToken);
    restoreEnv(LOOPRAIL_GITHUB_REPO_ENV, previousGithubRepo);
    restoreEnv("GITHUB_TOKEN", previousGenericGithubToken);
    restoreEnv(BLOB_READ_WRITE_TOKEN_ENV, previousBlobToken);
    restoreEnv(BLOB_STORE_ID_ENV, previousBlobStoreId);
    restoreEnv("VERCEL_OIDC_TOKEN", previousOidcToken);
  });

  process.env.VERCEL = "1";
  delete process.env[LOOPRAIL_STORAGE_MODE_ENV];
  delete process.env[LOOPRAIL_GITHUB_TOKEN_ENV];
  delete process.env[LOOPRAIL_GITHUB_REPO_ENV];
  delete process.env.GITHUB_TOKEN;
  delete process.env[BLOB_READ_WRITE_TOKEN_ENV];
  delete process.env[BLOB_STORE_ID_ENV];
  delete process.env.VERCEL_OIDC_TOKEN;

  await assert.rejects(
    () =>
      persistLooprailArticle(sampleArticle, "draft", {
        baseUrl: "https://example.com",
      }),
    (error) => {
      if (!(error instanceof LooprailStorageError)) return false;
      assert.match(error.message, /runtime storage is not configured/i);
      return true;
    },
  );
});

test("publishes an existing draft and preserves its original date", async (t) => {
  const contentDirectory = await createTempContentDir();
  t.after(() => rm(contentDirectory, { recursive: true, force: true }));

  const draft = await persistLooprailArticle(sampleArticle, "draft", {
    baseUrl: "https://example.com",
    contentDirectory,
    now: new Date("2026-06-02T12:00:00Z"),
  });

  await persistLooprailArticle(
    {
      ...sampleArticle,
      title: "Updated article title",
      status: "published",
      external_article_id: draft.id,
    },
    "published",
    {
      baseUrl: "https://example.com",
      contentDirectory,
      now: new Date("2026-06-03T12:00:00Z"),
    },
  );

  const raw = await readFile(path.join(contentDirectory, "article-title.mdx"), "utf8");
  const parsed = matter(raw);

  assert.equal(parsed.data.title, "Updated article title");
  assert.equal(parsed.data.date, "2026-06-02");
  assert.equal(parsed.data.updatedAt, "2026-06-03");
  assert.equal(parsed.data.published, true);
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
