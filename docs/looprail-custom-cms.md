# Looprail Custom CMS API

This site exposes a small server API for Looprail to create blog drafts and
publish approved articles. Looprail sends structured article JSON to this
site, and this site owns how the article is stored and rendered.

In production, published articles are stored in a private Vercel Blob store and
served by the blog pages at request time. This means a publish does not commit
to GitHub and does not require a Vercel redeploy.

In local development, runtime article JSON is written under `.looprail/`.
Existing MDX files under `content/blog` remain supported and are merged with
runtime articles for the public blog.

## Environment

Set a server-only API key before running the site:

```bash
LOOPRAIL_CMS_API_KEY="site-generated-secret"
```

Optional settings:

```bash
LOOPRAIL_CMS_AUTH_HEADER="x-looprail-api-key"
LOOPRAIL_CMS_PUBLIC_BASE_URL="https://www.zenfulnote.app"
LOOPRAIL_CMS_STORAGE_MODE="blob"
BLOB_READ_WRITE_TOKEN="vercel-blob-read-write-token"
ZENFULNOTE_ADMIN_PASSWORD="strong-admin-password"
ZENFULNOTE_ADMIN_SESSION_SECRET="random-session-signing-secret"
```

`LOOPRAIL_CMS_AUTH_HEADER` defaults to `x-looprail-api-key`.
`LOOPRAIL_CMS_PUBLIC_BASE_URL` controls the `url` returned in draft and publish
responses. If it is not set, the site URL from `src/config/site.ts` is used.

For Vercel production, connect a private Vercel Blob store to this project so
`BLOB_READ_WRITE_TOKEN` is available at runtime. The API returns a setup error
when production storage is missing.

`LOOPRAIL_CMS_STORAGE_MODE=github` is still supported as a legacy fallback, but
it commits MDX to GitHub and depends on a redeploy before the public page
updates. Do not use it for normal Looprail publishing.

## Blog Admin

`/admin` is a password-only editor for Looprail runtime articles. It does not
use user accounts. Set `ZENFULNOTE_ADMIN_PASSWORD` and
`ZENFULNOTE_ADMIN_SESSION_SECRET` in the deployment environment before using it.

The admin editor can update title, description, metadata, category, tags,
featured image, body markdown, published status, and promoted status. Deleting
an article removes it from the runtime store. Promoted published articles sort
to the top of the public blog and become the featured article before ordinary
date ordering.

## Connector Values

Use these values when saving the Looprail custom CMS credential:

```json
{
  "base_url": "https://www.zenfulnote.app",
  "api_key": "site-generated-secret",
  "health_path": "/api/looprail/health",
  "draft_path": "/api/looprail/articles",
  "publish_path": "/api/looprail/articles/publish",
  "auth_header": "x-looprail-api-key"
}
```

## Endpoints

`GET /api/looprail/health`

Returns JSON when the API key is valid.

`POST /api/looprail/articles`

Creates an unpublished draft from Looprail article JSON. Drafts are stored but
are not returned from the public blog list and do not get a public URL.

`POST /api/looprail/articles/publish`

Publishes a new article or updates an existing published article from the same
Looprail article JSON. Include `external_article_id` when publishing a draft
created through the draft endpoint.

Article JSON can include `featured_image`, `featured_image_alt`, `images`, and
`assets`. ZenfulNote stores those fields with the runtime article. Local image
paths continue through `next/image`; remote Looprail image URLs render directly
so the blog can use client-provided images without adding a new image host to
`next.config.ts`.

Markdown remains the source of truth for article rendering. The preferred field
is `body_markdown`, but the API also accepts `markdown`, `body`, and `content`
as markdown fallbacks. For HTML content, use `html` or `body_html`.

Looprail can also send optional article resource metadata. These fields are
stored under the article's `looprail` metadata and are not required for older
payloads:

```json
{
  "source_references": [],
  "hyperlinks": [],
  "real_life_examples": [],
  "reflection_prompt": "Where does this pattern show up in your life?",
  "zenfulnote_app_tie_in": {
    "label": "Track the pattern in ZenfulNote",
    "url": "https://www.zenfulnote.app/download",
    "guidance": "Invite a reflective check-in."
  },
  "lead_magnet": {
    "id": "shadow-prompts",
    "title": "30 Shadow Work Prompts",
    "description": "Go deeper with a free prompt guide.",
    "cta_label": "Access the prompts",
    "destination_url": "https://www.zenfulnote.app/shadow-prompts",
    "email_required": true
  },
  "blog_resource_context": {}
}
```

The public article page renders `lead_magnet` as a small CTA block below the
article body when it includes a title and safe HTTP(S) or site-relative
`destination_url`. Markdown links and any in-body CTA copy should still be sent
inside `body_markdown`.

All endpoints require this header:

```http
x-looprail-api-key: site-generated-secret
```

Draft and publish responses return:

```json
{
  "id": "article-title",
  "slug": "article-title",
  "status": "draft",
  "storage": "vercel_blob",
  "rendering_status": "stored",
  "visibility": "draft"
}
```

The publish endpoint returns the public blog URL immediately:

```json
{
  "id": "article-title",
  "slug": "article-title",
  "status": "published",
  "storage": "vercel_blob",
  "rendering_status": "public",
  "visibility": "public",
  "url": "https://www.zenfulnote.app/blog/article-title",
  "public_url": "https://www.zenfulnote.app/blog/article-title"
}
```
