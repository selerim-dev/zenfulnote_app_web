import Image from "next/image";

type ProductScreenshotProps = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
};

export function ProductScreenshot({
  src,
  alt,
  priority = false,
  className = "",
}: ProductScreenshotProps) {
  return (
    <figure
      className={`product-screenshot relative mx-auto aspect-[1242/2688] w-full max-w-[310px] overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_26px_90px_rgba(0,0,0,0.12)] ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        sizes="(min-width: 1024px) 310px, 78vw"
      />
    </figure>
  );
}
