import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import {
  LOOPRAIL_API_KEY_ENV,
  LooprailValidationError,
  persistLooprailArticle,
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

  assert.deepEqual(
    validateLooprailApiKey(headers, {
      [LOOPRAIL_API_KEY_ENV]: "site-generated-secret",
    }),
    { ok: true },
  );
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
  assert.deepEqual(article.secondaryKeywords, ["related keyword"]);
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
      assert.equal(error instanceof LooprailValidationError, true);
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
    url: "https://example.com/blog/article-title",
  });

  const raw = await readFile(path.join(contentDirectory, "article-title.mdx"), "utf8");
  const parsed = matter(raw);

  assert.equal(parsed.data.title, "Article title");
  assert.equal(parsed.data.description, "Short excerpt");
  assert.equal(parsed.data.date, "2026-06-03");
  assert.equal(parsed.data.published, false);
  assert.equal(parsed.data.author, "Looprail");
  assert.deepEqual(parsed.data.tags, ["keyword"]);
  assert.equal(parsed.data.looprail.source, "looprail");
  assert.match(parsed.content, /Markdown article body/);
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
