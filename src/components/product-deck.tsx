import Image from "next/image";
import { homeContent } from "@/config/home-content";

export function ProductDeck() {
  const screenshots = homeContent.moments.map((moment) => ({
    src: moment.image,
    alt: moment.imageAlt,
  }));

  return (
    <>
      <div className="mx-auto w-[68vw] min-w-[204px] max-w-[238px] sm:hidden">
        <figure className="relative aspect-[1242/2688] w-full overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_22px_70px_rgba(0,0,0,0.13)]">
          <Image
            src={screenshots[1].src}
            alt={screenshots[1].alt}
            fill
            className="object-cover"
            priority
            fetchPriority="high"
            sizes="(max-width: 639px) 68vw"
          />
        </figure>
      </div>

      <div className="relative mx-auto hidden h-[560px] w-full max-w-[680px] overflow-hidden sm:block lg:h-[620px]">
        <div className="absolute left-8 top-8 z-[6] rounded-full border border-black/10 bg-white/86 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-black/62 shadow-[0_16px_60px_rgba(0,0,0,0.08)] backdrop-blur">
          Discover yourself
        </div>

        <div className="absolute right-4 top-6 z-[3] grid size-20 place-items-center rounded-2xl border border-black/10 bg-white/88 shadow-[0_18px_70px_rgba(0,0,0,0.10)] backdrop-blur">
          <Image
            src="/images/brand/main-logo.png"
            alt=""
            width={52}
            height={52}
            className="size-12 object-contain brightness-0"
          />
        </div>

        {screenshots.map((screenshot, index) => {
          const position =
            index === 0
              ? "left-[8%] top-[16%] z-[2] rotate-[-4deg] scale-[0.78] opacity-80"
              : index === 1
                ? "left-1/2 top-[6%] z-[4] -translate-x-1/2 scale-100"
                : "right-[5%] top-[24%] z-[1] rotate-[4deg] scale-[0.72] opacity-70";

          return (
            <figure
              key={screenshot.src}
              className={`hero-phone absolute aspect-[1242/2688] w-[315px] overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.16)] ${position}`}
            >
              <Image
                src={screenshot.src}
                alt={screenshot.alt}
                fill
                className="object-cover"
                loading={index === 1 ? "eager" : "lazy"}
                fetchPriority={index === 1 ? "high" : "auto"}
                sizes="(min-width: 1024px) 315px, (min-width: 640px) 315px, 58vw"
              />
            </figure>
          );
        })}

        <div className="absolute bottom-6 left-4 z-[5] max-w-[280px] rounded-2xl border border-black/10 bg-white/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.10)] backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Inside ZenfulNote
          </p>
          <p className="mt-2 text-sm leading-6 text-black/76">
            Explore, check in, and reflect from one calm app experience.
          </p>
        </div>
      </div>
    </>
  );
}
