export const homeContent = {
  hero: {
    eyebrow: "The official shadow work journal app",
    title: "ZenfulNote",
    description:
      "By the creator of The Shadow Work Journal. Track triggers, glimmers, journal, and meditate in one private space built for deeper self-awareness.",
    image: "/images/screenshots/app-store-01.png",
    imageAlt:
      "ZenfulNote App Store screenshot showing the Explore screen for meditations, exercises, and prompts.",
  },
  moments: [
    {
      eyebrow: "Explore",
      title: "Find your center, fast.",
      description:
        "Access 200+ Depth Psychology Meditations, exercises, and prompts created by experts.",
      image: "/images/screenshots/app-store-01.png",
      imageAlt:
        "ZenfulNote Explore screen with meditations, exercises, and prompts.",
      points: [
        "Meditations",
        "Exercises",
        "Prompts",
        "Quizzes",
        "Learn About Depth Psychology",
      ],
      visual: "exercise-grid",
    },
    {
      eyebrow: "Check in",
      title: "Spot The Pattern",
      description: "Track glimmers, triggers, and emotional progress in seconds.",
      image: "/images/screenshots/app-store-02.png",
      imageAlt:
        "ZenfulNote Check-In screen for glimmers, triggers, and progress.",
      points: ["Glimmers", "Triggers", "Progress"],
      visual: "pattern-checkin",
    },
    {
      eyebrow: "Journal",
      title: "Reflect more deeply.",
      description: "Guided prompts help you uncover patterns, feelings, and insight.",
      image: "/images/screenshots/app-store-03.png",
      imageAlt:
        "ZenfulNote guided prompt screen with reflection questions.",
      points: ["Prompts", "Shadow work", "Self-inquiry"],
      visual: "journal-depth",
    },
  ],
  proofPoints: [
    "By the creator of The Shadow Work Journal",
    "Track triggers, glimmers, journal, and meditate",
    "A quieter app experience for daily self-discovery",
  ],
  blog: {
    eyebrow: "Blog",
    title: "Depth notes for the space between sessions.",
    description:
      "Essays on emotional awareness, shadow work, glimmers, triggers, and the practice of meeting yourself honestly.",
  },
} as const;
