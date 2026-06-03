import { timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const DEFAULT_LOOPRAIL_AUTH_HEADER = "x-looprail-api-key";
export const LOOPRAIL_API_KEY_ENV = "LOOPRAIL_CMS_API_KEY";
export const LOOPRAIL_AUTH_HEADER_ENV = "LOOPRAIL_CMS_AUTH_HEADER";
export const LOOPRAIL_PUBLIC_BASE_URL_ENV = "LOOPRAIL_CMS_PUBLIC_BASE_URL";
export const DEFAULT_LOOPRAIL_BASE_URL = "https://www.zenfulnote.app";

const MAX_SLUG_LENGTH = 120;
const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_TITLE_LENGTH = 220;
const MAX_BODY_LENGTH = 250_000;
const POSTS_DIRECTORY = path.join(process.cwd(), "content", "blog");

export type LooprailArticleStatus = "draft" | "published";

export type LooprailArticlePayload = {
  title: string;
  slug: string;
  excerpt?: string;
  meta_description?: string;
  body_markdown?: string;
  html?: string;
  primary_keyword?: string;
  secondary_keywords?: string[];
  search_intent?: string;
  content_angle?: string;
  author_name?: string;
  tags?: string[];
  status?: string;
  source?: string;
  quality_evaluation?: Record<string, unknown>;
  external_article_id?: string;
};

export type NormalizedLooprailArticle = {
  title: string;
  slug: string;
  excerpt?: string;
  metaDescription?: string;
  content: string;
  contentFormat: "markdown" | "html";
  primaryKeyword?: string;
  secondaryKeywords: string[];
  searchIntent?: string;
  contentAngle?: string;
  authorName: string;
  tags: string[];
  status: LooprailArticleStatus;
  source: string;
  qualityEvaluation?: Record<string, unknown>;
  externalArticleId?: string;
};

export type LooprailArticleResult = {
  id: string;
  slug: string;
  status: LooprailArticleStatus;
  url: string;
};

export type PersistLooprailArticleOptions = {
  baseUrl?: string;
  contentDirectory?: string;
  now?: Date;
};

export type LooprailAuthResult =
  | { ok: true }
  | {
      ok: false;
      status: 401 | 503;
      message: string;
    };

type MatterData = Record<string, unknown>;

export class LooprailValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super("Invalid Looprail article payload");
    this.name = "LooprailValidationError";
    this.issues = issues;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function normalizeText(value: string): string {
  return value.trim().replace(/\r\n/g, "\n");
}

function optionalString(
  payload: Record<string, unknown>,
  field: string,
  issues: string[],
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string | undefined {
  const value = payload[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push(`${field} must be a string`);
    return undefined;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    issues.push(`${field} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

function requiredString(
  payload: Record<string, unknown>,
  field: string,
  issues: string[],
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string {
  const normalized = optionalString(payload, field, issues, maxLength);

  if (!normalized) {
    issues.push(`${field} is required`);
    return "";
  }

  return normalized;
}

function optionalStringArray(
  payload: Record<string, unknown>,
  field: string,
  issues: string[],
): string[] {
  const value = payload[field];

  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push(`${field} must be an array of strings`);
    return [];
  }

  const strings: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      issues.push(`${field}[${index}] must be a string`);
      return;
    }

    const normalized = normalizeText(item);
    if (!normalized) {
      issues.push(`${field}[${index}] must not be empty`);
      return;
    }

    if (normalized.length > MAX_SHORT_TEXT_LENGTH) {
      issues.push(
        `${field}[${index}] must be ${MAX_SHORT_TEXT_LENGTH} characters or fewer`,
      );
      return;
    }

    strings.push(normalized);
  });

  return Array.from(new Set(strings));
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function optionalJsonObject(
  payload: Record<string, unknown>,
  field: string,
  issues: string[],
): Record<string, unknown> | undefined {
  const value = payload[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    issues.push(`${field} must be an object`);
    return undefined;
  }

  try {
    JSON.stringify(value);
  } catch {
    issues.push(`${field} must be JSON serializable`);
    return undefined;
  }

  return value;
}

function unsafeContentIssue(content: string): string | undefined {
  if (/^\s*(import|export)\s+/im.test(content)) {
    return "content must not include MDX import or export statements";
  }

  if (/<\s*(script|iframe|object|embed|link|meta)\b/i.test(content)) {
    return "content must not include unsafe HTML tags";
  }

  if (/\son[a-z]+\s*=/i.test(content)) {
    return "content must not include inline event handlers";
  }

  if (/javascript\s*:/i.test(content)) {
    return "content must not include javascript: URLs";
  }

  return undefined;
}

function readExpectedStatusIssue(
  payload: Record<string, unknown>,
  expectedStatus: LooprailArticleStatus,
): string | undefined {
  const status = payload.status;

  if (status === undefined || status === null) {
    return undefined;
  }

  if (status !== expectedStatus) {
    return `status must be "${expectedStatus}" for this endpoint`;
  }

  return undefined;
}

export function validateLooprailArticle(
  payload: unknown,
  expectedStatus: LooprailArticleStatus,
): NormalizedLooprailArticle {
  const issues: string[] = [];

  if (!isPlainObject(payload)) {
    throw new LooprailValidationError(["request body must be a JSON object"]);
  }

  const title = requiredString(payload, "title", issues, MAX_TITLE_LENGTH);
  const slug = normalizeSlug(requiredString(payload, "slug", issues));
  if (!slug) {
    issues.push("slug must contain at least one letter or number");
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    issues.push(`slug must be ${MAX_SLUG_LENGTH} characters or fewer`);
  }

  const excerpt = optionalString(payload, "excerpt", issues);
  const metaDescription = optionalString(payload, "meta_description", issues);
  const bodyMarkdown = optionalString(
    payload,
    "body_markdown",
    issues,
    MAX_BODY_LENGTH,
  );
  const html = optionalString(payload, "html", issues, MAX_BODY_LENGTH);
  const primaryKeyword = optionalString(payload, "primary_keyword", issues);
  const secondaryKeywords = optionalStringArray(
    payload,
    "secondary_keywords",
    issues,
  );
  const searchIntent = optionalString(payload, "search_intent", issues);
  const contentAngle = optionalString(payload, "content_angle", issues);
  const authorName =
    optionalString(payload, "author_name", issues) ?? "Looprail";
  const tags = optionalStringArray(payload, "tags", issues);
  const source = optionalString(payload, "source", issues) ?? "looprail";
  const qualityEvaluation = optionalJsonObject(
    payload,
    "quality_evaluation",
    issues,
  );
  const externalArticleId = optionalString(
    payload,
    "external_article_id",
    issues,
    MAX_SLUG_LENGTH,
  );
  const statusIssue = readExpectedStatusIssue(payload, expectedStatus);

  if (statusIssue) {
    issues.push(statusIssue);
  }

  const content = bodyMarkdown ?? html;
  const contentFormat = bodyMarkdown ? "markdown" : "html";

  if (!content) {
    issues.push("body_markdown or html is required");
  } else {
    const contentIssue = unsafeContentIssue(content);
    if (contentIssue) {
      issues.push(contentIssue);
    }
  }

  if (issues.length > 0) {
    throw new LooprailValidationError(issues);
  }

  return {
    title,
    slug,
    excerpt,
    metaDescription,
    content: content ?? "",
    contentFormat,
    primaryKeyword,
    secondaryKeywords,
    searchIntent,
    contentAngle,
    authorName,
    tags,
    status: expectedStatus,
    source,
    qualityEvaluation,
    externalArticleId: externalArticleId
      ? normalizeSlug(externalArticleId)
      : undefined,
  };
}

function safeEqual(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    const paddedLength = Math.max(firstBuffer.length, secondBuffer.length, 1);
    timingSafeEqual(Buffer.alloc(paddedLength), Buffer.alloc(paddedLength));
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
}

export function getLooprailAuthHeaderName(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    env[LOOPRAIL_AUTH_HEADER_ENV]?.trim().toLowerCase() ||
    DEFAULT_LOOPRAIL_AUTH_HEADER
  );
}

export function validateLooprailApiKey(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
): LooprailAuthResult {
  const expectedApiKey = env[LOOPRAIL_API_KEY_ENV]?.trim();

  if (!expectedApiKey) {
    return {
      ok: false,
      status: 503,
      message: "Looprail CMS API key is not configured",
    };
  }

  const providedApiKey = headers.get(getLooprailAuthHeaderName(env))?.trim();

  if (!providedApiKey || !safeEqual(providedApiKey, expectedApiKey)) {
    return {
      ok: false,
      status: 401,
      message: "Invalid Looprail API key",
    };
  }

  return { ok: true };
}

export function looprailAuthErrorResponse(result: Exclude<LooprailAuthResult, { ok: true }>) {
  return Response.json({ error: result.message }, { status: result.status });
}

export function requireLooprailAuth(request: Request): Response | undefined {
  const result = validateLooprailApiKey(request.headers);

  if (result.ok) {
    return undefined;
  }

  return looprailAuthErrorResponse(result);
}

export async function readLooprailJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new LooprailValidationError(["request body must be valid JSON"]);
  }
}

function compactObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(compactObject);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, compactObject(entryValue)]),
  );
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readStringData(data: MatterData, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value ? value : undefined;
}

function articlePathForSlug(contentDirectory: string, slug: string): string {
  const filePath = path.join(contentDirectory, `${slug}.mdx`);
  const relativePath = path.relative(contentDirectory, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new LooprailValidationError(["slug resolves outside content directory"]);
  }

  return filePath;
}

async function readExistingPost(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const raw = await readFile(filePath, "utf8");
  return matter(raw);
}

function deriveTags(article: NormalizedLooprailArticle): string[] {
  const tags = [...article.tags];

  if (article.primaryKeyword) {
    tags.push(article.primaryKeyword);
  }

  return Array.from(new Set(tags));
}

function deriveCategory(article: NormalizedLooprailArticle): string {
  return (
    article.primaryKeyword ??
    article.tags[0] ??
    article.searchIntent ??
    "Looprail"
  );
}

function buildFrontmatter(
  article: NormalizedLooprailArticle,
  status: LooprailArticleStatus,
  now: Date,
  existingData: MatterData = {},
): MatterData {
  const today = formatDate(now);
  const description =
    article.excerpt ??
    article.metaDescription ??
    readStringData(existingData, "description") ??
    article.title;

  return compactObject({
    title: article.title,
    description,
    metaDescription: article.metaDescription,
    date: readStringData(existingData, "date") ?? today,
    updatedAt: status === "published" ? today : readStringData(existingData, "updatedAt"),
    category: readStringData(existingData, "category") ?? deriveCategory(article),
    tags: deriveTags(article),
    published: status === "published",
    author: article.authorName,
    looprail: {
      id: article.slug,
      source: article.source,
      status,
      contentFormat: article.contentFormat,
      primaryKeyword: article.primaryKeyword,
      secondaryKeywords: article.secondaryKeywords,
      searchIntent: article.searchIntent,
      contentAngle: article.contentAngle,
      qualityEvaluation: article.qualityEvaluation,
      externalArticleId: article.externalArticleId,
    },
  }) as MatterData;
}

export function getLooprailPublicBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
  fallback = DEFAULT_LOOPRAIL_BASE_URL,
): string {
  return env[LOOPRAIL_PUBLIC_BASE_URL_ENV]?.trim() || fallback;
}

export function buildLooprailArticleUrl(slug: string, baseUrl: string): string {
  return new URL(`/blog/${slug}`, baseUrl).toString();
}

export async function persistLooprailArticle(
  payload: unknown,
  status: LooprailArticleStatus,
  options: PersistLooprailArticleOptions = {},
): Promise<LooprailArticleResult> {
  const article = validateLooprailArticle(payload, status);
  const contentDirectory = options.contentDirectory ?? POSTS_DIRECTORY;
  const now = options.now ?? new Date();
  const targetPath = articlePathForSlug(contentDirectory, article.slug);
  const externalSlug = article.externalArticleId
    ? normalizeSlug(article.externalArticleId)
    : undefined;
  const externalPath =
    externalSlug && externalSlug !== article.slug
      ? articlePathForSlug(contentDirectory, externalSlug)
      : undefined;
  const existingPost =
    (externalPath ? await readExistingPost(externalPath) : undefined) ??
    (await readExistingPost(targetPath));
  const frontmatter = buildFrontmatter(
    article,
    status,
    now,
    existingPost?.data ?? {},
  );
  const fileBody = matter.stringify(`${article.content.trim()}\n`, frontmatter);

  await mkdir(contentDirectory, { recursive: true });
  await writeFile(targetPath, fileBody, "utf8");

  if (externalPath && externalPath !== targetPath && fs.existsSync(externalPath)) {
    await unlink(externalPath);
  }

  return {
    id: article.slug,
    slug: article.slug,
    status,
    url: buildLooprailArticleUrl(
      article.slug,
      options.baseUrl ?? getLooprailPublicBaseUrl(),
    ),
  };
}

export function looprailErrorResponse(error: unknown): Response {
  if (error instanceof LooprailValidationError) {
    return Response.json(
      {
        error: error.message,
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  return Response.json(
    { error: "Unable to process Looprail article" },
    { status: 500 },
  );
}
