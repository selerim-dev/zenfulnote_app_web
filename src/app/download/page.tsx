import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { DownloadRedirect } from "@/components/download-redirect";
import { ProductDeck } from "@/components/product-deck";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download ZenfulNote from the App Store or Google Play.",
  alternates: {
    canonical: "/download",
  },
};

const storeLinks = [
  {
    label: "App Store",
    href: siteConfig.links.appStore,
  },
  {
    label: "Google Play",
    href: siteConfig.links.googlePlay,
  },
];

export default function DownloadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
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
            <div className="max-w-xl">
              <div className="flex items-center gap-4">
                <Image
                  src="/images/brand/app-icon-1024.png"
                  alt=""
                  width={72}
                  height={72}
                  className="size-[72px] rounded-2xl shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
                  priority
                />
                <Image
                  src="/images/brand/wordmark-white-large.png"
                  alt=""
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
                Mobile visitors are routed directly to the right store.
                Desktop visitors can choose below.
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

        <section className="border-b border-black/10 bg-black px-4 py-10 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
            {[
              "Official App Store and Google Play links",
              "No old website handoff on the download path",
              "Built for check-ins, journaling, and reflection",
            ].map((item) => (
              <p key={item} className="text-sm leading-6 text-white/68">
                {item}
              </p>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
