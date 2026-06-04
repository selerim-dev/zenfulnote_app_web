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
