"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

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
  const [articleListCollapsed, setArticleListCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const isCreating = selectedSlug === "__new__";

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

  function createArticle() {
    setSelectedSlug("__new__");
    setDraft(formFromArticle(null));
    setSaveState("idle");
    setMessage("");
    setArticleListCollapsed(true);
    setSettingsCollapsed(false);
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
    setSaveState("saving");
    setMessage("");

    const response = await fetch(isCreating ? "/api/admin/articles" : `/api/admin/articles/${selected?.slug}`, {
      method: isCreating ? "POST" : "PATCH",
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
      isCreating
        ? [article, ...current.filter((item) => item.slug !== article.slug)]
        : current.map((item) => (item.slug === article.slug ? article : item)),
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
    <div
      className={[
        "grid h-full min-h-0 overflow-hidden rounded-lg border border-white/55 bg-white/[0.42] shadow-[0_24px_80px_rgba(30,32,50,0.09),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl",
        articleListCollapsed ? "lg:grid-cols-[56px_1fr]" : "lg:grid-cols-[340px_1fr]",
      ].join(" ")}
    >
      <aside className="flex min-h-0 flex-col border-b border-white/55 bg-white/[0.26] backdrop-blur-xl lg:border-b-0 lg:border-r lg:border-white/55">
        <div className="flex items-center justify-between gap-3 border-b border-white/55 bg-white/[0.18] p-4">
          {articleListCollapsed ? null : (
            <div>
              <h2 className="text-sm font-semibold text-black">Runtime Articles</h2>
              <p className="mt-1 text-xs text-muted">{articles.length} editable</p>
            </div>
          )}
          <div className={["flex gap-2", articleListCollapsed ? "w-full flex-col items-center" : "items-center"].join(" ")}>
          <button
            type="button"
            onClick={() => setArticleListCollapsed((current) => !current)}
            aria-label={articleListCollapsed ? "Expand article list" : "Collapse article list"}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/65 bg-white/45 text-black transition duration-200 hover:-translate-y-0.5 hover:bg-white/72 hover:shadow-[0_14px_34px_rgba(80,104,231,0.12)]"
          >
            {articleListCollapsed ? <PanelLeftOpen aria-hidden="true" size={16} /> : <PanelLeftClose aria-hidden="true" size={16} />}
          </button>
          {articleListCollapsed ? null : (
            <>
              <button
                type="button"
                onClick={createArticle}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/65 bg-white/45 px-3 text-xs font-semibold text-black transition duration-200 hover:-translate-y-0.5 hover:bg-white/72 hover:shadow-[0_14px_34px_rgba(80,104,231,0.12)]"
              >
                <Plus aria-hidden="true" size={14} />
                New
              </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
                className="grid size-10 place-items-center rounded-full border border-white/65 bg-white/45 text-black transition duration-200 hover:-translate-y-0.5 hover:bg-white/72 hover:shadow-[0_14px_34px_rgba(80,104,231,0.12)]"
                aria-label="Refresh articles"
          >
                <RefreshCw aria-hidden="true" size={14} />
          </button>
            </>
          )}
          </div>
        </div>
        <div className={["min-h-0 flex-1 overflow-y-auto", articleListCollapsed ? "p-2" : "p-3"].join(" ")}>
          {articleListCollapsed ? (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={createArticle}
                aria-label="Create article"
                className="grid size-10 place-items-center rounded-full border border-white/65 bg-white/45 text-black transition duration-200 hover:-translate-y-0.5 hover:bg-white/72 hover:shadow-[0_14px_34px_rgba(80,104,231,0.12)]"
              >
                <Plus aria-hidden="true" size={16} />
              </button>
              {sortedArticles.slice(0, 12).map((article) => (
                <button
                  key={article.slug}
                  type="button"
                  onClick={() => selectArticle(article)}
                  title={article.title}
                  className={[
                    "grid size-10 place-items-center rounded-full border text-xs font-semibold uppercase transition duration-200",
                    selectedSlug === article.slug ? "border-black bg-black text-white" : "border-white/60 bg-white/45 text-black hover:bg-white/72",
                  ].join(" ")}
                >
                  {article.title.slice(0, 1)}
                </button>
              ))}
            </div>
          ) : (
          <>
          {sortedArticles.length ? (
            <div className="grid gap-2">
              {sortedArticles.map((article) => (
                <button
                  key={article.slug}
                  type="button"
                  onClick={() => selectArticle(article)}
                  className={[
                    "rounded-lg border p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition duration-200",
                    selectedSlug === article.slug
                      ? "border-white/85 bg-white/78 shadow-[0_16px_42px_rgba(80,104,231,0.13)]"
                    : "border-white/45 bg-white/[0.36] hover:-translate-y-0.5 hover:border-white/75 hover:bg-white/[0.62] hover:shadow-[0_12px_32px_rgba(80,104,231,0.10)]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="line-clamp-2 text-sm font-medium text-black">
                      {article.title}
                    </span>
                    {article.promoted ? (
                      <span className="shrink-0 rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
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
          </>
          )}
        </div>
      </aside>

      <section className="min-h-0 min-w-0">
        {selected || isCreating ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/55 bg-white/[0.18] p-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  {isCreating ? "New article" : `/blog/${selected?.slug}`}
                </p>
                <h1 className="mt-1 truncate text-xl font-semibold text-black">
                  {draft.title || "Untitled draft"}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected?.published ? (
                  <Link
                    href={`/blog/${selected.slug}`}
                    target="_blank"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/65 bg-white/45 px-4 text-sm font-semibold text-black transition duration-200 hover:-translate-y-0.5 hover:bg-white/72 hover:shadow-[0_14px_34px_rgba(80,104,231,0.12)]"
                  >
                    <Eye aria-hidden="true" size={15} />
                    View
                  </Link>
                ) : null}
                {!isCreating ? (
                  <button
                  type="button"
                  onClick={deleteArticle}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#f45253]/35 bg-white/38 px-4 text-sm font-semibold text-[#b42324] transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff3f3] hover:shadow-[0_14px_34px_rgba(244,82,83,0.12)]"
                >
                    <Trash2 aria-hidden="true" size={15} />
                  Delete
                </button>
                ) : null}
                <button
                  type="button"
                  onClick={saveArticle}
                  disabled={saveState === "saving"}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#292929] hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)] disabled:opacity-55"
                >
                  <Save aria-hidden="true" size={15} />
                  {saveState === "saving" ? "Saving" : isCreating ? "Create" : "Save"}
                </button>
              </div>
            </div>

            <div
              className={[
                "grid min-h-0 flex-1 gap-4 overflow-y-auto p-4",
                settingsCollapsed ? "xl:grid-cols-[minmax(0,1fr)_56px]" : "xl:grid-cols-[minmax(0,1fr)_320px]",
              ].join(" ")}
            >
              <div className="grid content-start gap-4">
                <Field label="Title">
                  <input
                    value={draft.title}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-white/65 bg-white/50 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      updateDraft("description", event.target.value)
                    }
                    className="min-h-24 w-full rounded-lg border border-white/65 bg-white/50 p-3 text-sm leading-6 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                <Field label="Meta description">
                  <textarea
                    value={draft.metaDescription}
                    onChange={(event) =>
                      updateDraft("metaDescription", event.target.value)
                    }
                    className="min-h-20 w-full rounded-lg border border-white/65 bg-white/50 p-3 text-sm leading-6 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                <Field label="Article body">
                  <textarea
                    value={draft.content}
                    onChange={(event) => updateDraft("content", event.target.value)}
                    spellCheck
                    className="min-h-[36rem] w-full rounded-lg border border-white/65 bg-white/50 p-4 text-sm leading-7 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                    placeholder="Write normally. Blank lines become paragraphs; markdown syntax is preserved when used."
                  />
                </Field>
              </div>

              <div className="grid content-start gap-4">
                <button
                  type="button"
                  onClick={() => setSettingsCollapsed((current) => !current)}
                  aria-label={settingsCollapsed ? "Expand article settings" : "Collapse article settings"}
                  className="grid size-10 place-items-center rounded-full border border-white/65 bg-white/45 text-black transition duration-200 hover:-translate-y-0.5 hover:bg-white/72 hover:shadow-[0_14px_34px_rgba(80,104,231,0.12)]"
                >
                  {settingsCollapsed ? <PanelRightOpen aria-hidden="true" size={16} /> : <PanelRightClose aria-hidden="true" size={16} />}
                </button>
                {settingsCollapsed ? null : (
                <>
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
                    className="min-h-12 w-full rounded-lg border border-white/65 bg-white/50 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                <Field label="Category">
                  <input
                    value={draft.category}
                    onChange={(event) => updateDraft("category", event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-white/65 bg-white/50 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                <Field label="Tags">
                  <textarea
                    value={draft.tags}
                    onChange={(event) => updateDraft("tags", event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-white/65 bg-white/50 p-3 text-sm leading-6 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                    placeholder="One tag per line"
                  />
                </Field>
                <Field label="Featured image URL">
                  <input
                    value={draft.featuredImage}
                    onChange={(event) =>
                      updateDraft("featuredImage", event.target.value)
                    }
                    className="min-h-12 w-full rounded-lg border border-white/65 bg-white/50 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                <Field label="Featured image alt">
                  <input
                    value={draft.featuredImageAlt}
                    onChange={(event) =>
                      updateDraft("featuredImageAlt", event.target.value)
                    }
                    className="min-h-12 w-full rounded-lg border border-white/65 bg-white/50 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                <Field label="Author">
                  <input
                    value={draft.author}
                    onChange={(event) => updateDraft("author", event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-white/65 bg-white/50 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
                  />
                </Field>
                {message ? (
                  <div
                    className={[
                      "rounded-lg border p-3 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
                      saveState === "error"
                        ? "border-[#f45253]/40 bg-[#fff2f2] text-[#b42324]"
                        : "border-white/55 bg-white/42 text-black/58",
                    ].join(" ")}
                  >
                    {message}
                  </div>
                ) : null}
                </>
                )}
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
    content: markdownFromEditorText(form.content),
    contentFormat: "markdown",
    published: form.published,
    promoted: form.promoted,
  };
}

function markdownFromEditorText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n");
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
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/48">
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
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/60 bg-white/42 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <span className="text-sm font-semibold text-black">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 accent-black"
      />
    </label>
  );
}
