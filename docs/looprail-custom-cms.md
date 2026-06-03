# Looprail Custom CMS API

This site exposes a small server API for Looprail to create blog drafts and
publish approved articles. The API writes MDX files into `content/blog`.
Deploy the site in an environment where that directory is writable at runtime.

## Environment

Set a server-only API key before running the site:

```bash
LOOPRAIL_CMS_API_KEY="site-generated-secret"
```

Optional settings:

```bash
LOOPRAIL_CMS_AUTH_HEADER="x-looprail-api-key"
LOOPRAIL_CMS_PUBLIC_BASE_URL="https://www.zenfulnote.app"
```

`LOOPRAIL_CMS_AUTH_HEADER` defaults to `x-looprail-api-key`.
`LOOPRAIL_CMS_PUBLIC_BASE_URL` controls the `url` returned in draft and publish
responses. If it is not set, the site URL from `src/config/site.ts` is used.

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

Creates an unpublished draft from Looprail article JSON.

`POST /api/looprail/articles/publish`

Publishes a new article or updates an existing published article from the same
Looprail article JSON. Include `external_article_id` when publishing a draft
created through the draft endpoint.

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
  "url": "https://www.zenfulnote.app/blog/article-title"
}
```

The publish endpoint returns the same shape with `"status": "published"`.
