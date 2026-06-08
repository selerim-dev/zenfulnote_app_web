import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminConsole } from "@/components/admin-console";
import { ADMIN_PASSWORD_ENV, isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { fallbackGrowthDashboard } from "@/lib/growth-dashboard";
import { readLooprailStoredArticles } from "@/lib/looprail-cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    growth_audit?: string;
    growth_error?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const configured = isAdminConfigured();
  const authenticated = configured ? await isAdminAuthenticated() : false;

  if (!configured) {
    return <AdminAuthFrame>{adminSetupState()}</AdminAuthFrame>;
  }

  if (!authenticated) {
    return <AdminAuthFrame>{loginForm(params.error)}</AdminAuthFrame>;
  }

  const articles = await readLooprailStoredArticles().then((items) => items.map((article) => ({
    ...article,
    status: article.published ? "published" as const : "draft" as const,
  })));

  const initialNotice = params.growth_audit
    ? {
        tone: params.growth_audit === "complete" ? "success" as const : "danger" as const,
        message:
          params.growth_audit === "complete"
            ? "Lifecycle audit completed. The dashboard has fresh automation data."
            : params.growth_error ?? "Lifecycle audit failed.",
      }
    : null;

  return (
    <AdminConsole
      articles={articles}
      dashboard={fallbackGrowthDashboard("Loading ZenfulNote growth data.")}
      dashboardInitiallyLoaded={false}
      initialNotice={initialNotice}
    />
  );
}

function AdminAuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate grid min-h-dvh overflow-hidden bg-[#f7f2f9] p-4 text-black sm:p-6">
      <Image
        src="/images/generated/brand-atmosphere-light.png"
        alt=""
        fill
        className="absolute inset-0 -z-20 object-cover opacity-80"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_16%,rgba(80,104,231,0.20),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(234,111,207,0.16),transparent_30%),linear-gradient(180deg,rgba(251,250,246,0.66),rgba(251,250,246,0.86))]" />
      <section className="mx-auto grid w-full max-w-6xl items-center gap-5 self-center lg:grid-cols-[minmax(0,0.85fr)_420px]">
        <div className="hidden min-h-[520px] overflow-hidden rounded-lg border border-white/30 bg-black text-white shadow-[0_34px_120px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] lg:block">
          <div className="relative h-full p-8">
            <Image
              src="/images/generated/brand-atmosphere-dark.png"
              alt=""
              fill
              className="object-cover opacity-78"
              priority
              sizes="60vw"
            />
            <div className="absolute inset-0 bg-black/26" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/brand/app-icon-1024.png"
                  alt=""
                  width={42}
                  height={42}
                  className="size-10 rounded-lg border border-white/20"
                  priority
                />
                <span className="text-sm font-medium text-white/86">ZenfulNote Admin</span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/68">
                  Growth console
                </p>
                <h1 className="mt-3 max-w-xl text-5xl font-semibold leading-none tracking-tight text-white">
                  Retention, lifecycle, and content in one place.
                </h1>
              </div>
            </div>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function loginForm(error?: string) {
  return (
    <section className="w-full rounded-lg border border-white/60 bg-white/[0.56] p-5 shadow-[0_28px_95px_rgba(80,104,231,0.16),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-2xl sm:p-6">
      <div className="flex items-center gap-3 border-b border-white/60 pb-5">
        <Image
          src="/images/brand/logotype-dark.png"
          alt="ZenfulNote"
          width={132}
          height={30}
          className="h-auto w-32 [filter:brightness(0)]"
          priority
        />
        <span className="rounded-full border border-white/60 bg-white/46 px-3 py-1 text-xs font-semibold text-black/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          Admin
        </span>
      </div>
      <form action="/api/admin/session" method="post" className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/58">
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="min-h-12 rounded-lg border border-white/70 bg-white/58 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-black/35 focus:border-[#5068e7] focus:bg-white/78"
            placeholder="Enter admin password"
          />
        </label>
        {error === "invalid" ? (
          <p className="rounded-lg border border-[#f7c9c9] bg-[#fff3f3] px-3 py-2 text-sm font-medium text-[#9f1f20]">
            That password did not work.
          </p>
        ) : null}
        <button className="min-h-12 rounded-full bg-black px-5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(0,0,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#292929] hover:shadow-[0_22px_58px_rgba(0,0,0,0.28)]">
          Sign in
        </button>
      </form>
    </section>
  );
}

function adminSetupState() {
  return (
    <section className="w-full rounded-lg border border-white/60 bg-white/[0.58] p-6 shadow-[0_28px_95px_rgba(80,104,231,0.16),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/58">
        Admin setup
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">
        Add an admin password
      </h1>
      <p className="mt-4 text-sm leading-6 text-black/66">
        Set <code className="rounded bg-black/[0.06] px-1.5 py-0.5">{ADMIN_PASSWORD_ENV}</code> in the deployment environment before using the admin panel.
      </p>
    </section>
  );
}
