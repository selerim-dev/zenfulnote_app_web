import Image from "next/image";
import { Star } from "lucide-react";

const reviews = [
  {
    headline: "Structure for reflection",
    quote: "It provides the structure.",
    author: "Peaceful Dave",
    source: "App Store review",
  },
  {
    headline: "Trigger awareness",
    quote: "I am enjoying learning about what some of my major triggers are.",
    author: "StormyDarling22",
    source: "App Store review",
  },
  {
    headline: "Glimmer tracking",
    quote: "I especially find the glimmer tracking useful.",
    author: "Dahlia Grant",
    source: "App Store review",
  },
] as const;

export function ReviewCarousel() {
  return (
    <section className="reveal-on-scroll relative isolate overflow-hidden border-b border-white/10 bg-black px-4 py-16 text-white sm:px-6 lg:px-8">
      <Image
        src="/images/generated/brand-atmosphere-dark.png"
        alt=""
        width={1712}
        height={919}
        className="absolute inset-0 -z-10 size-full object-cover opacity-[0.58]"
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-black/66" />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.62fr_1.38fr] lg:items-end">
        <div data-scroll-reveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/48">
            Customer reviews
          </p>
          <h2 className="editorial mt-4 max-w-md text-3xl font-semibold leading-[1.08] text-white sm:text-4xl">
            People are using ZenfulNote to make reflection easier to return to.
          </h2>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex text-[#f9bc2c]" aria-label="Rated 4.8 out of 5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  aria-hidden="true"
                  size={18}
                  fill="currentColor"
                  strokeWidth={1.8}
                />
              ))}
            </div>
            <p className="text-sm text-white/66">4.8 / 5 from 3K ratings</p>
          </div>
        </div>

        <div
          aria-label="Customer review carousel"
          className="review-carousel -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        >
          {reviews.map((review) => (
            <article
              key={review.headline}
              className="min-w-[78vw] snap-start rounded-lg border border-white/12 bg-white/9 p-5 backdrop-blur sm:min-w-[320px] lg:min-w-[360px]"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/42">
                {review.headline}
              </p>
              <blockquote className="mt-5 text-2xl font-medium leading-[1.12] text-white">
                &ldquo;{review.quote}&rdquo;
              </blockquote>
              <div className="mt-6 text-sm leading-6 text-white/58">
                <p>{review.author}</p>
                <p>{review.source}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
