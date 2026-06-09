import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogImage } from "@/components/blog-image";
import { BlogFilterGrid } from "@/components/blog-filter-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllCategories, getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "ZenfulNote writing on journaling, emotional awareness, shadow work, glimmers, triggers, and self-discovery.",
  alternates: {
    canonical: "/blog",
  },
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getAllPosts();
  const categories = await getAllCategories();
  const featured = posts[0];
  const featuredImage = featured?.featuredImage;
  const featuredHasImage = Boolean(featuredImage);

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-black/10 bg-[#fbfaf6]">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <Image
              src="/images/generated/brand-atmosphere-light.png"
              alt=""
              width={1717}
              height={916}
              className="absolute inset-0 size-full object-cover object-center opacity-75"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-white/62" />
          </div>
          <div className="mx-auto grid w-full max-w-7xl items-end gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                ZenfulNote Blog
              </p>
              <h1 className="editorial mt-4 text-4xl font-semibold leading-[1.06] text-black sm:text-5xl">
                Writing for the inner work between app sessions.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Depth notes on check-ins, shadow work, glimmers, triggers,
                guided prompts, and the practice of understanding yourself.
              </p>
            </div>
            <div className="relative hidden min-h-[260px] overflow-hidden rounded-[28px] border border-black/10 bg-white/72 shadow-[0_24px_100px_rgba(0,0,0,0.08)] backdrop-blur-sm lg:block">
              <Image
                src="/images/generated/brand-atmosphere-editorial.png"
                alt=""
                width={1200}
                height={900}
                className="absolute inset-0 size-full object-cover"
                priority
                sizes="360px"
              />
              <div className="absolute inset-0 bg-white/22" />
              <Image
                src="/images/brand/main-logo.png"
                alt=""
                width={78}
                height={78}
                className="absolute right-6 top-6 size-[78px] object-contain opacity-[0.82]"
                priority
              />
            </div>
          </div>
        </section>

        {featured ? (
          <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Link
              href={`/blog/${featured.slug}`}
              className={[
                "group grid overflow-hidden rounded-[18px] border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_24px_90px_rgba(0,0,0,0.10)]",
                featuredHasImage
                  ? "lg:grid-cols-[0.92fr_1.08fr]"
                  : "lg:max-w-3xl",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {featuredImage ? (
                <div className="relative min-h-[320px] border-b border-black/10 bg-[#f8f6ef] lg:border-b-0 lg:border-r">
                  <Image
                    src="/images/generated/brand-atmosphere-editorial.png"
                    alt=""
                    width={1200}
                    height={900}
                    className="absolute inset-0 size-full object-cover opacity-40"
                    sizes="(min-width: 1024px) 46vw, 100vw"
                  />
                  <BlogImage
                    src={featuredImage}
                    alt={featured.featuredImageAlt ?? ""}
                    fill
                    className="object-contain p-8"
                    priority
                    sizes="(min-width: 1024px) 46vw, 100vw"
                  />
                </div>
              ) : null}
              <div className="grid content-center p-6 sm:p-8 lg:p-10">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  Featured / {featured.readingTime}
                </p>
                <h2
                  className={[
                    "editorial mt-4 text-3xl font-semibold leading-[1.08] text-black sm:text-4xl",
                    featuredHasImage ? "max-w-xl" : "max-w-2xl",
                  ].join(" ")}
                >
                  {featured.title}
                </h2>
                <p
                  className={[
                    "mt-5 text-base leading-7 text-muted",
                    featuredHasImage ? "max-w-lg" : "max-w-2xl",
                  ].join(" ")}
                >
                  {featured.description}
                </p>
                <div className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-black">
                  Read essay
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.8}
                    className="transition group-hover:translate-x-1"
                  />
                </div>
              </div>
            </Link>
          </section>
        ) : null}

        <BlogFilterGrid
          categories={categories}
          posts={posts}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
