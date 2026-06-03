import Link from "next/link";
import { ArrowRight, Smartphone } from "lucide-react";
import { siteConfig } from "@/config/site";

type AppDownloadLinksProps = {
  compact?: boolean;
  includeStores?: boolean;
  primaryLabel?: string;
  inverse?: boolean;
};

export function AppDownloadLinks({
  compact = false,
  includeStores = true,
  primaryLabel = "Download",
  inverse = false,
}: AppDownloadLinksProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link
        href="/download"
        className={
          inverse
            ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/88"
            : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#292929]"
        }
      >
        <Smartphone aria-hidden="true" size={18} strokeWidth={1.8} />
        {primaryLabel}
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
      </Link>
      {includeStores ? (
        <>
          <a
            href={siteConfig.links.appStore}
            className={
              inverse
                ? "inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-5 py-3 text-sm font-medium text-white transition hover:border-white"
                : "inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-5 py-3 text-sm font-medium text-black transition hover:border-black"
            }
            rel="noreferrer"
            target="_blank"
          >
            App Store
          </a>
          <a
            href={siteConfig.links.googlePlay}
            className={
              inverse
                ? "inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-5 py-3 text-sm font-medium text-white transition hover:border-white"
                : "inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-5 py-3 text-sm font-medium text-black transition hover:border-black"
            }
            rel="noreferrer"
            target="_blank"
          >
            Google Play
          </a>
        </>
      ) : null}
      {compact ? null : (
        <p
          className={
            inverse
              ? "max-w-sm text-sm leading-6 text-white/62"
              : "max-w-sm text-sm leading-6 text-muted"
          }
        >
          Routes mobile visitors directly to the App Store or Google Play.
          Desktop visitors can choose the right store.
        </p>
      )}
    </div>
  );
}
