import { timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const DEFAULT_LOOPRAIL_AUTH_HEADER = "x-looprail-api-key";
export const LOOPRAIL_API_KEY_ENV = "LOOPRAIL_CMS_API_KEY";
export const LOOPRAIL_AUTH_HEADER_ENV = "LOOPRAIL_CMS_AUTH_HEADER";
export const LOOPRAIL_PUBLIC_BASE_URL_ENV = "LOOPRAIL_CMS_PUBLIC_BASE_URL";
export const LOOPRAIL_STORAGE_MODE_ENV = "LOOPRAIL_CMS_STORAGE_MODE";
export const LOOPRAIL_GITHUB_TOKEN_ENV = "LOOPRAIL_CMS_GITHUB_TOKEN";
export const LOOPRAIL_GITHUB_REPO_ENV = "LOOPRAIL_CMS_GITHUB_REPO";
export const LOOPRAIL_GITHUB_BRANCH_ENV = "LOOPRAIL_CMS_GITHUB_BRANCH";
export const LOOPRAIL_GITHUB_COMMITTER_NAME_ENV =
  "LOOPRAIL_CMS_GITHUB_COMMITTER_NAME";
export const LOOPRAIL_GITHUB_COMMITTER_EMAIL_ENV =
  "LOOPRAIL_CMS_GITHUB_COMMITTER_EMAIL";
export const DEFAULT_LOOPRAIL_BASE_URL = "https://www.zenfulnote.app";

const MAX_SLUG_LENGTH = 120;
const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_TITLE_LENGTH = 220;
const MAX_BODY_LENGTH = 250_000;
const POSTS_DIRECTORY = path.join(process.cwd(), "content", "blog");
const POSTS_REPOSITORY_DIRECTORY = "content/blog";

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
  public_url: string;
  draft_url?: string;
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

export class LooprailStorageError extends Error {
  status: 500 | 503;

  constructor(message: string, status: 500 | 503 = 500) {
    super(message);
    this.name = "LooprailStorageError";
    this.status = status;
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

  if (expectedStatus === "draft" && status === "drafted") {
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

type LooprailArticleStorage = {
  read(slug: string): Promise<ReturnType<typeof matter> | undefined>;
  write(slug: string, content: string, message: string): Promise<void>;
  delete(slug: string, message: string): Promise<void>;
};

function articleRepositoryPathForSlug(slug: string): string {
  return `${POSTS_REPOSITORY_DIRECTORY}/${slug}.mdx`;
}

function createLooprailArticleStorage(
  options: PersistLooprailArticleOptions,
): LooprailArticleStorage {
  if (options.contentDirectory) {
    return createFilesystemArticleStorage(options.contentDirectory);
  }

  if (shouldUseGithubArticleStorage(process.env)) {
    return createGithubArticleStorage(process.env);
  }

  if (process.env.VERCEL) {
    throw new LooprailStorageError(
      [
        "Looprail CMS storage is not configured for Vercel.",
        `Add ${LOOPRAIL_GITHUB_TOKEN_ENV} with repository Contents read/write access.`,
        `${LOOPRAIL_GITHUB_REPO_ENV} is optional when Vercel Git metadata is available.`,
      ].join(" "),
      503,
    );
  }

  return createFilesystemArticleStorage(POSTS_DIRECTORY);
}

function createFilesystemArticleStorage(contentDirectory: string): LooprailArticleStorage {
  return {
    async read(slug) {
      return readExistingPost(articlePathForSlug(contentDirectory, slug));
    },
    async write(slug, content) {
      try {
        await mkdir(contentDirectory, { recursive: true });
        await writeFile(articlePathForSlug(contentDirectory, slug), content, "utf8");
      } catch (error) {
        throw new LooprailStorageError(
          storageErrorMessage("write the local blog draft", error),
        );
      }
    },
    async delete(slug) {
      const targetPath = articlePathForSlug(contentDirectory, slug);
      if (!fs.existsSync(targetPath)) return;
      try {
        await unlink(targetPath);
      } catch (error) {
        throw new LooprailStorageError(
          storageErrorMessage("remove the previous local blog draft", error),
        );
      }
    },
  };
}

function shouldUseGithubArticleStorage(env: NodeJS.ProcessEnv): boolean {
  const storageMode = env[LOOPRAIL_STORAGE_MODE_ENV]?.trim().toLowerCase();
  return (
    storageMode === "github" ||
    Boolean(env[LOOPRAIL_GITHUB_TOKEN_ENV]?.trim()) ||
    Boolean(env.GITHUB_TOKEN?.trim())
  );
}

function createGithubArticleStorage(env: NodeJS.ProcessEnv): LooprailArticleStorage {
  const token =
    env[LOOPRAIL_GITHUB_TOKEN_ENV]?.trim() || env.GITHUB_TOKEN?.trim();
  const repository =
    env[LOOPRAIL_GITHUB_REPO_ENV]?.trim() ||
    githubRepositoryFromVercelEnv(env);
  const branch =
    env[LOOPRAIL_GITHUB_BRANCH_ENV]?.trim() ||
    env.VERCEL_GIT_COMMIT_REF?.trim() ||
    "main";

  if (!token || !repository) {
    throw new LooprailStorageError(
      [
        "Looprail CMS GitHub storage is missing configuration.",
        `Set ${LOOPRAIL_GITHUB_TOKEN_ENV} and ${LOOPRAIL_GITHUB_REPO_ENV}`,
        "so drafts can be committed to the website repository.",
      ].join(" "),
      503,
    );
  }

  const committerName =
    env[LOOPRAIL_GITHUB_COMMITTER_NAME_ENV]?.trim() || "Looprail CMS";
  const committerEmail =
    env[LOOPRAIL_GITHUB_COMMITTER_EMAIL_ENV]?.trim() ||
    "looprail-cms@users.noreply.github.com";

  return {
    async read(slug) {
      const file = await readGithubContentFile({
        repository,
        branch,
        token,
        path: articleRepositoryPathForSlug(slug),
      });
      return file ? matter(file.content) : undefined;
    },
    async write(slug, content, message) {
      await writeGithubContentFile({
        repository,
        branch,
        token,
        path: articleRepositoryPathForSlug(slug),
        content,
        message,
        committerName,
        committerEmail,
      });
    },
    async delete(slug, message) {
      await deleteGithubContentFile({
        repository,
        branch,
        token,
        path: articleRepositoryPathForSlug(slug),
        message,
        committerName,
        committerEmail,
      });
    },
  };
}

function githubRepositoryFromVercelEnv(env: NodeJS.ProcessEnv): string | undefined {
  const owner = env.VERCEL_GIT_REPO_OWNER?.trim();
  const slug = env.VERCEL_GIT_REPO_SLUG?.trim();
  return owner && slug ? `${owner}/${slug}` : undefined;
}

type GithubContentFile = {
  content: string;
  sha: string;
};

async function readGithubContentFile(input: {
  repository: string;
  branch: string;
  token: string;
  path: string;
}): Promise<GithubContentFile | undefined> {
  const response = await fetch(githubContentUrl(input.repository, input.path, input.branch), {
    headers: githubHeaders(input.token),
    cache: "no-store",
  });

  if (response.status === 404) {
    return undefined;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new LooprailStorageError(
      githubErrorMessage("read the existing blog draft", response.status, body),
    );
  }

  if (!isPlainObject(body) || typeof body.content !== "string" || typeof body.sha !== "string") {
    throw new LooprailStorageError("GitHub returned an unexpected content response.");
  }

  return {
    content: Buffer.from(body.content.replace(/\s/g, ""), "base64").toString("utf8"),
    sha: body.sha,
  };
}

async function writeGithubContentFile(input: {
  repository: string;
  branch: string;
  token: string;
  path: string;
  content: string;
  message: string;
  committerName: string;
  committerEmail: string;
}) {
  const existing = await readGithubContentFile(input);
  const response = await fetch(githubContentUrl(input.repository, input.path), {
    method: "PUT",
    headers: githubHeaders(input.token),
    body: JSON.stringify({
      message: input.message,
      content: Buffer.from(input.content, "utf8").toString("base64"),
      branch: input.branch,
      sha: existing?.sha,
      committer: {
        name: input.committerName,
        email: input.committerEmail,
      },
    }),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new LooprailStorageError(
      githubErrorMessage("commit the blog draft", response.status, body),
    );
  }
}

async function deleteGithubContentFile(input: {
  repository: string;
  branch: string;
  token: string;
  path: string;
  message: string;
  committerName: string;
  committerEmail: string;
}) {
  const existing = await readGithubContentFile(input);
  if (!existing) return;

  const response = await fetch(githubContentUrl(input.repository, input.path), {
    method: "DELETE",
    headers: githubHeaders(input.token),
    body: JSON.stringify({
      message: input.message,
      branch: input.branch,
      sha: existing.sha,
      committer: {
        name: input.committerName,
        email: input.committerEmail,
      },
    }),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new LooprailStorageError(
      githubErrorMessage("remove the previous blog draft", response.status, body),
    );
  }
}

function githubContentUrl(repository: string, filePath: string, ref?: string): string {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const url = new URL(
    `https://api.github.com/repos/${repository}/contents/${encodedPath}`,
  );
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function githubErrorMessage(action: string, status: number, body: unknown): string {
  const message =
    isPlainObject(body) && typeof body.message === "string"
      ? body.message
      : "GitHub returned an unexpected error.";
  return `Looprail CMS could not ${action}. GitHub returned HTTP ${status}: ${message}`;
}

function storageErrorMessage(action: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown storage error.";
  return `Looprail CMS could not ${action}: ${message}`;
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

function buildLooprailDraftUrl(slug: string): string | undefined {
  const repository =
    process.env[LOOPRAIL_GITHUB_REPO_ENV]?.trim() ||
    githubRepositoryFromVercelEnv(process.env);
  const branch =
    process.env[LOOPRAIL_GITHUB_BRANCH_ENV]?.trim() ||
    process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
    "main";

  if (!repository) {
    return undefined;
  }

  return `https://github.com/${repository}/blob/${branch}/${articleRepositoryPathForSlug(slug)}`;
}

export async function persistLooprailArticle(
  payload: unknown,
  status: LooprailArticleStatus,
  options: PersistLooprailArticleOptions = {},
): Promise<LooprailArticleResult> {
  const article = validateLooprailArticle(payload, status);
  const storage = createLooprailArticleStorage(options);
  const now = options.now ?? new Date();
  const externalSlug = article.externalArticleId
    ? normalizeSlug(article.externalArticleId)
    : undefined;
  const existingPost =
    (externalSlug && externalSlug !== article.slug
      ? await storage.read(externalSlug)
      : undefined) ?? (await storage.read(article.slug));
  const frontmatter = buildFrontmatter(
    article,
    status,
    now,
    existingPost?.data ?? {},
  );
  const fileBody = matter.stringify(`${article.content.trim()}\n`, frontmatter);
  const actionLabel = status === "published" ? "Publish" : "Draft";

  await storage.write(
    article.slug,
    fileBody,
    `${actionLabel} Looprail article: ${article.title}`,
  );

  if (externalSlug && externalSlug !== article.slug) {
    await storage.delete(
      externalSlug,
      `Remove replaced Looprail article draft: ${externalSlug}`,
    );
  }

  const publicUrl = buildLooprailArticleUrl(
    article.slug,
    options.baseUrl ?? getLooprailPublicBaseUrl(),
  );
  const draftUrl = status === "draft" ? buildLooprailDraftUrl(article.slug) : undefined;

  return {
    id: article.slug,
    slug: article.slug,
    status,
    url: status === "published" ? publicUrl : draftUrl ?? publicUrl,
    public_url: publicUrl,
    ...(draftUrl ? { draft_url: draftUrl } : {}),
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

  if (error instanceof LooprailStorageError) {
    console.error("Looprail CMS storage failed.", {
      name: error.name,
      message: error.message,
      status: error.status,
    });
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Looprail CMS article processing failed.", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown error",
  });

  return Response.json(
    { error: "Unable to process Looprail article" },
    { status: 500 },
  );
}
