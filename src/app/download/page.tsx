import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { DownloadRedirect } from "@/components/download-redirect";
import { ProductDeck } from "@/components/product-deck";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Download the Shadow Work Journal App",
  description:
    "Download ZenfulNote for guided shadow work journaling, trigger tracking, glimmer tracking, meditations, prompts, and private daily reflection.",
  alternates: {
    canonical: "/download",
  },
};

const storeLinks = [
  {
    label: "App Store",
    href: siteConfig.links.appStore,
    note: "For iPhone and iPad users who want to start in the App Store.",
  },
  {
    label: "Google Play",
    href: siteConfig.links.googlePlay,
    note: "For Android users who want to install ZenfulNote from Google Play.",
  },
];

const downloadBenefits = [
  "Track triggers and glimmers without turning a quick check-in into a long journal session.",
  "Use guided prompts when you want structure for shadow work, self-inquiry, and emotional awareness.",
  "Return to meditations, exercises, quizzes, and reflection tools in one private mobile space.",
  "Notice patterns over time so your reflections become easier to revisit and understand.",
] as const;

const downloadFaqs = [
  {
    question: "What happens on mobile?",
    answer:
      "Mobile visitors are routed to the right app store automatically. If the redirect does not open, use the store buttons on this page.",
  },
  {
    question: "What can I do after installing?",
    answer:
      "Start with a check-in, track a trigger or glimmer, choose a prompt, or open a meditation when you want a calmer entry point.",
  },
  {
    question: "Is ZenfulNote a replacement for therapy?",
    answer:
      "No. ZenfulNote is a journaling and reflection app. It is not a medical, mental health, diagnosis, treatment, or emergency service.",
  },
] as const;

export default function DownloadPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-black">
      <DownloadRedirect />
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-white/10 bg-black text-white">
          <Image
            src="/images/generated/brand-atmosphere-dark.png"
            alt=""
            width={1712}
            height={919}
            className="absolute inset-0 -z-10 size-full object-cover opacity-75"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 -z-10 bg-black/58" />
          <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:min-h-[calc(100svh-80px)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-10 lg:px-8">
            <div className="hero-copy-reveal max-w-xl">
              <div className="flex items-center gap-4">
                <Image
                  src="/images/brand/app-icon-1024.png"
                  alt="ZenfulNote app icon"
                  width={72}
                  height={72}
                  className="size-[72px] rounded-2xl shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
                  priority
                />
                <Image
                  src="/images/brand/wordmark-white-large.png"
                  alt="ZenfulNote"
                  width={210}
                  height={52}
                  className="h-9 w-auto"
                  priority
                />
              </div>
              <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
                Download ZenfulNote
              </p>
              <h1 className="editorial mt-4 text-4xl font-semibold leading-[1.06] text-white sm:text-5xl">
                Begin your reflection in the app.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/68 sm:text-lg">
                Mobile visitors are routed directly to the right store. Desktop
                visitors can choose below and install the app for guided shadow
                work, trigger tracking, glimmer tracking, and private
                reflection.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {storeLinks.map((link, index) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={
                      index === 0
                        ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/86"
                        : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:border-white/54"
                    }
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                    <ExternalLink
                      aria-hidden="true"
                      size={16}
                      strokeWidth={1.8}
                    />
                  </a>
                ))}
              </div>
            </div>

            <ProductDeck />
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#fbfaf6] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-9 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                What you get
              </p>
              <h2 className="editorial mt-4 text-3xl font-semibold leading-[1.08] text-black sm:text-4xl">
                A calmer place to check in, journal, and notice the pattern.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted">
                ZenfulNote brings everyday reflection into a mobile flow that is
                easy to return to. You can name what happened, track how it
                felt, and use gentle prompts when you want structure without
                pressure.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {downloadBenefits.map((benefit) => (
                <article
                  key={benefit}
                  className="rounded-lg border border-black/10 bg-white/78 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.05)]"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    size={22}
                    strokeWidth={1.8}
                    className="text-[#209d13]"
                  />
                  <p className="mt-4 text-sm leading-6 text-black/72">
                    {benefit}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Choose your store
              </p>
              <h2 className="editorial mt-4 text-3xl font-semibold leading-[1.08] text-black sm:text-4xl">
                Install ZenfulNote on your phone.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted">
                Use the store that matches your device. The same download page
                also works well when you share ZenfulNote from desktop to your
                phone.
              </p>
            </div>

            <div className="grid content-start gap-3">
              {storeLinks.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="group grid gap-3 rounded-lg border border-black/10 bg-[#fbfaf6] p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:grid-cols-[1fr_auto] sm:items-center"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>
                    <span className="text-lg font-semibold text-black">
                      {link.label}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted">
                      {link.note}
                    </span>
                  </span>
                  <span
                    className={
                      index === 0
                        ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
                        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium text-black"
                    }
                  >
                    Open
                    <ExternalLink
                      aria-hidden="true"
                      size={16}
                      strokeWidth={1.8}
                    />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#fbfaf6] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Download questions
              </p>
              <h2 className="editorial mt-4 text-3xl font-semibold leading-[1.08] text-black sm:text-4xl">
                A few notes before you open the app.
              </h2>
            </div>
            <div className="grid gap-3">
              {downloadFaqs.map((faq) => (
                <section
                  key={faq.question}
                  className="rounded-lg border border-black/10 bg-white/78 p-5"
                >
                  <h3 className="text-lg font-semibold text-black">
                    {faq.question}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {faq.answer}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
