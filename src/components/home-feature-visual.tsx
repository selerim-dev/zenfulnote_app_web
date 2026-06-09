import Image from "next/image";
import { Feather, Play, Sparkles, Waves } from "lucide-react";

export type HomeFeatureVisualVariant =
  | "exercise-grid"
  | "pattern-checkin"
  | "journal-depth";

type HomeFeatureVisualProps = {
  variant: HomeFeatureVisualVariant;
  image: string;
  imageAlt: string;
  dark?: boolean;
};

const exerciseTiles = [
  {
    title: "Body Scan",
    label: "Meditation",
    duration: "8 min",
    image: "/images/app/orb-blue.png",
    accent: "bg-[#5068e7]",
  },
  {
    title: "Soothe The Inner Critic",
    label: "Exercise",
    duration: "12 min",
    image: "/images/app/orb-pink.png",
    accent: "bg-[#f45253]",
  },
  {
    title: "Morning Grounding",
    label: "Prompt",
    duration: "5 min",
    image: "/images/app/orb-orange.png",
    accent: "bg-[#f9bc2c]",
  },
  {
    title: "Find The Feeling",
    label: "Quiz",
    duration: "4 min",
    image: "/images/app/orb-blue.png",
    accent: "bg-[#ea6fcf]",
  },
] as const;

const patternRows = [
  {
    title: "Glimmer",
    value: "Connected",
    detail: "3 entries this week",
    color: "bg-[#209d13]",
  },
  {
    title: "Trigger",
    value: "Overextended",
    detail: "Highest on late work nights",
    color: "bg-[#f45253]",
  },
  {
    title: "Progress",
    value: "Regulated faster",
    detail: "Average reset time down 18%",
    color: "bg-[#5068e7]",
  },
] as const;

const journalCards = [
  {
    icon: Feather,
    title: "Guided prompt",
    text: "What part of you needed protection today?",
  },
  {
    icon: Sparkles,
    title: "AI reflection",
    text: "Pattern detected: you soften after naming the feeling.",
  },
  {
    icon: Waves,
    title: "Next practice",
    text: "Try a 5-minute grounding exercise before journaling.",
  },
] as const;

export function HomeFeatureVisual({
  variant,
  image,
  imageAlt,
  dark = false,
}: HomeFeatureVisualProps) {
  if (variant === "exercise-grid") {
    return <ExerciseGridPreview />;
  }

  if (variant === "pattern-checkin") {
    return <PatternPreview />;
  }

  return <JournalPreview image={image} imageAlt={imageAlt} dark={dark} />;
}

function ExerciseGridPreview() {
  return (
    <div className="relative isolate mx-auto w-full max-w-3xl py-4 sm:py-7">
      <Image
        src="/images/app/orb-blue.png"
        alt=""
        width={605}
        height={605}
        className="absolute -left-16 top-8 -z-10 size-52 opacity-40 blur-sm sm:size-72"
        sizes="18rem"
      />
      <Image
        src="/images/app/orb-orange.png"
        alt=""
        width={605}
        height={605}
        className="absolute -bottom-16 right-0 -z-10 size-52 opacity-[0.38] blur-sm sm:size-72"
        sizes="18rem"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {exerciseTiles.map((tile, index) => (
          <article
            key={tile.title}
            className="pop-on-scroll relative min-h-[190px] overflow-hidden rounded-lg border border-black/10 bg-white/86 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.08)] backdrop-blur"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <Image
              src={tile.image}
              alt=""
              width={300}
              height={300}
              className="absolute -right-10 -top-12 size-40 object-contain opacity-[0.82]"
              sizes="10rem"
            />
            <span className="absolute right-4 top-4 inline-grid size-11 place-items-center rounded-full bg-black text-white shadow-[0_10px_32px_rgba(0,0,0,0.22)]">
              <Play
                aria-hidden="true"
                size={18}
                fill="currentColor"
                strokeWidth={1.8}
              />
            </span>
            <div className="relative z-[1] flex h-full min-h-[158px] flex-col justify-end">
              <div className={`h-1.5 w-14 rounded-full ${tile.accent}`} />
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-black/48">
                {tile.label} / {tile.duration}
              </p>
              <h3 className="mt-2 max-w-[12rem] text-2xl font-medium leading-[1.05] text-black">
                {tile.title}
              </h3>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PatternPreview() {
  return (
    <div className="relative isolate mx-auto w-full max-w-3xl py-5 text-white">
      <Image
        src="/images/app/orb-pink.png"
        alt=""
        width={605}
        height={605}
        className="absolute -right-16 top-3 -z-10 size-56 opacity-[0.38] blur-md sm:size-72"
        sizes="18rem"
      />
      <Image
        src="/images/app/orb-orange.png"
        alt=""
        width={605}
        height={605}
        className="absolute -bottom-12 left-2 -z-10 size-44 opacity-[0.32] blur-md sm:size-60"
        sizes="15rem"
      />
      <div className="grid gap-4">
        <div className="grid grid-cols-7 gap-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="grid aspect-square place-items-center rounded-full border border-white/14 bg-white/8 text-xs font-medium text-white/72"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          {patternRows.map((row, index) => (
            <article
              key={row.title}
              className="pop-on-scroll grid gap-4 rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur sm:grid-cols-[auto_1fr_auto] sm:items-center"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <span className={`size-3 rounded-full ${row.color}`} />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/46">
                  {row.title}
                </p>
                <h3 className="mt-1 text-2xl font-medium leading-tight text-white">
                  {row.value}
                </h3>
              </div>
              <p className="max-w-[13rem] text-sm leading-5 text-white/62 sm:text-right">
                {row.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function JournalPreview({
  image,
  imageAlt,
  dark,
}: {
  image: string;
  imageAlt: string;
  dark: boolean;
}) {
  return (
    <div className="relative isolate mx-auto grid w-full max-w-3xl items-center gap-5 py-5 sm:grid-cols-[0.8fr_1fr]">
      <Image
        src="/images/app/orb-blue.png"
        alt=""
        width={605}
        height={605}
        className="absolute -left-14 bottom-0 -z-10 size-48 opacity-[0.28] blur-md sm:size-64"
        sizes="16rem"
      />
      <figure className="relative mx-auto aspect-[1242/2688] w-[58vw] max-w-[230px] overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.13)] sm:w-full">
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover"
          loading="lazy"
          sizes="(min-width: 1024px) 230px, (min-width: 640px) 32vw, 58vw"
        />
      </figure>
      <div className="grid gap-3">
        {journalCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className={`pop-on-scroll rounded-lg border p-4 ${
                dark
                  ? "border-white/12 bg-white/8 text-white"
                  : "border-black/10 bg-white/78 text-black shadow-[0_18px_60px_rgba(0,0,0,0.06)]"
              }`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-grid size-10 shrink-0 place-items-center rounded-full ${
                    dark ? "bg-white/12" : "bg-black text-white"
                  }`}
                >
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <p
                    className={`text-xs font-medium uppercase tracking-[0.16em] ${
                      dark ? "text-white/46" : "text-black/46"
                    }`}
                  >
                    {card.title}
                  </p>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      dark ? "text-white/70" : "text-black/68"
                    }`}
                  >
                    {card.text}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
