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

test("accepts markdown and HTML body aliases", () => {
  const markdownArticle = validateLooprailArticle(
    {
      ...sampleArticle,
      body_markdown: undefined,
      html: undefined,
      markdown: "## Alias\n\nMarkdown alias body.",
    },
    "draft",
  );

  assert.equal(markdownArticle.contentFormat, "markdown");
  assert.match(markdownArticle.content, /Markdown alias body/);

  const htmlArticle = validateLooprailArticle(
    {
      ...sampleArticle,
      body_markdown: undefined,
      html: undefined,
      body_html: "<p>HTML alias body.</p>",
    },
    "draft",
  );

  assert.equal(htmlArticle.contentFormat, "html");
  assert.match(htmlArticle.content, /HTML alias body/);
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

test("stores expanded Looprail resource metadata with runtime articles", async (t) => {
  const runtimeDirectory = await createTempContentDir();
  t.after(() => rm(runtimeDirectory, { recursive: true, force: true }));

  const result = await persistLooprailArticle(
    {
      ...sampleArticle,
      status: "published",
      quality_evaluation: {
        passed: true,
        has_source_reference: true,
        has_hyperlink: true,
        has_real_life_example: true,
        has_reflection_prompt: true,
        has_zenfulnote_tie_in: true,
        has_clear_cta_or_lead_magnet: true,
        avoids_unverified_claims: true,
        citations_are_attributed: true,
        no_long_unapproved_copyrighted_quotes: true,
      },
      source_references: [
        {
          id: "jung-shadow",
          title: "Aion",
          author: "C. G. Jung",
          source_type: "psychology/depth psychology book",
          url: "https://example.com/aion",
          publication: "Collected Works",
          year: 1951,
          page_or_timestamp: "p. 8",
          exact_quote: "Short approved quote.",
          approved_paraphrase: "A short approved paraphrase.",
          citation_text: "Jung, Aion",
          themes: ["shadow"],
          topics: ["depth psychology"],
          keywords: ["shadow work"],
          allowed_use: ["quote", "paraphrase", "link"],
          copyright_note: "Approved short quote.",
          notes: "Use sparingly.",
        },
      ],
      hyperlinks: [
        {
          id: "zenfulnote-download",
          title: "Download ZenfulNote",
          url: "https://www.zenfulnote.app/download",
          source_type: "zenfulnote",
          reason: "App tie-in",
        },
      ],
      real_life_examples: [
        {
          id: "defensive-friend",
          scenario: "A friend grows defensive whenever a certain topic comes up.",
          topics: ["triggers", "shadow"],
        },
      ],
      reflection_prompt: "Where does this pattern show up in your own life?",
      zenfulnote_app_tie_in: {
        label: "Track the pattern in ZenfulNote",
        url: "https://www.zenfulnote.app/download",
        guidance: "Invite the reader to use the app for reflective check-ins.",
      },
      lead_magnet: {
        id: "shadow-prompts",
        title: "30 Shadow Work Prompts",
        description: "Go deeper with a free prompt guide.",
        cta_label: "Access the prompts",
        destination_url: "https://www.zenfulnote.app/shadow-prompts",
        email_required: true,
      },
      blog_resource_context: {
        topic: "shadow work",
        selected_by: "looprail",
      },
    },
    "published",
    {
      baseUrl: "https://example.com",
      runtimeDirectory,
      now: new Date("2026-06-03T12:00:00Z"),
    },
  );

  assert.deepEqual(result, {
    id: "article-title",
    slug: "article-title",
    status: "published",
    storage: "filesystem",
    rendering_status: "public",
    visibility: "public",
    url: "https://example.com/blog/article-title",
    public_url: "https://example.com/blog/article-title",
  });

  const article = await readLooprailStoredArticleBySlug("article-title", {
    runtimeDirectory,
  });

  assert.equal(article?.looprail.sourceReferences?.[0]?.id, "jung-shadow");
  assert.equal(article?.looprail.hyperlinks?.[0]?.url, "https://www.zenfulnote.app/download");
  assert.equal(article?.looprail.realLifeExamples?.[0]?.id, "defensive-friend");
  assert.equal(article?.looprail.reflectionPrompt, "Where does this pattern show up in your own life?");
  assert.equal(article?.looprail.zenfulnoteAppTieIn?.label, "Track the pattern in ZenfulNote");
  assert.equal(article?.looprail.leadMagnet?.id, "shadow-prompts");
  assert.deepEqual(article?.looprail.blogResourceContext, {
    topic: "shadow work",
    selected_by: "looprail",
  });
  assert.equal(article?.looprail.qualityEvaluation?.has_source_reference, true);
  assert.equal(article?.looprail.qualityEvaluation?.no_long_unapproved_copyrighted_quotes, true);
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
