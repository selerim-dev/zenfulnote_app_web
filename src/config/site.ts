export const siteConfig = {
  name: "ZenfulNote",
  url: "https://www.zenfulnote.app",
  description:
    "The official shadow work journaling app for triggers, glimmers, guided reflection, shadow characters, and daily self-discovery.",
  supportEmail: "support@zenfulnote.app",
  links: {
    appStore:
      "https://apps.apple.com/us/app/zenfulnote-journal-heal/id6464039288",
    googlePlay:
      "https://play.google.com/store/apps/details?id=com.zenful.note&hl=en_US",
    smartApp: "https://zenfulnote.app.link/e/OrlBj4D8KJb",
    instagram: "https://www.instagram.com/zenfulnote.app/",
    tiktok: "https://www.tiktok.com/@zenfulnote.app",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: "Download", href: "/download" },
  ],
} as const;

export type SiteLinkKey = keyof typeof siteConfig.links;
