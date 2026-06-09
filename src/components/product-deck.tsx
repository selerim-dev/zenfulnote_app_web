import Image from "next/image";

const appScreens = [
  {
    src: "/images/screenshots/app-cutout-01.png",
    alt: "ZenfulNote Explore screen with meditations, exercises, prompts, and exercise cards.",
    frameClass:
      "hidden sm:block -mr-14 opacity-[0.82] phone-motion-left",
  },
  {
    src: "/images/screenshots/app-cutout-02.png",
    alt: "ZenfulNote Check-In screen for tracking glimmers, triggers, and progress.",
    frameClass:
      "z-[2] w-[64vw] max-w-[250px] sm:w-[266px] sm:max-w-none phone-motion-center",
  },
  {
    src: "/images/screenshots/app-cutout-03.png",
    alt: "ZenfulNote journal prompt screen with guided reflection questions.",
    frameClass:
      "hidden sm:block -ml-14 opacity-[0.74] phone-motion-right",
  },
] as const;

export function ProductDeck() {
  return (
    <div className="product-deck-stage relative mx-auto grid min-h-[360px] w-full max-w-[740px] place-items-center overflow-visible sm:min-h-[500px] lg:min-h-[560px]">
      <Image
        src="/images/app/orb-blue.png"
        alt=""
        width={605}
        height={605}
        className="motion-orb absolute left-[2%] top-[8%] size-36 opacity-[0.34] blur-sm sm:size-56"
        priority
        sizes="14rem"
      />
      <Image
        src="/images/app/orb-pink.png"
        alt=""
        width={605}
        height={605}
        className="motion-orb motion-orb-delay absolute bottom-[5%] right-[8%] size-40 opacity-[0.32] blur-sm sm:size-64"
        sizes="15rem"
      />
      <div className="orbit-line absolute inset-[9%] rounded-full border border-black/10" />
      <div className="orbit-line orbit-line-delay absolute inset-[19%] rounded-full border border-black/[0.08]" />

      <div className="relative z-[1] flex w-full items-center justify-center">
        {appScreens.map((screen, index) => (
          <ActualAppPhone
            key={screen.src}
            src={screen.src}
            alt={screen.alt}
            className={screen.frameClass}
            priority={index === 1}
          />
        ))}
      </div>
    </div>
  );
}

function ActualAppPhone({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <figure
      className={`actual-app-phone relative aspect-[760/1780] w-[266px] overflow-hidden rounded-[30px] bg-white shadow-[0_28px_100px_rgba(0,0,0,0.16)] ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="actual-app-shot object-cover"
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        sizes="(min-width: 1024px) 266px, (min-width: 640px) 266px, 64vw"
      />
    </figure>
  );
}
