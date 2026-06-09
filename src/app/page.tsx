import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { AppDownloadLinks } from "@/components/app-download-links";
import { HomeFeatureVisual } from "@/components/home-feature-visual";
import { ProductDeck } from "@/components/product-deck";
import { ReviewCarousel } from "@/components/review-carousel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { homeContent } from "@/config/home-content";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

const pointOrbImages = [
  "/images/app/orb-blue.png",
  "/images/app/orb-orange.png",
  "/images/app/orb-pink.png",
] as const;

export default async function Home() {
  const latestPosts = (await getAllPosts()).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-black">
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
          <div className="mx-auto grid w-full max-w-7xl items-center gap-7 px-5 py-7 sm:gap-8 sm:px-6 sm:py-10 lg:min-h-[calc(88svh-80px)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-10 lg:px-8">
            <div className="hero-copy-reveal max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                {homeContent.hero.eyebrow}
              </p>
              <h1 className="mt-4 sm:mt-5">
                <span className="sr-only">{homeContent.hero.title}</span>
                <Image
                  src="/images/brand/wordmark-white-large.png"
                  alt=""
                  width={920}
                  height={228}
                  className="h-auto w-full max-w-[520px]"
                  style={{ filter: "brightness(0)" }}
                  priority
                  sizes="(min-width: 640px) 520px, calc(100vw - 40px)"
                />
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

        <section className="relative z-[2] border-b border-black/10 bg-[#fbfaf6] px-4 pb-5 sm:px-6 lg:px-8">
          <div className="proof-ribbon mx-auto -mt-5 grid w-full max-w-7xl overflow-hidden rounded-[26px] border border-black/10 bg-white/72 shadow-[0_22px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl md:grid-cols-3">
            {homeContent.proofPoints.map((point, index) => (
              <div
                key={point}
                className="proof-tab-reveal flex min-h-[76px] items-center gap-3 px-4 py-3 md:border-l md:border-black/10 md:first:border-l-0 lg:px-6"
                style={{
                  animationDelay: `${index * 90}ms`,
                }}
              >
                <Image
                  src={pointOrbImages[index % pointOrbImages.length]}
                  alt=""
                  width={605}
                  height={605}
                  className="size-8 shrink-0 object-contain"
                  sizes="2rem"
                />
                <p className="max-w-[19rem] text-[0.88rem] leading-5 text-black/68 sm:text-sm sm:leading-6">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Product moments">
          {homeContent.moments.map((moment, index) => {
            const dark = index === 1;

            return (
              <section
                key={moment.title}
                className={`reveal-on-scroll border-b ${
                  dark
                    ? "border-white/10 bg-[#101010] text-white"
                    : index === 0
                      ? "border-black/10 bg-[#fbfaf6] text-black"
                      : "border-black/10 bg-white text-black"
                }`}
              >
                <div
                  className={`mx-auto grid min-h-[76svh] w-full max-w-7xl items-center gap-9 px-4 py-14 sm:px-6 lg:grid-cols-[0.84fr_1.16fr] lg:gap-16 lg:px-8 ${
                    index % 2 === 1 ? "lg:grid-cols-[1.12fr_0.88fr]" : ""
                  }`}
                >
                  <div
                    className={`max-w-md ${
                      index % 2 === 1 ? "lg:order-2" : ""
                    }`}
                    data-scroll-reveal
                  >
                    <p
                      className={`text-xs font-medium uppercase tracking-[0.18em] ${
                        dark ? "text-white/50" : "text-muted"
                      }`}
                    >
                      {moment.eyebrow}
                    </p>
                    <h2
                      className={`editorial mt-4 text-3xl font-semibold leading-[1.08] sm:text-4xl ${
                        dark ? "text-white" : "text-black"
                      }`}
                    >
                      {moment.title}
                    </h2>
                    <p
                      className={`mt-5 text-base leading-7 ${
                        dark ? "text-white/66" : "text-muted"
                      }`}
                    >
                      {moment.description}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2.5">
                      {moment.points.map((point, pointIndex) => (
                        <span
                          key={point}
                          className={`pop-on-scroll inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium ${
                            dark
                              ? "border-white/12 bg-white/8 text-white/74"
                              : "border-black/10 bg-white/72 text-black/74"
                          }`}
                          style={{
                            animationDelay: `${pointIndex * 80}ms`,
                          }}
                        >
                          <Image
                            src={
                              pointOrbImages[
                                pointIndex % pointOrbImages.length
                              ]
                            }
                            alt=""
                            width={605}
                            height={605}
                            className="size-4 shrink-0 object-contain"
                            sizes="1rem"
                          />
                          <span>{point}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className={index % 2 === 1 ? "lg:order-1" : ""}
                    data-scroll-reveal="visual"
                    style={{
                      animationDelay: "120ms",
                    }}
                  >
                    <HomeFeatureVisual
                      variant={moment.visual}
                      image={moment.image}
                      imageAlt={moment.imageAlt}
                      dark={dark}
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </section>

        <ReviewCarousel />

        <section className="paper-surface reveal-on-scroll relative isolate overflow-hidden border-b border-black/10">
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
            <div className="max-w-md" data-scroll-reveal>
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
              {latestPosts.map((post, index) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="pop-on-scroll group grid gap-3 rounded-lg border border-black/10 bg-white/70 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:grid-cols-[1fr_auto]"
                  style={{
                    animationDelay: `${index * 80}ms`,
                  }}
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

        <section className="reveal-on-scroll relative isolate overflow-hidden bg-black px-4 py-16 text-white sm:px-6 lg:px-8">
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
            <div data-scroll-reveal>
              <Image
                src="/images/brand/wordmark-white-large.png"
                alt="ZenfulNote"
                width={210}
                height={52}
                className="h-7 w-auto"
              />
              <h2 className="editorial mt-3 max-w-2xl text-3xl font-semibold leading-[1.1] sm:text-4xl">
                Begin with one honest check-in.
              </h2>
            </div>
            <div
              data-scroll-reveal
              style={{
                animationDelay: "120ms",
              }}
            >
              <AppDownloadLinks compact includeStores={false} inverse />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
