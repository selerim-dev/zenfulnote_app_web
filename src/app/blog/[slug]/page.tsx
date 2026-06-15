import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { BlogImage } from "@/components/blog-image";
import { mdxComponents } from "@/components/mdx-components";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return (await getAllPosts()).map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  const seoDescription = post.metaDescription ?? post.description;

  return {
    title: post.title,
    description: seoDescription,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: seoDescription,
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
  const post = await getPostBySlug(slug);

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
            className="mb-8 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted transition hover:text-black sm:mb-10"
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
            <h1 className="editorial mt-5 text-[2.35rem] font-semibold leading-[1.06] text-black sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:mt-6 sm:text-lg sm:leading-8">
              {post.description}
            </p>
          </header>

          {post.featuredImage ? (
            <BlogImage
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
          <LeadMagnetCta leadMagnet={post.leadMagnet} />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function LeadMagnetCta({
  leadMagnet,
}: {
  leadMagnet: Record<string, unknown> | undefined;
}) {
  if (!leadMagnet) {
    return null;
  }

  const title = readText(leadMagnet.title);
  const href = safeLeadMagnetHref(leadMagnet.destination_url);

  if (!title || !href) {
    return null;
  }

  const description = readText(leadMagnet.description);
  const ctaLabel = readText(leadMagnet.cta_label) ?? "Open resource";
  const isExternal = /^https?:\/\//i.test(href);

  return (
    <aside className="mt-12 rounded-lg border border-black/10 bg-[#fbfaf6] p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
        Free resource
      </p>
      <h2 className="editorial mt-3 text-2xl font-semibold leading-tight text-black">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
          {description}
        </p>
      ) : null}
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#2d2d2d]"
      >
        {ctaLabel}
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
      </a>
    </aside>
  );
}

function readText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function safeLeadMagnetHref(value: unknown): string | undefined {
  const href = readText(value);
  if (!href) {
    return undefined;
  }

  if (href.startsWith("/")) {
    return href;
  }

  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
