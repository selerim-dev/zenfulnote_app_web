import { adminApiUnauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DraftPayload = {
  audience?: string;
  channel?: string;
  goal?: string;
  tone?: string;
};

export async function POST(request: Request) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const payload = (await request.json().catch(() => ({}))) as DraftPayload;
  const audience = cleanText(payload.audience) || "inactive users";
  const goal = cleanText(payload.goal) || "help users return to one mindful check-in";
  const channel = payload.channel === "push" ? "push" : "email";
  const tone = cleanText(payload.tone) || "warm, concise, emotionally grounded";
  const draft = channel === "push"
    ? pushDraft(audience, goal, tone)
    : emailDraft(audience, goal, tone);

  return Response.json({
    ok: true,
    data: {
      ...draft,
      channel,
      variables: ["first_name", "deep_link"],
      ai_metadata: {
        mode: "local_outreach_draft",
        audience,
        goal,
        tone,
        generated_at: new Date().toISOString(),
      },
    },
  });
}

function emailDraft(audience: string, goal: string, tone: string) {
  return {
    name: titleFromGoal(goal),
    subject: "A small reset for today",
    preview_text: "Open ZenfulNote for one quiet check-in when you have a minute.",
    body: [
      "Hi {{first_name}},",
      "",
      `A quick note for ${audience}: ${goal}.`,
      "",
      "You do not need a perfect streak or a long session. One honest check-in is enough to notice what is happening and choose the next small step.",
      "",
      "Open ZenfulNote when you have a minute:",
      "{{deep_link}}",
      "",
      `Tone: ${tone}.`,
      "",
      "ZenfulNote",
    ].join("\n"),
  };
}

function pushDraft(audience: string, goal: string, tone: string) {
  return {
    name: titleFromGoal(goal),
    subject: "One quiet check-in?",
    preview_text: null,
    body: `A small reset is waiting. ${goal} Open ZenfulNote when you have a minute. (${audience}; ${tone})`,
  };
}

function titleFromGoal(goal: string) {
  const words = goal
    .replace(/[^a-z0-9\s-]/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  return words.length ? words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") : "Outreach Draft";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 240) : "";
}
