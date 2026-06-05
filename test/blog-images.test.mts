import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRenderableBlogImageSrc } from "../src/lib/blog-images.ts";

test("accepts local and direct image URLs", () => {
  assert.equal(
    normalizeRenderableBlogImageSrc("/images/generated/brand-atmosphere-light.png"),
    "/images/generated/brand-atmosphere-light.png",
  );
  assert.equal(
    normalizeRenderableBlogImageSrc("https://cdn.example.com/articles/cover.webp"),
    "https://cdn.example.com/articles/cover.webp",
  );
  assert.equal(
    normalizeRenderableBlogImageSrc(
      "https://assets.public.blob.vercel-storage.com/articles/cover",
    ),
    "https://assets.public.blob.vercel-storage.com/articles/cover",
  );
});

test("rejects Google Drive pages, documents, and videos", () => {
  assert.equal(
    normalizeRenderableBlogImageSrc(
      "https://drive.google.com/drive/folders/1NA65ljYZC7CRvXvXIMPdf1I_SK9FmA5D",
    ),
    undefined,
  );
  assert.equal(
    normalizeRenderableBlogImageSrc(
      "https://drive.google.com/file/d/1abcGenericAssetId/view?usp=sharing",
    ),
    undefined,
  );
  assert.equal(
    normalizeRenderableBlogImageSrc("https://cdn.example.com/articles/cover.pdf"),
    undefined,
  );
  assert.equal(
    normalizeRenderableBlogImageSrc("https://cdn.example.com/articles/demo.mp4"),
    undefined,
  );
});
