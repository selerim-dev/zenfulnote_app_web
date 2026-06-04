import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogImage } from "@/components/blog-image";
import type { BlogPost } from "@/lib/posts";

type BlogCardProps = {
  post: BlogPost;
  priority?: boolean;
};

export function BlogCard({ post, priority = false }: BlogCardProps) {
  return (
    <article className="group grid overflow-hidden rounded-lg border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_70px_rgba(0,0,0,0.08)]">
      {post.featuredImage ? (
        <Link
          href={`/blog/${post.slug}`}
          className="relative aspect-[16/10] overflow-hidden bg-[#f8f6ef]"
        >
          <Image
            src="/images/generated/brand-atmosphere-editorial.png"
            alt=""
            width={1200}
            height={900}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="absolute inset-0 size-full object-cover opacity-40 transition duration-300 group-hover:scale-[1.02]"
          />
          <BlogImage
            src={post.featuredImage}
            alt={post.featuredImageAlt ?? ""}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-5 transition duration-300 group-hover:scale-[1.02]"
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
          />
        </Link>
      ) : null}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
          <span>{post.category}</span>
          <span aria-hidden="true">/</span>
          <span>{post.readingTime}</span>
          <span aria-hidden="true">/</span>
          <time dateTime={post.date}>
            {new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(post.date))}
          </time>
        </div>
        <h3 className="editorial mt-4 text-2xl font-semibold leading-tight text-black">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
          {post.description}
        </p>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-black"
        >
          Read article
          <ArrowRight
            aria-hidden="true"
            size={16}
            strokeWidth={1.8}
            className="transition group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </article>
  );
}
