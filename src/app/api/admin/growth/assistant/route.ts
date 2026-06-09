import { adminApiUnauthorized } from "@/lib/admin-auth";
import { answerGrowthQuestion, type GrowthAssistantMessage } from "@/lib/growth-ai";
import { getGrowthDashboard, getGrowthOutreach } from "@/lib/growth-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssistantPayload = {
  days?: number;
  history?: GrowthAssistantMessage[];
  question?: string;
};

export async function POST(request: Request) {
  const authError = await adminApiUnauthorized();
  if (authError) return authError;

  const payload = (await request.json().catch(() => ({}))) as AssistantPayload;
  const question = typeof payload.question === "string" ? payload.question.trim().slice(0, 600) : "";
  if (!question) {
    return Response.json({ ok: false, error: "Question is required." }, { status: 422 });
  }

  const days = Number.isFinite(payload.days) ? Number(payload.days) : 30;
  const [dashboardResult, outreachResult] = await Promise.all([
    getGrowthDashboard(days),
    getGrowthOutreach(),
  ]);

  const result = await answerGrowthQuestion({
    dashboard: dashboardResult.data,
    history: sanitizeHistory(payload.history),
    outreach: outreachResult.ok ? outreachResult.data : null,
    question,
  });

  return Response.json(result);
}

function sanitizeHistory(history: unknown): GrowthAssistantMessage[] {
  if (!Array.isArray(history)) return [];

  return history.flatMap((message): GrowthAssistantMessage[] => {
    if (!message || typeof message !== "object") return [];
    const record = message as Record<string, unknown>;
    const role: GrowthAssistantMessage["role"] | null =
      record.role === "assistant" ? "assistant" : record.role === "user" ? "user" : null;
    const text = typeof record.text === "string" ? record.text.trim().slice(0, 1000) : "";

    return role && text ? [{ role, text }] : [];
  }).slice(-8);
}
