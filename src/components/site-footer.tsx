import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { siteConfig } from "@/config/site";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Download", href: "/download" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-and-conditions" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#101010] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/brand/app-icon-1024.png"
              alt=""
              width={42}
              height={42}
              className="size-[42px] rounded-lg"
            />
            <Image
              src="/images/brand/wordmark-white-large.png"
              alt=""
              width={170}
              height={42}
              className="h-7 w-auto"
            />
            <span className="sr-only">ZenfulNote</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">
            The official shadow work journaling app for emotional awareness,
            guided reflection, and a deeper relationship with your inner world.
          </p>
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="mt-5 inline-flex items-center gap-2 text-sm text-white/78 transition hover:text-white"
          >
            <Mail aria-hidden="true" size={17} strokeWidth={1.8} />
            {siteConfig.supportEmail}
          </a>
        </div>
        <nav aria-label="Footer navigation" className="grid gap-3">
          <p className="text-sm font-medium text-white">Site</p>
          {footerLinks.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className="text-sm text-white/68 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div>
          <p className="text-sm font-medium text-white">Connect</p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={siteConfig.links.instagram}
              aria-label="ZenfulNote on Instagram"
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 transition hover:border-white"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                src="/images/brand/instagram.png"
                alt=""
                width={22}
                height={22}
              />
            </a>
            <a
              href={siteConfig.links.tiktok}
              aria-label="ZenfulNote on TikTok"
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 transition hover:border-white"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                src="/images/brand/tiktok.png"
                alt=""
                width={22}
                height={22}
              />
            </a>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-white/68">
            <a href={siteConfig.links.appStore} rel="noreferrer" target="_blank">
              App Store
            </a>
            <a
              href={siteConfig.links.googlePlay}
              rel="noreferrer"
              target="_blank"
            >
              Google Play
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/48">
        © {new Date().getFullYear()} ZenfulNote. All rights reserved.
      </div>
    </footer>
  );
}
