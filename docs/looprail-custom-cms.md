# Looprail Custom CMS API

This site exposes a small server API for Looprail to create blog drafts and
publish approved articles. Locally, the API writes MDX files into
`content/blog`. In Vercel production, the deployed filesystem is read-only, so
the API commits MDX files back to the GitHub repository. Vercel then redeploys
from the committed content.

## Environment

Set a server-only API key before running the site:

```bash
LOOPRAIL_CMS_API_KEY="site-generated-secret"
```

Optional settings:

```bash
LOOPRAIL_CMS_AUTH_HEADER="x-looprail-api-key"
LOOPRAIL_CMS_PUBLIC_BASE_URL="https://www.zenfulnote.app"
LOOPRAIL_CMS_STORAGE_MODE="github"
LOOPRAIL_CMS_GITHUB_TOKEN="github-fine-grained-token"
LOOPRAIL_CMS_GITHUB_REPO="selerim-dev/zenfulnote_app_web"
LOOPRAIL_CMS_GITHUB_BRANCH="main"
LOOPRAIL_CMS_GITHUB_COMMITTER_NAME="Looprail CMS"
LOOPRAIL_CMS_GITHUB_COMMITTER_EMAIL="looprail-cms@users.noreply.github.com"
```

`LOOPRAIL_CMS_AUTH_HEADER` defaults to `x-looprail-api-key`.
`LOOPRAIL_CMS_PUBLIC_BASE_URL` controls the `url` returned in draft and publish
responses. If it is not set, the site URL from `src/config/site.ts` is used.

For Vercel, configure `LOOPRAIL_CMS_GITHUB_TOKEN` with a fine-grained GitHub
token that has Contents read/write access to this repository. Without it, the
API will return a setup error because Vercel cannot persist runtime writes to
`content/blog`.

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
