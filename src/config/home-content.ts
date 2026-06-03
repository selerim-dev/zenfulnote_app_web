export const homeContent = {
  hero: {
    eyebrow: "Official shadow work journaling app",
    title: "ZenfulNote",
    description:
      "A private space to check in, understand your patterns, and meet your inner world with more honesty.",
    image: "/images/screenshots/app-store-01.png",
    imageAlt:
      "ZenfulNote App Store screenshot showing the Explore screen for meditations, exercises, and prompts.",
  },
  moments: [
    {
      eyebrow: "Explore",
      title: "Find calm, fast.",
      description: "Meditations, exercises, and prompts organized by mood.",
      image: "/images/screenshots/app-store-01.png",
      imageAlt:
        "ZenfulNote Explore screen with meditations, exercises, and prompts.",
      points: ["Meditations", "Exercises", "Guides"],
    },
    {
      eyebrow: "Check in",
      title: "Notice the pattern.",
      description: "Track glimmers, triggers, and emotional progress in seconds.",
      image: "/images/screenshots/app-store-02.png",
      imageAlt:
        "ZenfulNote Check-In screen for glimmers, triggers, and progress.",
      points: ["Glimmers", "Triggers", "Progress"],
    },
    {
      eyebrow: "Journal",
      title: "Reflect more deeply.",
      description: "Guided prompts help you uncover patterns, feelings, and insight.",
      image: "/images/screenshots/app-store-03.png",
      imageAlt:
        "ZenfulNote guided prompt screen with reflection questions.",
      points: ["Prompts", "Shadow work", "Self-inquiry"],
    },
  ],
  proofPoints: [
    "Created by the author of The Shadow Work Journal",
    "Built for triggers, glimmers, journaling, and meditation",
    "A quieter app experience for daily self-discovery",
  ],
  blog: {
    eyebrow: "Blog",
    title: "Depth notes for the space between sessions.",
    description:
      "Essays on emotional awareness, shadow work, glimmers, triggers, and the practice of meeting yourself honestly.",
  },
} as const;
