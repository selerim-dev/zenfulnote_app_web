import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      images: post.featuredImage
        ? [
            {
              url: post.featuredImage,
              alt: post.featuredImageAlt,
            },
          ]
        : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-black"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
            Blog
          </Link>
          <header>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
              <span>{post.category}</span>
              <span aria-hidden="true">/</span>
              <time dateTime={post.date}>
                {new Intl.DateTimeFormat("en", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(post.date))}
              </time>
              <span aria-hidden="true">/</span>
              <span>{post.readingTime}</span>
            </div>
            <h1 className="editorial mt-5 text-4xl font-semibold leading-[1.06] text-black sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              {post.description}
            </p>
          </header>

          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.featuredImageAlt ?? ""}
              width={1200}
              height={760}
              priority
              className="mt-10 rounded-lg border border-black/10 object-cover"
            />
          ) : null}

          <div className="article-content mt-12">
            <MDXRemote source={post.content} components={mdxComponents} />
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
