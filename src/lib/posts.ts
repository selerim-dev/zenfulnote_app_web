import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  featuredImage?: string;
  featuredImageAlt?: string;
  published: boolean;
  author: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
  readingTime: string;
};

const postsDirectory = path.join(process.cwd(), "content", "blog");

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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

  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    updatedAt:
      typeof data.updatedAt === "string" && data.updatedAt
        ? data.updatedAt
        : undefined,
    category: data.category,
    tags: data.tags,
    featuredImage:
      typeof data.featuredImage === "string" ? data.featuredImage : undefined,
    featuredImageAlt:
      typeof data.featuredImageAlt === "string"
        ? data.featuredImageAlt
        : undefined,
    published: data.published,
    author: data.author,
    content,
    readingTime: readTime(content),
  };
}

export const getAllPosts = cache(() => {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const posts = fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map(normalizePost)
    .filter((post) => post.published)
    .sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime(),
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

export const getPostBySlug = cache((slug: string) => {
  return getAllPosts().find((post) => post.slug === slug);
});

export function getAllCategories() {
  return Array.from(new Set(getAllPosts().map((post) => post.category))).sort();
}
