const imageExtensions = [
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
] as const;

const nonImageExtensions = [
  ".avi",
  ".doc",
  ".docx",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".pdf",
  ".ppt",
  ".pptx",
  ".webm",
  ".xls",
  ".xlsx",
] as const;

const knownImageHosts = [
  "blob.vercel-storage.com",
  "cloudinary.com",
  "googleusercontent.com",
  "images.unsplash.com",
] as const;

export function normalizeRenderableBlogImageSrc(value: unknown) {
  if (typeof value !== "string") return undefined;
  const src = value.trim();
  if (!src) return undefined;
  if (src.startsWith("/")) return src;

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return undefined;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
  const hostname = parsed.hostname.toLowerCase();
  const pathname = decodeURIComponent(parsed.pathname).toLowerCase();

  if (hostname === "drive.google.com" || hostname === "docs.google.com") {
    return undefined;
  }

  if (nonImageExtensions.some((extension) => pathname.endsWith(extension))) {
    return undefined;
  }

  if (imageExtensions.some((extension) => pathname.endsWith(extension))) {
    return src;
  }

  if (knownImageHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return src;
  }

  return undefined;
}
