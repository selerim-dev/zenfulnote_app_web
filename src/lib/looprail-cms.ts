import { timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, del, get, put } from "@vercel/blob";
import matter from "gray-matter";

export const DEFAULT_LOOPRAIL_AUTH_HEADER = "x-looprail-api-key";
export const LOOPRAIL_API_KEY_ENV = "LOOPRAIL_CMS_API_KEY";
export const LOOPRAIL_AUTH_HEADER_ENV = "LOOPRAIL_CMS_AUTH_HEADER";
export const LOOPRAIL_PUBLIC_BASE_URL_ENV = "LOOPRAIL_CMS_PUBLIC_BASE_URL";
export const LOOPRAIL_STORAGE_MODE_ENV = "LOOPRAIL_CMS_STORAGE_MODE";
export const LOOPRAIL_RUNTIME_DIRECTORY_ENV = "LOOPRAIL_CMS_RUNTIME_DIRECTORY";
export const LOOPRAIL_GITHUB_TOKEN_ENV = "LOOPRAIL_CMS_GITHUB_TOKEN";
export const LOOPRAIL_GITHUB_REPO_ENV = "LOOPRAIL_CMS_GITHUB_REPO";
export const LOOPRAIL_GITHUB_BRANCH_ENV = "LOOPRAIL_CMS_GITHUB_BRANCH";
export const LOOPRAIL_GITHUB_COMMITTER_NAME_ENV =
  "LOOPRAIL_CMS_GITHUB_COMMITTER_NAME";
export const LOOPRAIL_GITHUB_COMMITTER_EMAIL_ENV =
  "LOOPRAIL_CMS_GITHUB_COMMITTER_EMAIL";
export const BLOB_READ_WRITE_TOKEN_ENV = "BLOB_READ_WRITE_TOKEN";
export const BLOB_STORE_ID_ENV = "BLOB_STORE_ID";
export const DEFAULT_LOOPRAIL_BASE_URL = "https://www.zenfulnote.app";

const MAX_SLUG_LENGTH = 120;
const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_URL_LENGTH = 2_000;
const MAX_TITLE_LENGTH = 220;
const MAX_BODY_LENGTH = 250_000;
const POSTS_DIRECTORY = path.join(process.cwd(), "content", "blog");
const POSTS_REPOSITORY_DIRECTORY = "content/blog";
const RUNTIME_ARTICLES_DIRECTORY = path.join(
  process.cwd(),
  ".looprail",
  "articles",
);
const BLOB_ARTICLES_DIRECTORY = "looprail/articles";
const BLOB_INDEX_PATH = `${BLOB_ARTICLES_DIRECTORY}/index.json`;

export type LooprailArticleStatus = "draft" | "published";

export type LooprailArticlePayload = {
  title: string;
  slug: string;
  excerpt?: string;
  meta_description?: string;
  body_markdown?: string;
  html?: string;
  featured_image?: string;
  featured_image_alt?: string;
  primary_keyword?: string;
  secondary_keywords?: string[];
  search_intent?: string;
  content_angle?: string;
  author_name?: string;
  tags?: string[];
  status?: string;
  source?: string;
  source_action_intent_id?: string;
  idempotency_key?: string;
  quality_evaluation?: Record<string, unknown>;
  external_article_id?: string;
  images?: Record<string, unknown>[];
  assets?: Record<string, unknown>[];
};

export type NormalizedLooprailArticle = {
  title: string;
  slug: string;
  excerpt?: string;
  metaDescription?: string;
  content: string;
  contentFormat: "markdown" | "html";
  featuredImage?: string;
  featuredImageAlt?: string;
  primaryKeyword?: string;
  secondaryKeywords: string[];
  searchIntent?: string;
  contentAngle?: string;
  authorName: string;
  tags: string[];
  status: LooprailArticleStatus;
  source: string;
  sourceActionIntentId?: string;
  idempotencyKey?: string;
  qualityEvaluation?: Record<string, unknown>;
  externalArticleId?: string;
  images?: Record<string, unknown>[];
  assets?: Record<string, unknown>[];
};

export type StoredLooprailArticle = {
  schemaVersion: 1;
  id: string;
  slug: string;
  status: LooprailArticleStatus;
  published: boolean;
  promoted?: boolean;
  title: string;
  description: string;
  metaDescription?: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  featuredImage?: string;
  featuredImageAlt?: string;
  author: string;
  content: string;
  contentFormat: "markdown" | "html";
  looprail: {
    id: string;
    source: string;
    sourceActionIntentId?: string;
    idempotencyKey?: string;
    status: LooprailArticleStatus;
    contentFormat: "markdown" | "html";
    primaryKeyword?: string;
    secondaryKeywords: string[];
    searchIntent?: string;
    contentAngle?: string;
    qualityEvaluation?: Record<string, unknown>;
    externalArticleId?: string;
    images?: Record<string, unknown>[];
    assets?: Record<string, unknown>[];
  };
};

export type LooprailArticleResult = {
  id: string;
  slug: string;
  status: LooprailArticleStatus;
  storage: "filesystem" | "github" | "vercel_blob";
  rendering_status: "stored" | "public";
  visibility: "draft" | "public";
  url?: string;
  public_url?: string;
  draft_url?: string;
};

export type PersistLooprailArticleOptions = {
  baseUrl?: string;
  contentDirectory?: string;
  runtimeDirectory?: string;
  now?: Date;
};

export type LooprailStoredArticleUpdate = {
  title?: string;
  description?: string;
  metaDescription?: string;
  category?: string;
  tags?: string[];
  featuredImage?: string;
  featuredImageAlt?: string;
  author?: string;
  content?: string;
  contentFormat?: "markdown" | "html";
  published?: boolean;
  promoted?: boolean;
  date?: string;
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

function trimmedOptional(
  value: string | undefined,
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

function trimmedOr(
  value: string | undefined,
  fallback: string,
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string {
  return trimmedOptional(value, maxLength) ?? fallback;
}

function uniqueStringArray(
  values: string[],
  maxItems: number,
  maxLength = MAX_SHORT_TEXT_LENGTH,
) {
  return Array.from(
    new Set(
      values
        .map((item) => trimmedOptional(item, maxLength))
        .filter((item): item is string => Boolean(item)),
    ),
  ).slice(0, maxItems);
}

function validDateOr(value: string | undefined, fallback: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }
  return value;
}

function hasOwn<T extends object>(value: T, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, key);
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

function optionalJsonObjectArray(
  payload: Record<string, unknown>,
  field: string,
  issues: string[],
): Record<string, unknown>[] | undefined {
  const value = payload[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    issues.push(`${field} must be an array of objects`);
    return undefined;
  }

  const objects: Record<string, unknown>[] = [];
  value.forEach((item, index) => {
    if (!isPlainObject(item)) {
      issues.push(`${field}[${index}] must be an object`);
      return;
    }

    try {
      JSON.stringify(item);
    } catch {
      issues.push(`${field}[${index}] must be JSON serializable`);
      return;
    }

    objects.push(item);
  });

  return objects;
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
  const featuredImage =
    optionalString(payload, "featured_image", issues, MAX_URL_LENGTH) ??
    optionalString(payload, "featuredImage", issues, MAX_URL_LENGTH);
  const featuredImageAlt =
    optionalString(payload, "featured_image_alt", issues) ??
    optionalString(payload, "featuredImageAlt", issues);
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
  const sourceActionIntentId = optionalString(
    payload,
    "source_action_intent_id",
    issues,
    MAX_SLUG_LENGTH,
  );
  const idempotencyKey = optionalString(
    payload,
    "idempotency_key",
    issues,
    MAX_SHORT_TEXT_LENGTH,
  );
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
  const images = optionalJsonObjectArray(payload, "images", issues);
  const assets = optionalJsonObjectArray(payload, "assets", issues);
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
    featuredImage,
    featuredImageAlt,
    primaryKeyword,
    secondaryKeywords,
    searchIntent,
    contentAngle,
    authorName,
    tags,
    status: expectedStatus,
    source,
    sourceActionIntentId,
    idempotencyKey,
    qualityEvaluation,
    externalArticleId: externalArticleId
      ? normalizeSlug(externalArticleId)
      : undefined,
    images,
    assets,
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
  kind: "filesystem" | "github";
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
    kind: "filesystem",
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
  return storageMode === "github";
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
    kind: "github",
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

type StoredLooprailArticleIndexEntry = {
  slug: string;
  title: string;
  status: LooprailArticleStatus;
  published: boolean;
  promoted?: boolean;
  date: string;
  updatedAt?: string;
};

type LooprailRuntimeArticleStore = {
  kind: "filesystem" | "vercel_blob";
  read(slug: string): Promise<StoredLooprailArticle | undefined>;
  readAll(): Promise<StoredLooprailArticle[]>;
  write(article: StoredLooprailArticle): Promise<void>;
  delete(slug: string): Promise<void>;
};

function storageMode(env: NodeJS.ProcessEnv = process.env): string {
  return env[LOOPRAIL_STORAGE_MODE_ENV]?.trim().toLowerCase() ?? "";
}

function shouldPersistLegacyMdx(options: PersistLooprailArticleOptions): boolean {
  return Boolean(options.contentDirectory) || storageMode() === "github";
}

function hasBlobRuntimeCredentials(env: NodeJS.ProcessEnv): boolean {
  const hasReadWriteToken = Boolean(env[BLOB_READ_WRITE_TOKEN_ENV]?.trim());
  const hasOidcStore =
    Boolean(env.VERCEL_OIDC_TOKEN?.trim()) &&
    Boolean(env[BLOB_STORE_ID_ENV]?.trim());
  return hasReadWriteToken || hasOidcStore;
}

function shouldUseBlobRuntimeStore(env: NodeJS.ProcessEnv): boolean {
  const mode = storageMode(env);
  return mode === "blob" || mode === "vercel_blob" || Boolean(env.VERCEL);
}

function canReadRuntimeArticleStore(
  options: PersistLooprailArticleOptions = {},
): boolean {
  if (options.runtimeDirectory) return true;
  const mode = storageMode();
  if (mode === "github") return false;
  if (shouldUseBlobRuntimeStore(process.env)) {
    return hasBlobRuntimeCredentials(process.env);
  }
  return true;
}

function createLooprailRuntimeArticleStore(
  options: PersistLooprailArticleOptions = {},
): LooprailRuntimeArticleStore {
  if (options.runtimeDirectory) {
    return createFilesystemRuntimeArticleStore(options.runtimeDirectory);
  }

  const mode = storageMode();
  if (mode === "filesystem") {
    return createFilesystemRuntimeArticleStore(
      process.env[LOOPRAIL_RUNTIME_DIRECTORY_ENV]?.trim() ||
        RUNTIME_ARTICLES_DIRECTORY,
    );
  }

  if (shouldUseBlobRuntimeStore(process.env)) {
    return createBlobRuntimeArticleStore(process.env);
  }

  if (mode && mode !== "runtime") {
    throw new LooprailStorageError(
      `Unsupported ${LOOPRAIL_STORAGE_MODE_ENV} value "${mode}".`,
      503,
    );
  }

  return createFilesystemRuntimeArticleStore(
    process.env[LOOPRAIL_RUNTIME_DIRECTORY_ENV]?.trim() ||
      RUNTIME_ARTICLES_DIRECTORY,
  );
}

function runtimeArticlePathForSlug(directory: string, slug: string): string {
  const filePath = path.join(directory, `${slug}.json`);
  const relativePath = path.relative(directory, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new LooprailValidationError(["slug resolves outside runtime directory"]);
  }

  return filePath;
}

function indexEntryFromArticle(
  article: StoredLooprailArticle,
): StoredLooprailArticleIndexEntry {
  return compactObject({
    slug: article.slug,
    title: article.title,
    status: article.status,
    published: article.published,
    promoted: article.promoted,
    date: article.date,
    updatedAt: article.updatedAt,
  }) as StoredLooprailArticleIndexEntry;
}

function sortRuntimeIndex(entries: StoredLooprailArticleIndexEntry[]) {
  return entries.sort(
    (first, second) => {
      if (Boolean(first.promoted) !== Boolean(second.promoted)) {
        return first.promoted ? -1 : 1;
      }
      return (
        new Date(second.updatedAt ?? second.date).getTime() -
        new Date(first.updatedAt ?? first.date).getTime()
      );
    },
  );
}

function isStoredLooprailArticle(value: unknown): value is StoredLooprailArticle {
  return (
    isPlainObject(value) &&
    value.schemaVersion === 1 &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.date === "string" &&
    typeof value.author === "string" &&
    typeof value.content === "string" &&
    (value.status === "draft" || value.status === "published") &&
    typeof value.published === "boolean" &&
    Array.isArray(value.tags)
  );
}

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  if (!fs.existsSync(filePath)) return undefined;
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new LooprailStorageError(storageErrorMessage("read runtime JSON", error));
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new LooprailStorageError(
      storageErrorMessage("write runtime JSON", error),
    );
  }
}

function createFilesystemRuntimeArticleStore(
  directory: string,
): LooprailRuntimeArticleStore {
  const indexPath = path.join(directory, "index.json");

  async function readIndex() {
    return (await readJsonFile<StoredLooprailArticleIndexEntry[]>(indexPath)) ?? [];
  }

  async function writeIndex(entries: StoredLooprailArticleIndexEntry[]) {
    await writeJsonFile(indexPath, sortRuntimeIndex(entries));
  }

  async function readArticle(slug: string) {
    const article = await readJsonFile<StoredLooprailArticle>(
      runtimeArticlePathForSlug(directory, slug),
    );
    return isStoredLooprailArticle(article) ? article : undefined;
  }

  return {
    kind: "filesystem",
    read: readArticle,
    async readAll() {
      const index = await readIndex();
      const articles = await Promise.all(index.map((entry) => readArticle(entry.slug)));
      return articles.filter(
        (article): article is StoredLooprailArticle => Boolean(article),
      );
    },
    async write(article) {
      await writeJsonFile(runtimeArticlePathForSlug(directory, article.slug), article);
      const index = await readIndex();
      const nextIndex = [
        indexEntryFromArticle(article),
        ...index.filter((entry) => entry.slug !== article.slug),
      ];
      await writeIndex(nextIndex);
    },
    async delete(slug) {
      const filePath = runtimeArticlePathForSlug(directory, slug);
      if (fs.existsSync(filePath)) {
        await unlink(filePath).catch((error) => {
          throw new LooprailStorageError(
            storageErrorMessage("remove runtime article", error),
          );
        });
      }
      const index = await readIndex();
      await writeIndex(index.filter((entry) => entry.slug !== slug));
    },
  };
}

async function readBlobJson<T>(pathname: string): Promise<T | undefined> {
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return undefined;
    }
    const raw = await new Response(result.stream).text();
    if (!raw.trim()) return undefined;
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return undefined;
    }
    throw new LooprailStorageError(
      storageErrorMessage("read the Blob article store", error),
    );
  }
}

async function writeBlobJson(pathname: string, value: unknown) {
  try {
    await put(pathname, JSON.stringify(value, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
  } catch (error) {
    throw new LooprailStorageError(
      storageErrorMessage("write the Blob article store", error),
    );
  }
}

function createBlobRuntimeArticleStore(
  env: NodeJS.ProcessEnv,
): LooprailRuntimeArticleStore {
  if (!hasBlobRuntimeCredentials(env)) {
    throw new LooprailStorageError(
      [
        "Looprail CMS runtime storage is not configured for Vercel.",
        "Create/connect a private Vercel Blob store for this project so",
        `${BLOB_READ_WRITE_TOKEN_ENV} is available at runtime.`,
      ].join(" "),
      503,
    );
  }

  async function readIndex() {
    return (
      (await readBlobJson<StoredLooprailArticleIndexEntry[]>(BLOB_INDEX_PATH)) ?? []
    );
  }

  async function writeIndex(entries: StoredLooprailArticleIndexEntry[]) {
    await writeBlobJson(BLOB_INDEX_PATH, sortRuntimeIndex(entries));
  }

  function blobPathForSlug(slug: string) {
    return `${BLOB_ARTICLES_DIRECTORY}/${slug}.json`;
  }

  async function readArticle(slug: string) {
    const article = await readBlobJson<StoredLooprailArticle>(
      blobPathForSlug(slug),
    );
    return isStoredLooprailArticle(article) ? article : undefined;
  }

  return {
    kind: "vercel_blob",
    read: readArticle,
    async readAll() {
      const index = await readIndex();
      const articles = await Promise.all(index.map((entry) => readArticle(entry.slug)));
      return articles.filter(
        (article): article is StoredLooprailArticle => Boolean(article),
      );
    },
    async write(article) {
      await writeBlobJson(blobPathForSlug(article.slug), article);
      const index = await readIndex();
      const nextIndex = [
        indexEntryFromArticle(article),
        ...index.filter((entry) => entry.slug !== article.slug),
      ];
      await writeIndex(nextIndex);
    },
    async delete(slug) {
      try {
        await del(blobPathForSlug(slug));
      } catch (error) {
        throw new LooprailStorageError(
          storageErrorMessage("remove the Blob article", error),
        );
      }
      const index = await readIndex();
      await writeIndex(index.filter((entry) => entry.slug !== slug));
    },
  };
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
    featuredImage: article.featuredImage,
    featuredImageAlt: article.featuredImageAlt,
    published: status === "published",
    author: article.authorName,
    looprail: {
      id: article.slug,
      source: article.source,
      sourceActionIntentId: article.sourceActionIntentId,
      idempotencyKey: article.idempotencyKey,
      status,
      contentFormat: article.contentFormat,
      primaryKeyword: article.primaryKeyword,
      secondaryKeywords: article.secondaryKeywords,
      searchIntent: article.searchIntent,
      contentAngle: article.contentAngle,
      qualityEvaluation: article.qualityEvaluation,
      externalArticleId: article.externalArticleId,
      images: article.images,
      assets: article.assets,
    },
  }) as MatterData;
}

function buildStoredArticle(
  article: NormalizedLooprailArticle,
  status: LooprailArticleStatus,
  now: Date,
  existingArticle?: StoredLooprailArticle,
): StoredLooprailArticle {
  const today = formatDate(now);
  const description =
    article.excerpt ??
    article.metaDescription ??
    existingArticle?.description ??
    article.title;

  return compactObject({
    schemaVersion: 1,
    id: article.slug,
    slug: article.slug,
    status,
    published: status === "published",
    promoted: existingArticle?.promoted,
    title: article.title,
    description,
    metaDescription: article.metaDescription,
    date: existingArticle?.date ?? today,
    updatedAt: status === "published" ? today : existingArticle?.updatedAt,
    category: existingArticle?.category ?? deriveCategory(article),
    tags: deriveTags(article),
    featuredImage: article.featuredImage,
    featuredImageAlt: article.featuredImageAlt,
    author: article.authorName,
    content: `${article.content.trim()}\n`,
    contentFormat: article.contentFormat,
    looprail: {
      id: article.slug,
      source: article.source,
      sourceActionIntentId: article.sourceActionIntentId,
      idempotencyKey: article.idempotencyKey,
      status,
      contentFormat: article.contentFormat,
      primaryKeyword: article.primaryKeyword,
      secondaryKeywords: article.secondaryKeywords,
      searchIntent: article.searchIntent,
      contentAngle: article.contentAngle,
      qualityEvaluation: article.qualityEvaluation,
      externalArticleId: article.externalArticleId,
      images: article.images,
      assets: article.assets,
    },
  }) as StoredLooprailArticle;
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

function resultForArticle(input: {
  article: NormalizedLooprailArticle | StoredLooprailArticle;
  status: LooprailArticleStatus;
  storage: LooprailArticleResult["storage"];
  baseUrl: string;
  draftUrl?: string;
}): LooprailArticleResult {
  const publicUrl = buildLooprailArticleUrl(input.article.slug, input.baseUrl);

  if (input.status === "published") {
    return {
      id: input.article.slug,
      slug: input.article.slug,
      status: input.status,
      storage: input.storage,
      rendering_status: "public",
      visibility: "public",
      url: publicUrl,
      public_url: publicUrl,
    };
  }

  return {
    id: input.article.slug,
    slug: input.article.slug,
    status: input.status,
    storage: input.storage,
    rendering_status: "stored",
    visibility: "draft",
    ...(input.draftUrl ? { url: input.draftUrl, draft_url: input.draftUrl } : {}),
  };
}

async function persistLooprailRuntimeArticle(
  article: NormalizedLooprailArticle,
  status: LooprailArticleStatus,
  options: PersistLooprailArticleOptions,
): Promise<LooprailArticleResult> {
  const store = createLooprailRuntimeArticleStore(options);
  const now = options.now ?? new Date();
  const externalSlug = article.externalArticleId
    ? normalizeSlug(article.externalArticleId)
    : undefined;
  const existingArticle =
    (externalSlug && externalSlug !== article.slug
      ? await store.read(externalSlug)
      : undefined) ?? (await store.read(article.slug));
  const storedArticle = buildStoredArticle(article, status, now, existingArticle);

  await store.write(storedArticle);

  if (externalSlug && externalSlug !== article.slug) {
    await store.delete(externalSlug);
  }

  return resultForArticle({
    article: storedArticle,
    status,
    storage: store.kind,
    baseUrl: options.baseUrl ?? getLooprailPublicBaseUrl(),
  });
}

async function persistLooprailMdxArticle(
  article: NormalizedLooprailArticle,
  status: LooprailArticleStatus,
  options: PersistLooprailArticleOptions,
): Promise<LooprailArticleResult> {
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

  return resultForArticle({
    article,
    status,
    storage: storage.kind,
    baseUrl: options.baseUrl ?? getLooprailPublicBaseUrl(),
    draftUrl: status === "draft" ? buildLooprailDraftUrl(article.slug) : undefined,
  });
}

export async function persistLooprailArticle(
  payload: unknown,
  status: LooprailArticleStatus,
  options: PersistLooprailArticleOptions = {},
): Promise<LooprailArticleResult> {
  const article = validateLooprailArticle(payload, status);
  if (shouldPersistLegacyMdx(options)) {
    return persistLooprailMdxArticle(article, status, options);
  }
  return persistLooprailRuntimeArticle(article, status, options);
}

export async function readLooprailStoredArticles(
  options: PersistLooprailArticleOptions = {},
): Promise<StoredLooprailArticle[]> {
  if (!canReadRuntimeArticleStore(options)) {
    return [];
  }

  const store = createLooprailRuntimeArticleStore(options);
  return store.readAll();
}

export async function readLooprailStoredArticleBySlug(
  slug: string,
  options: PersistLooprailArticleOptions = {},
): Promise<StoredLooprailArticle | undefined> {
  if (!canReadRuntimeArticleStore(options)) {
    return undefined;
  }

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return undefined;
  }

  const store = createLooprailRuntimeArticleStore(options);
  return store.read(normalizedSlug);
}

export async function updateLooprailStoredArticle(
  slug: string,
  update: LooprailStoredArticleUpdate,
  options: PersistLooprailArticleOptions = {},
): Promise<StoredLooprailArticle> {
  if (!canReadRuntimeArticleStore(options)) {
    throw new LooprailStorageError("Looprail CMS runtime storage is not available.", 503);
  }

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    throw new LooprailValidationError(["slug must contain at least one letter or number"]);
  }

  const store = createLooprailRuntimeArticleStore(options);
  const current = await store.read(normalizedSlug);
  if (!current) {
    throw new LooprailValidationError(["article was not found"]);
  }

  const nextPublished =
    typeof update.published === "boolean" ? update.published : current.published;
  const nextStatus: LooprailArticleStatus = nextPublished ? "published" : "draft";
  const nextContentFormat = update.contentFormat ?? current.contentFormat;
  const next: StoredLooprailArticle = compactObject({
    ...current,
    status: nextStatus,
    published: nextPublished,
    promoted: Boolean(update.promoted ?? current.promoted),
    title: trimmedOr(update.title, current.title, MAX_TITLE_LENGTH),
    description: trimmedOr(update.description, current.description, MAX_SHORT_TEXT_LENGTH),
    metaDescription: hasOwn(update, "metaDescription")
      ? trimmedOptional(update.metaDescription, MAX_SHORT_TEXT_LENGTH)
      : current.metaDescription,
    date: validDateOr(update.date, current.date),
    updatedAt: formatDate(options.now ?? new Date()),
    category: trimmedOr(update.category, current.category, MAX_SHORT_TEXT_LENGTH),
    tags: Array.isArray(update.tags)
      ? uniqueStringArray(update.tags, 24, MAX_SHORT_TEXT_LENGTH)
      : current.tags,
    featuredImage: hasOwn(update, "featuredImage")
      ? trimmedOptional(update.featuredImage, MAX_URL_LENGTH)
      : current.featuredImage,
    featuredImageAlt: hasOwn(update, "featuredImageAlt")
      ? trimmedOptional(update.featuredImageAlt, MAX_SHORT_TEXT_LENGTH)
      : current.featuredImageAlt,
    author: trimmedOr(update.author, current.author, MAX_SHORT_TEXT_LENGTH),
    content:
      typeof update.content === "string" && update.content.trim()
        ? `${update.content.trim()}\n`
        : current.content,
    contentFormat: nextContentFormat,
    looprail: {
      ...current.looprail,
      status: nextStatus,
      contentFormat: nextContentFormat,
    },
  }) as StoredLooprailArticle;

  await store.write(next);
  return next;
}

export async function deleteLooprailStoredArticle(
  slug: string,
  options: PersistLooprailArticleOptions = {},
): Promise<void> {
  if (!canReadRuntimeArticleStore(options)) {
    throw new LooprailStorageError("Looprail CMS runtime storage is not available.", 503);
  }

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    throw new LooprailValidationError(["slug must contain at least one letter or number"]);
  }

  const store = createLooprailRuntimeArticleStore(options);
  await store.delete(normalizedSlug);
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
