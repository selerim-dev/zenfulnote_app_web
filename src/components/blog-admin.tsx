"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type AdminBlogArticle = {
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
};

type BlogAdminProps = {
  initialArticles: AdminBlogArticle[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function BlogAdmin({ initialArticles }: BlogAdminProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [selectedSlug, setSelectedSlug] = useState(initialArticles[0]?.slug ?? "");
  const selected = articles.find((article) => article.slug === selectedSlug) ?? null;
  const [draft, setDraft] = useState(() => formFromArticle(selected));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const sortedArticles = useMemo(
    () =>
      [...articles].sort((first, second) => {
        if (Boolean(first.promoted) !== Boolean(second.promoted)) {
          return first.promoted ? -1 : 1;
        }
        return (
          new Date(second.updatedAt ?? second.date).getTime() -
          new Date(first.updatedAt ?? first.date).getTime()
        );
      }),
    [articles],
  );

  function selectArticle(article: AdminBlogArticle) {
    setSelectedSlug(article.slug);
    setDraft(formFromArticle(article));
    setSaveState("idle");
    setMessage("");
  }

  function updateDraft<Key extends keyof ArticleForm>(
    key: Key,
    value: ArticleForm[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setMessage("");
  }

  async function saveArticle() {
    if (!selected) return;
    setSaveState("saving");
    setMessage("");

    const response = await fetch(`/api/admin/articles/${selected.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromForm(draft)),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setSaveState("error");
      setMessage(body?.error ?? "Article could not be saved.");
      return;
    }

    const article = body?.article as AdminBlogArticle | undefined;
    if (!article) {
      setSaveState("error");
      setMessage("Article was saved, but the response was incomplete.");
      return;
    }

    setArticles((current) =>
      current.map((item) => (item.slug === article.slug ? article : item)),
    );
    setSelectedSlug(article.slug);
    setDraft(formFromArticle(article));
    setSaveState("saved");
    setMessage("Saved.");
  }

  async function deleteArticle() {
    if (!selected) return;
    const confirmed = window.confirm(`Delete "${selected.title}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/articles/${selected.slug}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSaveState("error");
      setMessage(body?.error ?? "Article could not be deleted.");
      return;
    }

    const nextArticles = articles.filter((article) => article.slug !== selected.slug);
    setArticles(nextArticles);
    const nextSelected = nextArticles[0] ?? null;
    setSelectedSlug(nextSelected?.slug ?? "");
    setDraft(formFromArticle(nextSelected));
    setSaveState("idle");
    setMessage("Deleted.");
  }

  return (
    <div className="grid min-h-[calc(100dvh-12rem)] overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_24px_100px_rgba(0,0,0,0.08)] lg:grid-cols-[360px_1fr]">
      <aside className="border-b border-black/10 bg-[#f8f6ef] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 p-4">
          <div>
            <h2 className="text-sm font-semibold text-black">Runtime Articles</h2>
            <p className="mt-1 text-xs text-muted">{articles.length} editable</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-10 rounded-full border border-black/15 px-3 text-xs font-medium transition hover:border-black"
          >
            Refresh
          </button>
        </div>
        <div className="max-h-[calc(100dvh-17rem)] overflow-y-auto p-3">
          {sortedArticles.length ? (
            <div className="grid gap-2">
              {sortedArticles.map((article) => (
                <button
                  key={article.slug}
                  type="button"
                  onClick={() => selectArticle(article)}
                  className={[
                    "rounded-lg border p-3 text-left transition",
                    selectedSlug === article.slug
                      ? "border-black bg-white shadow-sm"
                      : "border-black/10 bg-white/62 hover:border-black/30",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="line-clamp-2 text-sm font-medium text-black">
                      {article.title}
                    </span>
                    {article.promoted ? (
                      <span className="shrink-0 rounded-full bg-black px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white">
                        Promoted
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                    <span>{article.published ? "Published" : "Draft"}</span>
                    <span>/</span>
                    <span>{article.category}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="p-3 text-sm leading-6 text-muted">
              No Looprail runtime articles are stored yet.
            </p>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        {selected ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  /blog/{selected.slug}
                </p>
                <h1 className="mt-1 truncate text-xl font-semibold text-black">
                  {selected.title}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.published ? (
                  <Link
                    href={`/blog/${selected.slug}`}
                    target="_blank"
                    className="inline-flex min-h-10 items-center rounded-full border border-black/15 px-4 text-sm font-medium transition hover:border-black"
                  >
                    View
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={deleteArticle}
                  className="min-h-10 rounded-full border border-[#f45253]/40 px-4 text-sm font-medium text-[#b42324] transition hover:border-[#b42324]"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={saveArticle}
                  disabled={saveState === "saving"}
                  className="min-h-10 rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-black/82 disabled:opacity-55"
                >
                  {saveState === "saving" ? "Saving" : "Save"}
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid content-start gap-4">
                <Field label="Title">
                  <input
                    value={draft.title}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      updateDraft("description", event.target.value)
                    }
                    className="min-h-24 w-full rounded-lg border border-black/10 bg-white p-3 text-sm leading-6 outline-none transition focus:border-black"
                  />
                </Field>
                <Field label="Meta description">
                  <textarea
                    value={draft.metaDescription}
                    onChange={(event) =>
                      updateDraft("metaDescription", event.target.value)
                    }
                    className="min-h-20 w-full rounded-lg border border-black/10 bg-white p-3 text-sm leading-6 outline-none transition focus:border-black"
                  />
                </Field>
                <Field label="Markdown">
                  <textarea
                    value={draft.content}
                    onChange={(event) => updateDraft("content", event.target.value)}
                    spellCheck
                    className="min-h-[34rem] w-full rounded-lg border border-black/10 bg-white p-4 font-mono text-sm leading-6 outline-none transition focus:border-black"
                  />
                </Field>
              </div>

              <div className="grid content-start gap-4">
                <ToggleField
                  label="Published"
                  checked={draft.published}
                  onChange={(checked) => updateDraft("published", checked)}
                />
                <ToggleField
                  label="Promoted"
                  checked={draft.promoted}
                  onChange={(checked) => updateDraft("promoted", checked)}
                />
                <Field label="Date">
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => updateDraft("date", event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />
                </Field>
                <Field label="Category">
                  <input
                    value={draft.category}
                    onChange={(event) => updateDraft("category", event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />
                </Field>
                <Field label="Tags">
                  <textarea
                    value={draft.tags}
                    onChange={(event) => updateDraft("tags", event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-black/10 bg-white p-3 text-sm leading-6 outline-none transition focus:border-black"
                    placeholder="One tag per line"
                  />
                </Field>
                <Field label="Featured image URL">
                  <input
                    value={draft.featuredImage}
                    onChange={(event) =>
                      updateDraft("featuredImage", event.target.value)
                    }
                    className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />
                </Field>
                <Field label="Featured image alt">
                  <input
                    value={draft.featuredImageAlt}
                    onChange={(event) =>
                      updateDraft("featuredImageAlt", event.target.value)
                    }
                    className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />
                </Field>
                <Field label="Author">
                  <input
                    value={draft.author}
                    onChange={(event) => updateDraft("author", event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black"
                  />
                </Field>
                {message ? (
                  <div
                    className={[
                      "rounded-lg border p-3 text-sm",
                      saveState === "error"
                        ? "border-[#f45253]/40 bg-[#fff2f2] text-[#b42324]"
                        : "border-black/10 bg-[#f8f6ef] text-muted",
                    ].join(" ")}
                  >
                    {message}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center p-10 text-center">
            <div>
              <h1 className="text-xl font-semibold text-black">No article selected</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                Generated articles will appear here after Looprail publishes them.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

type ArticleForm = {
  title: string;
  description: string;
  metaDescription: string;
  date: string;
  category: string;
  tags: string;
  featuredImage: string;
  featuredImageAlt: string;
  author: string;
  content: string;
  published: boolean;
  promoted: boolean;
};

function formFromArticle(article: AdminBlogArticle | null): ArticleForm {
  return {
    title: article?.title ?? "",
    description: article?.description ?? "",
    metaDescription: article?.metaDescription ?? "",
    date: article?.date ?? new Date().toISOString().slice(0, 10),
    category: article?.category ?? "",
    tags: (article?.tags ?? []).join("\n"),
    featuredImage: article?.featuredImage ?? "",
    featuredImageAlt: article?.featuredImageAlt ?? "",
    author: article?.author ?? "ZenfulNote",
    content: article?.content ?? "",
    published: article?.published ?? false,
    promoted: article?.promoted ?? false,
  };
}

function payloadFromForm(form: ArticleForm) {
  return {
    title: form.title,
    description: form.description,
    metaDescription: form.metaDescription,
    date: form.date,
    category: form.category,
    tags: form.tags
      .split(/\r?\n|,/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    featuredImage: form.featuredImage,
    featuredImageAlt: form.featuredImageAlt,
    author: form.author,
    content: form.content,
    contentFormat: "markdown",
    published: form.published,
    promoted: form.promoted,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f8f6ef] px-3">
      <span className="text-sm font-medium text-black">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 accent-black"
      />
    </label>
  );
}
