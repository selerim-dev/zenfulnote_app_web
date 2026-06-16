type BlogSeoFields = {
  slug: string;
  title: string;
  featuredImageAlt?: string;
};

const auditedBlogTitleOverrides: Record<string, string> = {
  "shadow-work-prompts-for-beginners-12-gentle-questions-to-notice-patterns-without-overthinking":
    "Beginner Shadow Work Prompts",
  "trigger-vs-glimmer-shadow-work-journaling":
    "Trigger vs. Glimmer Journaling",
  "how-to-start-a-shadow-work-journal-when-you-want-structure-not-pressure":
    "Start a Shadow Work Journal",
  "shadow-work-prompts-for-beginners":
    "Shadow Work Prompts for Beginners",
  "what-is-a-shadow-work-journal-guide": "What Is a Shadow Work Journal?",
  "trigger-vs-glimmer-whats-the-difference":
    "Trigger vs. Glimmer Difference",
  "shadow-work-vs-mindfulness": "Shadow Work vs. Mindfulness",
  "how-to-use-a-shadow-work-app-without-overthinking-your-journals":
    "Using a Shadow Work App",
  "how-to-start-shadow-work-when-you-want-structure-not-pressure":
    "Start Shadow Work Gently",
  "what-are-glimmers-calm-guide-noticing-what-helps-you-settle":
    "What Are Glimmers?",
  "what-is-a-shadow-work-journal-a-calm-guide-to-starting-with-structure":
    "Shadow Work Journal Structure",
};

export function getBlogSeoTitle(post: BlogSeoFields) {
  return auditedBlogTitleOverrides[post.slug] ?? post.title;
}

export function getBlogImageAlt(post: BlogSeoFields) {
  const alt = post.featuredImageAlt?.trim();
  return alt || `${post.title} article image`;
}
