import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <main className="flex flex-1 items-center px-4 py-20 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase text-muted">404</p>
          <h1 className="editorial mt-4 text-5xl font-semibold leading-[1.05] sm:text-6xl">
            This page is not here.
          </h1>
          <p className="mt-5 text-base leading-7 text-muted">
            The link may have moved, or the page may not exist in the new
            ZenfulNote site.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#292929]"
          >
            <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
            Back home
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
