import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { AppDownloadLinks } from "@/components/app-download-links";
import { ProductDeck } from "@/components/product-deck";
import { ProductScreenshot } from "@/components/product-screenshot";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { homeContent } from "@/config/home-content";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const latestPosts = (await getAllPosts()).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-black/10 bg-[#fbfaf6]">
          <div className="atmosphere-media absolute inset-0 -z-10">
            <Image
              src="/images/generated/brand-atmosphere-light.png"
              alt=""
              width={1717}
              height={916}
              className="absolute inset-0 size-full object-cover object-center opacity-95"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-white/50" />
          </div>
          <div className="mx-auto grid w-full max-w-7xl items-center gap-7 px-5 py-7 sm:gap-8 sm:px-6 sm:py-10 lg:min-h-[calc(100svh-80px)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-10 lg:px-8">
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                {homeContent.hero.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-medium leading-[1] text-black sm:mt-5 sm:text-6xl sm:leading-[0.98]">
                {homeContent.hero.title}
              </h1>
              <p className="mt-4 max-w-lg text-[0.95rem] leading-6 text-muted sm:mt-5 sm:text-lg sm:leading-7">
                {homeContent.hero.description}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
                <AppDownloadLinks compact includeStores={false} />
                <Link
                  href="/blog"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-3 text-sm font-medium transition hover:border-black sm:w-auto"
                >
                  <BookOpen aria-hidden="true" size={18} strokeWidth={1.8} />
                  Read
                  <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
                </Link>
              </div>
            </div>
            <ProductDeck />
          </div>
        </section>

        <section className="border-b border-black/10 bg-white sm:bg-[#f6f4ef]">
          <div className="mx-auto grid w-full max-w-xl divide-y divide-black/10 px-5 sm:max-w-7xl sm:gap-px sm:divide-y-0 sm:bg-black/10 sm:px-6 lg:grid-cols-3 lg:px-8">
            {homeContent.proofPoints.map((point) => (
              <div
                key={point}
                className="bg-transparent py-4 backdrop-blur-sm sm:bg-white/78 sm:px-5 sm:py-6 lg:px-8"
              >
                <p className="max-w-sm text-[0.88rem] leading-5 text-black/68 sm:text-sm sm:leading-6">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Product moments">
          {homeContent.moments.map((moment, index) => (
            <section
              key={moment.title}
              className="reveal-on-scroll border-b border-black/10"
            >
              <div
                className={`mx-auto grid min-h-[74svh] w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:px-8 ${
                  index % 2 === 1 ? "lg:grid-cols-[1.14fr_0.86fr]" : ""
                }`}
              >
                <div
                  className={`max-w-md ${
                    index % 2 === 1 ? "lg:order-2" : ""
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                    {moment.eyebrow}
                  </p>
                  <h2 className="editorial mt-4 text-3xl font-semibold leading-[1.08] text-black sm:text-4xl">
                    {moment.title}
                  </h2>
                  <p className="mt-5 text-base leading-7 text-muted">
                    {moment.description}
                  </p>
                  <div className="mt-7 grid gap-2">
                    {moment.points.map((point, pointIndex) => (
                      <div
                        key={point}
                        className="pop-on-scroll flex items-center justify-between border-b border-black/10 py-3 text-sm text-black/76"
                        style={{
                          animationDelay: `${pointIndex * 90}ms`,
                        }}
                      >
                        <span>{point}</span>
                        <ArrowRight
                          aria-hidden="true"
                          size={15}
                          strokeWidth={1.8}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="feature-stage relative grid min-h-[360px] place-items-center overflow-hidden rounded-[22px] border border-black/10 bg-[#fbfaf6] p-4 shadow-[0_28px_120px_rgba(0,0,0,0.08)] sm:min-h-[480px] sm:rounded-[28px] sm:p-8">
                    <Image
                      src={
                        index === 1
                          ? "/images/generated/brand-atmosphere-dark.png"
                          : "/images/generated/brand-atmosphere-editorial.png"
                      }
                      alt=""
                      width={1717}
                      height={916}
                      className={`object-cover ${
                        index === 1 ? "opacity-80" : "opacity-[0.64]"
                      } absolute inset-0 size-full`}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes="(min-width: 1024px) 52vw, 100vw"
                    />
                    <div
                      className={`absolute inset-0 ${
                        index === 1 ? "bg-black/42" : "bg-white/32"
                      }`}
                    />
                    <ProductScreenshot
                      src={moment.image}
                      alt={moment.imageAlt}
                      priority={index <= 1}
                      className="relative z-[1] lg:max-w-[340px]"
                    />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </section>

        <section className="paper-surface relative isolate overflow-hidden border-b border-black/10">
          <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[46%] lg:block">
            <Image
              src="/images/generated/brand-atmosphere-editorial.png"
              alt=""
              width={1200}
              height={900}
              className="absolute inset-0 size-full object-cover opacity-[0.72]"
              sizes="46vw"
            />
            <div className="absolute inset-0 bg-white/42" />
          </div>
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.74fr_1.26fr] lg:px-8">
            <div className="max-w-md">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                {homeContent.blog.eyebrow}
              </p>
              <h2 className="editorial mt-4 text-3xl font-semibold leading-[1.08] text-black sm:text-4xl">
                {homeContent.blog.title}
              </h2>
              <p className="mt-5 text-base leading-7 text-muted">
                {homeContent.blog.description}
              </p>
              <Link
                href="/blog"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#292929]"
              >
                Read the blog
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              </Link>
            </div>

            <div className="grid content-center gap-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group grid gap-3 rounded-lg border border-black/10 bg-white/70 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                      {post.category} / {post.readingTime}
                    </p>
                    <h3 className="mt-2 text-xl font-medium text-black">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                      {post.description}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.8}
                    className="self-center transition group-hover:translate-x-1"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-black px-4 py-16 text-white sm:px-6 lg:px-8">
          <Image
            src="/images/generated/brand-atmosphere-dark.png"
            alt=""
            width={1712}
            height={919}
            className="absolute inset-0 -z-10 size-full object-cover opacity-[0.58]"
            sizes="100vw"
          />
          <div className="absolute inset-0 -z-10 bg-black/58" />
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-white/56">ZenfulNote</p>
              <h2 className="editorial mt-3 max-w-2xl text-3xl font-semibold leading-[1.1] sm:text-4xl">
                Begin with one honest check-in.
              </h2>
            </div>
            <AppDownloadLinks compact includeStores={false} inverse />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
