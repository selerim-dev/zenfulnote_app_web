"use client";

import { useMemo, useState } from "react";
import { BlogCard } from "@/components/blog-card";
import type { BlogPost } from "@/lib/posts";

type BlogFilterGridProps = {
  categories: string[];
  posts: BlogPost[];
};

export function BlogFilterGrid({ categories, posts }: BlogFilterGridProps) {
  const [activeCategory, setActiveCategory] = useState("All");

  const visiblePosts = useMemo(() => {
    if (activeCategory === "All") {
      return posts;
    }

    return posts.filter((post) => post.category === activeCategory);
  }, [activeCategory, posts]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div
        aria-label="Filter blog posts by category"
        className="flex flex-wrap gap-2 border-y border-black/10 py-5"
      >
        {["All", ...categories].map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            className="min-h-10 rounded-full border border-black/15 px-4 text-sm font-medium text-black transition hover:border-black aria-pressed:bg-black aria-pressed:text-white"
          >
            {category}
          </button>
        ))}
      </div>
      {visiblePosts.length > 0 ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-black/10 bg-white p-8 text-center">
          <p className="text-sm text-muted">
            No posts are published in this category yet.
          </p>
        </div>
      )}
    </section>
  );
}
