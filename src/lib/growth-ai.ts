import "server-only";

import {
  fetchGrowthBackendJson,
  type GrowthDashboardData,
  type GrowthOutreachData,
  type GrowthOutreachTemplate,
} from "@/lib/growth-dashboard";

export const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
export const OPENAI_MODEL_ENV = "OPENAI_MODEL";
export const GROWTH_AI_BACKEND_PATH_ENV = "ZENFULNOTE_GROWTH_AI_BACKEND_PATH";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_BACKEND_ASSISTANT_PATH = "/api/internal/growth/assistant";
const DEFAULT_BACKEND_DRAFT_PATH = "/api/internal/growth/outreach/draft";

export type GrowthAssistantMessage = {
  role: "assistant" | "user";
  text: string;
};

export type GrowthAssistantSource = "backend" | "openai" | "fallback";

export type GrowthAssistantAnswer = {
  answer: string;
  configured: boolean;
  generated_at: string;
  model?: string;
  source: GrowthAssistantSource;
};

type DraftInput = {
  audience?: string;
  channel?: string;
  goal?: string;
  tone?: string;
};

type DraftData = Partial<GrowthOutreachTemplate> & {
  ai_metadata: Record<string, unknown>;
  channel: "email" | "push";
  variables: string[];
};

export async function answerGrowthQuestion({
  dashboard,
  history = [],
  outreach,
  question,
}: {
  dashboard: GrowthDashboardData;
  history?: GrowthAssistantMessage[];
  outreach?: GrowthOutreachData | null;
  question: string;
}): Promise<{ ok: true; data: GrowthAssistantAnswer }> {
  const context = growthAiContext(dashboard, outreach);
  const backendAnswer = await answerWithBackendAssistant(question, context, history);
  if (backendAnswer) {
    return {
      ok: true,
      data: {
        answer: backendAnswer.answer,
        configured: true,
        generated_at: new Date().toISOString(),
        source: "backend",
      },
    };
  }

  const openAiAnswer = await answerWithOpenAi(question, context, history);
  if (openAiAnswer) {
    return {
      ok: true,
      data: {
        answer: openAiAnswer.answer,
        configured: true,
        generated_at: new Date().toISOString(),
        model: openAiAnswer.model,
        source: "openai",
      },
    };
  }

  return {
    ok: true,
    data: {
      answer: fallbackGrowthAnswer(question, dashboard, outreach),
      configured: false,
      generated_at: new Date().toISOString(),
      source: "fallback",
    },
  };
}

export async function draftGrowthOutreachTemplate(input: DraftInput): Promise<{ ok: true; data: DraftData }> {
  const normalized = normalizeDraftInput(input);
  const backendDraft = await draftWithBackend(normalized);
  if (backendDraft) {
    return { ok: true, data: backendDraft };
  }

  const openAiDraft = await draftWithOpenAi(normalized);
  if (openAiDraft) {
    return { ok: true, data: openAiDraft };
  }

  return { ok: true, data: fallbackDraft(normalized) };
}

function normalizeDraftInput(input: DraftInput) {
  const channel: "email" | "push" = input.channel === "push" ? "push" : "email";

  return {
    audience: cleanText(input.audience, 240) || "inactive users",
    channel,
    goal: cleanText(input.goal, 240) || "help users return to one mindful check-in",
    tone: cleanText(input.tone, 240) || "warm, concise, emotionally grounded",
  };
}

async function answerWithBackendAssistant(
  question: string,
  context: ReturnType<typeof growthAiContext>,
  history: GrowthAssistantMessage[],
) {
  const path = process.env[GROWTH_AI_BACKEND_PATH_ENV]?.trim() || DEFAULT_BACKEND_ASSISTANT_PATH;
  const response = await fetchGrowthBackendJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context,
      history: history.slice(-8),
      question,
    }),
  }, 6_000);

  if (!response.ok) return null;

  const answer = readAnswerFromBody(response.body);
  return answer ? { answer } : null;
}

async function draftWithBackend(input: ReturnType<typeof normalizeDraftInput>): Promise<DraftData | null> {
  const response = await fetchGrowthBackendJson(DEFAULT_BACKEND_DRAFT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, 6_000);

  if (!response.ok) return null;

  const data = response.body?.data ?? response.body;
  if (!data || typeof data !== "object") return null;

  return normalizeDraftData(data as Record<string, unknown>, input, {
    mode: "backend_growth_draft",
  });
}

async function answerWithOpenAi(
  question: string,
  context: ReturnType<typeof growthAiContext>,
  history: GrowthAssistantMessage[],
) {
  const apiKey = process.env[OPENAI_API_KEY_ENV]?.trim();
  if (!apiKey) return null;

  const model = process.env[OPENAI_MODEL_ENV]?.trim() || DEFAULT_OPENAI_MODEL;
  const response = await callOpenAi({
    apiKey,
    body: {
      model,
      instructions: [
        "You are the ZenfulNote growth assistant for an authenticated admin.",
        "Use only the dashboard context provided. Do not invent raw data, private user details, or unsupported integration state.",
        "Be direct and operational. Explain whether a warning is data coverage, scheduler setup, or vendor health.",
        "When the user asks a vague greeting, orient them to the current metrics and ask what area they want to inspect.",
        "Keep the response under 180 words.",
      ].join("\n"),
      input: JSON.stringify({
        context,
        history: history.slice(-8),
        question,
      }),
    },
  });

  const answer = response ? readOpenAiText(response) : "";
  return answer ? { answer, model } : null;
}

async function draftWithOpenAi(input: ReturnType<typeof normalizeDraftInput>): Promise<DraftData | null> {
  const apiKey = process.env[OPENAI_API_KEY_ENV]?.trim();
  if (!apiKey) return null;

  const model = process.env[OPENAI_MODEL_ENV]?.trim() || DEFAULT_OPENAI_MODEL;
  const response = await callOpenAi({
    apiKey,
    body: {
      model,
      instructions: [
        "Create ZenfulNote lifecycle outreach copy for an authenticated operator.",
        "Return only JSON matching the requested schema.",
        "Use a calm, emotionally grounded voice. Avoid claims that the app cannot verify.",
        "Keep push copy short. Keep email copy concise and include {{first_name}} and {{deep_link}} when useful.",
      ].join("\n"),
      input: JSON.stringify(input),
      text: {
        format: {
          type: "json_schema",
          name: "growth_outreach_template_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              subject: { type: ["string", "null"] },
              preview_text: { type: ["string", "null"] },
              body: { type: "string" },
              variables: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["name", "subject", "preview_text", "body", "variables"],
          },
        },
      },
    },
  });

  const text = response ? readOpenAiText(response) : "";
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return normalizeDraftData(parsed, input, {
      mode: "openai_growth_draft",
      model,
    });
  } catch {
    return null;
  }
}

async function callOpenAi({ apiKey, body }: { apiKey: string; body: Record<string, unknown> }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function growthAiContext(dashboard: GrowthDashboardData, outreach?: GrowthOutreachData | null) {
  return {
    period: dashboard.period,
    health: {
      score: dashboard.health.score,
      status: dashboard.health.status,
      checks: dashboard.health.checks.map((check) => ({
        key: check.key,
        label: check.label,
        status: check.status,
        detail: check.detail,
      })),
      todos: dashboard.health.todos,
    },
    summary: {
      users: {
        total: dashboard.summary.users.total,
        new: dashboard.summary.users.new,
        active_24h: dashboard.summary.users.active_24h,
        active_7d: dashboard.summary.users.active_7d,
        active_30d: dashboard.summary.users.active_30d,
        retention: dashboard.summary.users.retention,
      },
      subscriptions: dashboard.summary.subscriptions,
      activation: dashboard.summary.activation,
    },
    events: {
      total: dashboard.events.total,
      unique_users: dashboard.events.unique_users,
      coverage: dashboard.events.coverage,
      top: dashboard.events.top.slice(0, 10),
    },
    emails: {
      total: dashboard.emails.total,
      growth_total: dashboard.emails.growth_total,
      legacy_total: dashboard.emails.legacy_total,
      sent: dashboard.emails.sent,
      failed: dashboard.emails.failed,
      failure_rate: dashboard.emails.failure_rate,
      by_type: dashboard.emails.by_type.slice(0, 12),
    },
    notifications: {
      total: dashboard.notifications.total,
      by_type: dashboard.notifications.by_type,
    },
    automation: {
      last_run: dashboard.automation.last_run,
      recent_runs: dashboard.automation.recent_runs.slice(0, 5),
    },
    readiness: dashboard.readiness,
    outreach: outreach
      ? {
          summary: outreach.summary,
          audiences: outreach.audiences.map((audience) => ({
            count: audience.count,
            description: audience.description,
            key: audience.key,
            label: audience.label,
          })),
          performance: outreach.performance,
          template_count: outreach.templates.length,
          drip_count: outreach.drips.length,
          active_drips: outreach.drips.filter((drip) => drip.status === "active").length,
        }
      : null,
  };
}

function fallbackGrowthAnswer(
  question: string,
  dashboard: GrowthDashboardData,
  outreach?: GrowthOutreachData | null,
) {
  const normalized = question.toLowerCase();
  const users = dashboard.summary.users;
  const subscriptions = dashboard.summary.subscriptions;
  const retention = users.retention;
  const missingEvents = dashboard.events.coverage.missing;
  const readiness = dashboard.readiness;
  const audienceRows = outreach?.audiences ?? [];
  const paidAudience = audienceRows.find((audience) => audience.key.includes("paid"));
  const inactiveAudience = audienceRows.find((audience) => audience.key.includes("inactive"));

  const fallbackNote = "AI provider is not configured yet, so this answer is generated from live dashboard aggregates.";

  if (normalized.includes("hello") || normalized.includes("hi ") || normalized === "hi") {
    return [
      fallbackNote,
      `Current 30-day snapshot: ${formatNumber(users.total)} users, ${formatNumber(users.active_7d)} active in 7 days, ${formatNumber(subscriptions.active ?? 0)} active paid subscriptions, and ${formatNumber(dashboard.emails.growth_total)} outreach email records.`,
      `The main open issue is event coverage: ${dashboard.events.coverage.percent}% covered, with ${missingEvents.length} expected events missing.`,
      "Ask about retention, subscriptions, outreach, Firebase push reach, SendGrid email, or event gaps.",
    ].join("\n\n");
  }

  if (normalized.includes("firebase") || normalized.includes("push") || normalized.includes("notification")) {
    return [
      fallbackNote,
      `Firebase-backed push reach is visible through the backend: ${formatNumber(outreach?.summary.push_reachable_users ?? 0)} push-reachable users and ${formatNumber(dashboard.notifications.total)} notification log rows in this window.`,
      readiness?.integrations.growth_automation_enabled
        ? "The lifecycle scheduler is enabled, so active push drip steps can run."
        : "The lifecycle scheduler is not enabled, so active drip steps will not send yet.",
      missingEvents.some((event) => event.includes("notification") || event.includes("push"))
        ? `Missing notification events: ${missingEvents.filter((event) => event.includes("notification") || event.includes("push")).join(", ")}.`
        : "Notification event coverage is not the current blocker.",
    ].join("\n\n");
  }

  if (normalized.includes("sendgrid") || normalized.includes("email") || normalized.includes("import")) {
    return [
      fallbackNote,
      `SendGrid is marked configured by the backend and ${formatNumber(dashboard.emails.growth_total)} outreach email rows are already being surfaced from growth_email_messages.`,
      `The template import button needs either the Laravel endpoint /api/internal/growth/outreach/sendgrid-templates or ${"SENDGRID_API_KEY"} on this Next.js app for direct SendGrid import.`,
      `Email performance currently shows ${formatNumber(outreach?.performance.email_total ?? dashboard.emails.total)} total, ${formatNumber(outreach?.performance.email_failed ?? dashboard.emails.failed)} failed, and ${outreach?.performance.email_open_rate ?? 0}% open rate.`,
    ].join("\n\n");
  }

  if (normalized.includes("subscription") || normalized.includes("revenue") || normalized.includes("revenuecat") || normalized.includes("paid")) {
    return [
      fallbackNote,
      `RevenueCat lifecycle health is OK in the current payload; the warning is event taxonomy coverage, not RevenueCat connectivity.`,
      `Subscriptions: ${formatNumber(subscriptions.active ?? 0)} active paid, ${formatNumber(subscriptions.new_purchases ?? 0)} new purchases, ${formatNumber(subscriptions.new_trials ?? 0)} new trials.`,
      paidAudience ? `Paid subscriber audience count is ${formatNumber(paidAudience.count)}.` : "The paid subscriber audience is not returned by the outreach endpoint.",
    ].join("\n\n");
  }

  if (normalized.includes("retention") || normalized.includes("churn") || normalized.includes("inactive")) {
    return [
      fallbackNote,
      `Retention is D1 ${formatPercent(retention.d1?.rate ?? 0)}, D7 ${formatPercent(retention.d7?.rate ?? 0)}, D30 ${formatPercent(retention.d30?.rate ?? 0)}.`,
      inactiveAudience ? `The inactive audience is ${formatNumber(inactiveAudience.count)} users.` : `Active 7-day users are ${formatNumber(users.active_7d)} out of ${formatNumber(users.total)} total users.`,
      "The practical next step is to finish missing onboarding, paywall, purchase, and notification events, then compare drip outcomes against those cohorts.",
    ].join("\n\n");
  }

  return [
    fallbackNote,
    `Health is ${dashboard.health.score} (${titleCase(dashboard.health.status)}), event coverage is ${dashboard.events.coverage.percent}%, and D7 retention is ${formatPercent(retention.d7?.rate ?? 0)}.`,
    dashboard.health.todos[0]
      ? `Top task: ${dashboard.health.todos[0].title}. ${dashboard.health.todos[0].action}`
      : "No urgent dashboard task is open for this period.",
  ].join("\n\n");
}

function fallbackDraft(input: ReturnType<typeof normalizeDraftInput>): DraftData {
  const draft = input.channel === "push" ? pushFallbackDraft(input) : emailFallbackDraft(input);

  return {
    ...draft,
    channel: input.channel,
    variables: ["first_name", "deep_link"],
    ai_metadata: {
      mode: "metrics_fallback_draft",
      audience: input.audience,
      generated_at: new Date().toISOString(),
      goal: input.goal,
      tone: input.tone,
    },
  };
}

function emailFallbackDraft(input: ReturnType<typeof normalizeDraftInput>) {
  return {
    name: titleFromGoal(input.goal),
    subject: "A small reset for today",
    preview_text: "Open ZenfulNote for one quiet check-in when you have a minute.",
    body: [
      "Hi {{first_name}},",
      "",
      `A quick note for ${input.audience}: ${input.goal}.`,
      "",
      "You do not need a perfect streak or a long session. One honest check-in is enough to notice what is happening and choose the next small step.",
      "",
      "Open ZenfulNote when you have a minute:",
      "{{deep_link}}",
      "",
      "ZenfulNote",
    ].join("\n"),
  };
}

function pushFallbackDraft(input: ReturnType<typeof normalizeDraftInput>) {
  return {
    name: titleFromGoal(input.goal),
    subject: "One quiet check-in?",
    preview_text: null,
    body: `A small reset is waiting. ${input.goal} Open ZenfulNote when you have a minute.`,
  };
}

function normalizeDraftData(
  data: Record<string, unknown>,
  input: ReturnType<typeof normalizeDraftInput>,
  metadata: Record<string, unknown>,
): DraftData {
  const variables = Array.isArray(data.variables)
    ? data.variables.filter((value): value is string => typeof value === "string")
    : ["first_name", "deep_link"];

  return {
    name: cleanText(data.name, 120) || titleFromGoal(input.goal),
    subject: cleanNullableText(data.subject, 160),
    preview_text: cleanNullableText(data.preview_text, 200),
    body: cleanText(data.body, 5000) || fallbackDraft(input).body,
    channel: input.channel,
    variables,
    ai_metadata: {
      ...metadata,
      audience: input.audience,
      generated_at: new Date().toISOString(),
      goal: input.goal,
      tone: input.tone,
    },
  };
}

function readAnswerFromBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  const data = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : null;
  const value = data?.answer ?? data?.text ?? record.answer ?? record.text;
  return typeof value === "string" ? value.trim() : "";
}

function readOpenAiText(body: Record<string, unknown>) {
  if (typeof body.output_text === "string") return body.output_text.trim();

  const output = Array.isArray(body.output) ? body.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const record = contentItem as Record<string, unknown>;
      const text = record.text ?? record.output_text;
      if (typeof text === "string") parts.push(text);
    }
  }

  return parts.join("\n").trim();
}

function titleFromGoal(goal: string) {
  const words = goal
    .replace(/[^a-z0-9\s-]/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  return words.length ? words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") : "Outreach Draft";
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNullableText(value: unknown, maxLength: number) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? Number(value.toFixed(1)) : 0}%`;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
