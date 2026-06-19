import Image from "next/image";

const appScreens = [
  {
    src: "/images/screenshots/hero/explore-760.png",
    alt: "ZenfulNote Explore screen with meditations, exercises, prompts, and exercise cards.",
    wrapperClass:
      "pointer-events-none absolute left-[1%] top-[22%] z-[1] hidden w-[188px] -rotate-[9deg] sm:block md:left-[4%] md:w-[214px] lg:top-[20%] lg:w-[236px]",
    frameClass: "phone-motion-left opacity-[0.84]",
    primary: false,
  },
  {
    src: "/images/screenshots/hero/check-in-760.png",
    alt: "ZenfulNote Check-In screen for tracking glimmers, triggers, and progress.",
    wrapperClass:
      "absolute left-1/2 top-[52%] z-[3] w-[62vw] max-w-[262px] -translate-x-1/2 -translate-y-1/2 sm:max-w-none sm:w-[294px] lg:w-[318px]",
    frameClass: "phone-motion-center",
    primary: true,
  },
  {
    src: "/images/screenshots/hero/journal-760.png",
    alt: "ZenfulNote journal prompt screen with guided reflection questions.",
    wrapperClass:
      "pointer-events-none absolute right-[0%] top-[16%] z-[2] hidden w-[184px] rotate-[8deg] sm:block md:right-[3%] md:w-[210px] lg:top-[15%] lg:w-[232px]",
    frameClass: "phone-motion-right opacity-[0.78]",
    primary: false,
  },
] as const;

export function ProductDeck() {
  return (
    <div className="product-deck-stage relative mx-auto grid min-h-[540px] w-full max-w-[760px] place-items-center overflow-visible sm:min-h-[510px] lg:min-h-[570px]">
      <Image
        src="/images/app/orb-blue.png"
        alt="Blue ZenfulNote visual accent"
        aria-hidden="true"
        width={605}
        height={605}
        className="motion-orb absolute left-[2%] top-[8%] size-36 opacity-[0.34] blur-sm sm:size-56"
        priority
        sizes="14rem"
      />
      <Image
        src="/images/app/orb-pink.png"
        alt="Pink ZenfulNote visual accent"
        aria-hidden="true"
        width={605}
        height={605}
        className="motion-orb motion-orb-delay absolute bottom-[5%] right-[8%] size-40 opacity-[0.32] blur-sm sm:size-64"
        sizes="15rem"
      />
      <div className="orbit-line absolute inset-[9%] rounded-full border border-black/10" />
      <div className="orbit-line orbit-line-delay absolute inset-[19%] rounded-full border border-black/[0.08]" />

      <div
        className="absolute inset-x-[5%] bottom-[7%] top-[5%] z-[1] hidden rounded-[48%] bg-white/38 blur-2xl sm:block"
        aria-hidden="true"
      />
      <div className="relative z-[2] h-[540px] w-full max-w-[700px] sm:h-[510px] lg:h-[570px]">
        {appScreens.map((screen) => (
          <div key={screen.src} className={screen.wrapperClass}>
            <ActualAppPhone
              src={screen.src}
              alt={screen.alt}
              className={screen.frameClass}
              primary={screen.primary}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActualAppPhone({
  src,
  alt,
  className = "",
  primary = false,
}: {
  src: string;
  alt: string;
  className?: string;
  primary?: boolean;
}) {
  return (
    <figure
      aria-label={alt}
      className={`actual-app-phone relative aspect-[1206/2622] w-full rounded-[36px] bg-[#111111] p-[7px] shadow-[0_30px_100px_rgba(0,0,0,0.22)] ${
        primary
          ? "rounded-[44px] p-2 shadow-[0_34px_110px_rgba(0,0,0,0.24)]"
          : ""
      } ${className}`}
      role="img"
    >
      <div
        aria-hidden="true"
        className="relative h-full overflow-hidden rounded-[29px] bg-white bg-cover bg-center"
        style={{ backgroundImage: `url(${src})` }}
      />
      <span
        className="absolute left-1/2 top-[10px] h-[16px] w-[76px] -translate-x-1/2 rounded-full bg-black/90"
        aria-hidden="true"
      />
      <span
        className="absolute -left-[2px] top-[18%] h-11 w-[3px] rounded-l-full bg-black/70"
        aria-hidden="true"
      />
      <span
        className="absolute -right-[2px] top-[27%] h-16 w-[3px] rounded-r-full bg-black/70"
        aria-hidden="true"
      />
    </figure>
  );
}
