import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { normalizeRenderableBlogImageSrc } from "./blog-images.ts";
import {
  readLooprailStoredArticles,
  type LooprailLeadMagnet,
  type StoredLooprailArticle,
} from "@/lib/looprail-cms";

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  metaDescription?: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  promoted?: boolean;
  featuredImage?: string;
  featuredImageAlt?: string;
  published: boolean;
  author: string;
  leadMagnet?: LooprailLeadMagnet;
};

export type BlogPost = BlogPostMeta & {
  content: string;
  readingTime: string;
};

const postsDirectory = path.join(process.cwd(), "content", "blog");

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function readLeadMagnet(value: unknown): LooprailLeadMagnet | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  return value as LooprailLeadMagnet;
}

function readTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min read`;
}

function normalizePost(fileName: string): BlogPost {
  const filePath = path.join(postsDirectory, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = fileName.replace(/\.mdx$/, "");

  const requiredStrings = ["title", "description", "date", "category"];
  for (const key of requiredStrings) {
    if (typeof data[key] !== "string" || !data[key]) {
      throw new Error(`Blog post ${fileName} is missing string field "${key}"`);
    }
  }

  if (typeof data.author !== "string" || !data.author) {
    throw new Error(`Blog post ${fileName} must include a string author field`);
  }

  if (typeof data.published !== "boolean") {
    throw new Error(`Blog post ${fileName} must include a boolean published field`);
  }

  if (!isStringArray(data.tags)) {
    throw new Error(`Blog post ${fileName} must include a tags array`);
  }

  if (
    data.featuredImage &&
    typeof data.featuredImage === "string" &&
    !data.featuredImageAlt
  ) {
    throw new Error(
      `Blog post ${fileName} must include featuredImageAlt for featuredImage`,
    );
  }

  const featuredImage = normalizeRenderableBlogImageSrc(data.featuredImage);

  return {
    slug,
    title: data.title,
    description: data.description,
    metaDescription:
      typeof data.metaDescription === "string" && data.metaDescription
        ? data.metaDescription
        : undefined,
    date: data.date,
    updatedAt:
      typeof data.updatedAt === "string" && data.updatedAt
        ? data.updatedAt
        : undefined,
    category: data.category,
    tags: data.tags,
    promoted: data.promoted === true,
    featuredImage,
    featuredImageAlt:
      featuredImage && typeof data.featuredImageAlt === "string"
        ? data.featuredImageAlt
        : undefined,
    published: data.published,
    author: data.author,
    leadMagnet: readLeadMagnet(
      isPlainObject(data.looprail) ? data.looprail.leadMagnet : undefined,
    ),
    content,
    readingTime: readTime(content),
  };
}

function normalizeStoredPost(article: StoredLooprailArticle): BlogPost {
  const featuredImage = normalizeRenderableBlogImageSrc(article.featuredImage);

  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    metaDescription: article.metaDescription,
    date: article.date,
    updatedAt: article.updatedAt,
    category: article.category,
    tags: article.tags,
    promoted: article.promoted,
    featuredImage,
    featuredImageAlt: featuredImage ? article.featuredImageAlt : undefined,
    published: article.published,
    author: article.author,
    leadMagnet: article.looprail.leadMagnet,
    content: article.content,
    readingTime: readTime(article.content),
  };
}

function getStaticPosts() {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map(normalizePost)
    .filter((post) => post.published);
}

export const getAllPosts = cache(async () => {
  const postsBySlug = new Map<string, BlogPost>();
  for (const post of getStaticPosts()) {
    postsBySlug.set(post.slug, post);
  }

  const runtimePosts = (await readLooprailStoredArticles())
    .filter((article) => article.published)
    .map(normalizeStoredPost);
  for (const post of runtimePosts) {
    postsBySlug.set(post.slug, post);
  }

  const posts = Array.from(postsBySlug.values()).sort(
    (first, second) => {
      if (Boolean(first.promoted) !== Boolean(second.promoted)) {
        return first.promoted ? -1 : 1;
      }
      return new Date(second.date).getTime() - new Date(first.date).getTime();
    },
  );

  const slugs = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug)) {
      throw new Error(`Duplicate blog slug: ${post.slug}`);
    }

    slugs.add(post.slug);
  }

  return posts;
});

export const getPostBySlug = cache(async (slug: string) => {
  return (await getAllPosts()).find((post) => post.slug === slug);
});

export async function getAllCategories() {
  return Array.from(
    new Set((await getAllPosts()).map((post) => post.category)),
  ).sort();
}
