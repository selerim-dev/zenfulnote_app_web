import type { Metadata } from "next";
import { BlogAdmin, type AdminBlogArticle } from "@/components/blog-admin";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ADMIN_PASSWORD_ENV, isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
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
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const configured = isAdminConfigured();
  const authenticated = configured ? await isAdminAuthenticated() : false;

  if (!configured) {
    return <AdminShell>{adminSetupState()}</AdminShell>;
  }

  if (!authenticated) {
    return <AdminShell>{loginForm(params.error)}</AdminShell>;
  }

  const articles = (await readLooprailStoredArticles()).map(adminArticleFromStored);

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf6] text-black">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              ZenfulNote Admin
            </p>
            <h1 className="editorial mt-2 text-4xl font-semibold leading-tight">
              Blog editor
            </h1>
          </div>
          <form action="/api/admin/session/logout" method="post">
            <button className="min-h-10 rounded-full border border-black/15 px-4 text-sm font-medium transition hover:border-black">
              Log out
            </button>
          </form>
        </div>
        <BlogAdmin initialArticles={articles} />
      </main>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <main className="grid flex-1 place-items-center px-4 py-16">{children}</main>
      <SiteFooter />
    </div>
  );
}

function loginForm(error?: string) {
  return (
    <section className="w-full max-w-md rounded-[18px] border border-black/10 bg-white p-6 shadow-[0_24px_100px_rgba(0,0,0,0.08)]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Admin
      </p>
      <h1 className="editorial mt-2 text-3xl font-semibold leading-tight">
        Blog login
      </h1>
      <form action="/api/admin/session" method="post" className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="min-h-12 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black"
          />
        </label>
        {error === "invalid" ? (
          <p className="text-sm text-[#b42324]">That password did not work.</p>
        ) : null}
        <button className="min-h-12 rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-black/82">
          Continue
        </button>
      </form>
    </section>
  );
}

function adminSetupState() {
  return (
    <section className="w-full max-w-lg rounded-[18px] border border-black/10 bg-white p-6 shadow-[0_24px_100px_rgba(0,0,0,0.08)]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Admin setup
      </p>
      <h1 className="editorial mt-2 text-3xl font-semibold leading-tight">
        Add an admin password
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Set <code>{ADMIN_PASSWORD_ENV}</code> in the deployment environment before
        using the blog editor.
      </p>
    </section>
  );
}

function adminArticleFromStored(article: {
  slug: string;
  status: "draft" | "published";
  published: boolean;
  promoted?: boolean;
  title: string;
  description: string;
  metaDescription?: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  featuredImage?: string;
  featuredImageAlt?: string;
  author: string;
  content: string;
  contentFormat: "markdown" | "html";
}): AdminBlogArticle {
  return {
    slug: article.slug,
    status: article.status,
    published: article.published,
    promoted: article.promoted,
    title: article.title,
    description: article.description,
    metaDescription: article.metaDescription,
    date: article.date,
    updatedAt: article.updatedAt,
    category: article.category,
    tags: article.tags,
    featuredImage: article.featuredImage,
    featuredImageAlt: article.featuredImageAlt,
    author: article.author,
    content: article.content,
    contentFormat: article.contentFormat,
  };
}
