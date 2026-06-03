import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/86 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="ZenfulNote home"
          className="flex items-center gap-3"
        >
          <Image
            src="/images/brand/app-icon-1024.png"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-lg"
            priority
          />
          <Image
            src="/images/brand/wordmark-white-large.png"
            alt=""
            width={160}
            height={40}
            className="h-7 w-auto invert"
            priority
          />
          <span className="sr-only">ZenfulNote</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 md:flex"
        >
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-black/68 transition hover:text-black"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/download"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-[#292929]"
        >
          Download
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </div>
    </header>
  );
}
