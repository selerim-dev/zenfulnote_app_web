/* eslint-disable @next/next/no-img-element */

import Image from "next/image";

type BlogImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export function BlogImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  className,
  priority = false,
  loading,
  fetchPriority,
}: BlogImageProps) {
  if (isRemoteImageSrc(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading ?? (priority ? "eager" : "lazy")}
        fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
        className={[fill ? "absolute inset-0 size-full" : "", className ?? ""]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
        loading={priority ? undefined : loading}
        fetchPriority={fetchPriority}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 1200}
      height={height ?? 760}
      sizes={sizes}
      className={className}
      priority={priority}
      loading={priority ? undefined : loading}
      fetchPriority={fetchPriority}
    />
  );
}

function isRemoteImageSrc(src: string) {
  return /^https?:\/\//i.test(src);
}
