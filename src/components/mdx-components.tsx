import type { MDXComponents } from "mdx/types";
import { BlogImage } from "@/components/blog-image";

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-8 rounded-lg border border-black/10 bg-[#f5f5f5] p-5 text-base leading-7 text-black">
      {children}
    </aside>
  );
}

export const mdxComponents: MDXComponents = {
  Callout,
  h1: ({ children }) => (
    <h2 className="editorial mt-10 text-3xl font-semibold leading-tight text-black sm:text-4xl">
      {children}
    </h2>
  ),
  img: ({ src, alt }) => {
    if (typeof src !== "string") {
      return null;
    }

    return (
      <BlogImage
        src={src}
        alt={alt ?? "ZenfulNote article image"}
        width={1200}
        height={760}
        className="my-8 rounded-lg border border-black/10 object-cover"
      />
    );
  },
};
