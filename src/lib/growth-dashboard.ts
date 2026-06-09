import "server-only";

export const BACKEND_URL_ENV = "ZENFULNOTE_BACKEND_URL";
export const GROWTH_DASHBOARD_KEY_ENV = "ZENFULNOTE_GROWTH_DASHBOARD_KEY";
export const BACKEND_URL_FALLBACK_ENV = "ZENFULNOTE_API_BASE_URL";
export const GROWTH_DASHBOARD_KEY_FALLBACK_ENV = "GROWTH_DASHBOARD_API_KEY";
export const SENDGRID_API_KEY_ENV = "SENDGRID_API_KEY";

const GROWTH_FETCH_TIMEOUT_MS = 25_000;

export type GrowthDashboardData = {
  generated_at: string;
  period: {
    days: number;
    start: string;
    end: string;
  };
  health: {
    score: number;
    status: "healthy" | "watch" | "needs_attention" | string;
    checks: GrowthHealthCheck[];
    todos: GrowthTodo[];
  };
  summary: {
    users: {
      total: number;
      new: number;
      active_24h: number;
      active_7d: number;
      active_30d: number;
      retention: Record<string, { cohort: number; retained: number; rate: number }>;
    };
    subscriptions: Record<string, number>;
    activation: Record<string, number>;
  };
  funnel: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  activity?: {
    daily_active_users: GrowthTrendPoint[];
    request_volume: GrowthTrendPoint[];
    total_requests: number;
    peak_active_day?: GrowthTrendPoint | null;
    peak_request_day?: GrowthTrendPoint | null;
  };
  events: {
    total: number;
    unique_users: number;
    anonymous_users?: number;
    top: Array<{ event_name: string; count: number }>;
    recent: Array<{
      event_name: string;
      source: string;
      user_id?: number | null;
      created_at: string;
    }>;
    coverage: {
      tracked: number;
      expected: number;
      percent: number;
      missing: string[];
    };
    daily: Array<{ date: string; count: number }>;
  };
  emails: {
    total: number;
    growth_total: number;
    legacy_total: number;
    sent: number;
    failed: number;
    failure_rate: number;
    by_type: Array<{ email_type: string; status: string; count: number }>;
    recent: Array<{
      provider: string;
      email_type: string;
      status: string;
      recipient_domain?: string | null;
      created_at: string;
    }>;
  };
  notifications: {
    total: number;
    by_type: Array<{ notification_type: string; count: number }>;
  };
  automation: {
    last_run: GrowthAutomationRun | null;
    recent_runs: GrowthAutomationRun[];
  };
  content?: GrowthContentInventory;
  vendor_health: GrowthHealthCheck[];
  readiness?: GrowthReadiness;
};

export type GrowthTrendPoint = {
  date: string;
  count: number;
};

export type GrowthHealthCheck = {
  key: string;
  label: string;
  status: "ok" | "watch" | "needs_setup" | "needs_attention" | string;
  detail: string;
};

export type GrowthTodo = {
  severity: "high" | "medium" | "low" | string;
  title: string;
  action: string;
};

export type GrowthAutomationRun = {
  run_type: string;
  status: string;
  health_score?: number | null;
  metrics: Record<string, unknown>;
  recommendations: GrowthTodo[];
  started_at?: string | null;
  finished_at?: string | null;
};

export type GrowthReadiness = {
  status: "ready" | "needs_setup" | string;
  ready_count: number;
  required_count: number;
  backend: {
    app_url?: string | null;
    environment?: string | null;
    timezone?: string | null;
  };
  endpoints: Record<string, string>;
  tables: Record<string, boolean>;
  integrations: Record<string, boolean>;
};

export type GrowthContentInventory = {
  counts: Record<string, number>;
  recent: Record<string, GrowthContentRow[]>;
  api_surfaces: Array<{
    key: string;
    label: string;
    method: string;
    path: string;
  }>;
};

export type GrowthContentRow = {
  id?: number | string;
  title?: string | null;
  subtitle?: string | null;
  sub_title?: string | null;
  content?: string | null;
  artist?: string | null;
  audio_link?: string | null;
  cat_id?: string | number | null;
  cover_image?: string | null;
  desc?: string | null;
  description?: string | null;
  duration?: string | number | null;
  file?: string | null;
  is_trending?: boolean | number | null;
  share_link?: string | null;
  status?: string | null;
  thumbnail?: string | null;
  time?: string | number | null;
  type?: string | null;
  user_id?: string | number | null;
  video?: string | null;
  jounral_name?: string | null;
  activity_type?: string | null;
  activity_id?: number | string | null;
  partner_content?: boolean;
  is_partner_content?: boolean | number | null;
  partner_id?: string | number | null;
  audio_category_id?: string | number | null;
  search_string?: string | null;
  spotify_url?: string | null;
  author?: string | null;
  audio_file?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  preview?: {
    video_url?: string | null;
    thumbnail_url?: string | null;
    audio_url?: string | null;
  };
};

export type GrowthOutreachTemplate = {
  id: number;
  name: string;
  slug: string;
  channel: "email" | "push" | string;
  category?: string | null;
  status: "draft" | "active" | "archived" | string;
  subject?: string | null;
  preview_text?: string | null;
  body?: string | null;
  variables?: string[] | Record<string, unknown> | null;
  external_provider?: string | null;
  external_template_id?: string | null;
  external_generation?: string | null;
  external_updated_at?: string | null;
  external_metadata?: Record<string, unknown> | null;
  ai_metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GrowthSendGridTemplate = {
  id: string;
  name: string;
  generation?: string | null;
  updated_at?: string | null;
  linked_template_id?: number | null;
  active_version?: {
    id?: string | null;
    name?: string | null;
    subject?: string | null;
    thumbnail_url?: string | null;
    updated_at?: string | null;
  } | null;
};

export type GrowthOutreachStep = {
  id?: number;
  drip_id?: number;
  template_id?: number | null;
  name: string;
  channel: "email" | "push" | string;
  trigger_key?: string | null;
  delay_amount: number;
  delay_unit: "minutes" | "hours" | "days" | string;
  status: "active" | "paused" | string;
  metadata?: Record<string, unknown> | null;
};

export type GrowthOutreachDrip = {
  id: number;
  name: string;
  slug: string;
  status: "draft" | "active" | "paused" | "archived" | string;
  audience_key?: string | null;
  goal?: string | null;
  description?: string | null;
  channel_mix?: Record<string, unknown> | null;
  steps?: GrowthOutreachStep[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type GrowthOutreachAudience = {
  key: string;
  label: string;
  count: number;
  description: string;
};

export type GrowthOutreachData = {
  summary: {
    active_templates: number;
    draft_templates: number;
    active_drips: number;
    draft_drips: number;
    emailable_users: number;
    push_reachable_users: number;
    email_failure_rate: number;
  };
  templates: GrowthOutreachTemplate[];
  drips: GrowthOutreachDrip[];
  audiences: GrowthOutreachAudience[];
  performance: {
    email_total: number;
    email_sent: number;
    email_opened: number;
    email_clicked: number;
    email_failed: number;
    email_failure_rate: number;
    email_open_rate: number;
    email_click_rate: number;
    push_total: number;
    status_mix: Array<{ status: string; count: number }>;
    updated_at?: string | null;
  };
};

type GrowthDashboardResult =
  | { ok: true; data: GrowthDashboardData; error?: never }
  | { ok: false; data: GrowthDashboardData; error: string };

type GrowthOutreachResult =
  | { ok: true; data: GrowthOutreachData; error?: never }
  | { ok: false; data?: never; error: string };

export async function getGrowthDashboard(days = 30): Promise<GrowthDashboardResult> {
  const key = growthDashboardKey();
  if (!key) {
    return {
      ok: false,
      data: fallbackGrowthDashboard(`Set ${GROWTH_DASHBOARD_KEY_ENV} to connect Laravel growth data.`),
      error: `${GROWTH_DASHBOARD_KEY_ENV} is not configured.`,
    };
  }

  const endpoint = growthEndpoint(`/api/internal/growth/dashboard?days=${days}`);

  try {
    const response = await fetchWithTimeout(endpoint, {
      cache: "no-store",
      headers: {
        "X-Growth-Dashboard-Key": key,
        Accept: "application/json",
      },
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.data) {
      return {
        ok: false,
        data: fallbackGrowthDashboard(body?.message ?? "Growth dashboard API returned an error."),
        error: body?.message ?? `Growth dashboard API returned ${response.status}.`,
      };
    }

    return {
      ok: true,
      data: body.data as GrowthDashboardData,
    };
  } catch (error) {
    return {
      ok: false,
      data: fallbackGrowthDashboard(error instanceof Error ? error.message : "Growth dashboard API is unreachable."),
      error: error instanceof Error ? error.message : "Growth dashboard API is unreachable.",
    };
  }
}

export async function runGrowthLifecycleDryRun() {
  const key = growthDashboardKey();
  if (!key) {
    return { ok: false, error: `${GROWTH_DASHBOARD_KEY_ENV} is not configured.` };
  }

  const response = await fetchWithTimeout(growthEndpoint("/api/internal/growth/run-lifecycle"), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Growth-Dashboard-Key": key,
      Accept: "application/json",
    },
    body: JSON.stringify({ dry_run: true }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, error: body?.message ?? `Lifecycle dry run failed with ${response.status}.` };
  }

  return { ok: true, data: body?.data };
}

export async function getGrowthContent(type: string, id: string) {
  const key = growthDashboardKey();
  if (!key) {
    return { ok: false, error: `${GROWTH_DASHBOARD_KEY_ENV} is not configured.` };
  }

  const response = await fetchWithTimeout(growthEndpoint(`/api/internal/growth/content/${type}/${id}`), {
    cache: "no-store",
    headers: {
      "X-Growth-Dashboard-Key": key,
      Accept: "application/json",
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data) {
    return { ok: false, error: body?.message ?? `Content request failed with ${response.status}.` };
  }

  return { ok: true, data: body.data as GrowthContentRow };
}

export async function updateGrowthContent(type: string, id: string, formData: FormData) {
  const key = growthDashboardKey();
  if (!key) {
    return { ok: false, error: `${GROWTH_DASHBOARD_KEY_ENV} is not configured.` };
  }

  const response = await fetchWithTimeout(growthEndpoint(`/api/internal/growth/content/${type}/${id}`), {
    method: "POST",
    cache: "no-store",
    headers: {
      "X-Growth-Dashboard-Key": key,
      Accept: "application/json",
    },
    body: formData,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data) {
    return { ok: false, error: body?.message ?? `Content update failed with ${response.status}.` };
  }

  return { ok: true, data: body.data as GrowthContentRow };
}

export async function getGrowthOutreach(): Promise<GrowthOutreachResult> {
  const key = growthDashboardKey();
  if (!key) {
    return { ok: false, error: `${GROWTH_DASHBOARD_KEY_ENV} is not configured.` };
  }

  const response = await fetchWithTimeout(growthEndpoint("/api/internal/growth/outreach"), {
    cache: "no-store",
    headers: {
      "X-Growth-Dashboard-Key": key,
      Accept: "application/json",
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data) {
    return { ok: false, error: body?.message ?? `Outreach request failed with ${response.status}.` };
  }

  return { ok: true, data: body.data as GrowthOutreachData };
}

export async function getSendGridTemplates() {
  const key = growthDashboardKey();
  let backendError = "";

  if (key) {
    const response = await fetchWithTimeout(growthEndpoint("/api/internal/growth/outreach/sendgrid-templates"), {
      cache: "no-store",
      headers: {
        "X-Growth-Dashboard-Key": key,
        Accept: "application/json",
      },
    });

    const body = await response.json().catch(() => null);
    if (response.ok && body?.data?.templates) {
      return { ok: true, data: body.data.templates as GrowthSendGridTemplate[] };
    }

    backendError = body?.message || `Laravel SendGrid template endpoint returned ${response.status}.`;
  } else {
    backendError = `${GROWTH_DASHBOARD_KEY_ENV} is not configured.`;
  }

  const directResult = await getSendGridTemplatesDirectly();
  if (directResult.ok) {
    return directResult;
  }

  return {
    ok: false,
    error: `${backendError} ${directResult.error}`,
  };
}

export async function saveGrowthOutreachTemplate(
  payload: Partial<GrowthOutreachTemplate>,
  id?: number,
) {
  return saveGrowthOutreachResource<GrowthOutreachTemplate>(
    id ? `/api/internal/growth/outreach/templates/${id}` : "/api/internal/growth/outreach/templates",
    payload,
  );
}

export async function saveGrowthOutreachDrip(
  payload: Partial<GrowthOutreachDrip>,
  id?: number,
) {
  return saveGrowthOutreachResource<GrowthOutreachDrip>(
    id ? `/api/internal/growth/outreach/drips/${id}` : "/api/internal/growth/outreach/drips",
    payload,
  );
}

async function saveGrowthOutreachResource<T>(pathname: string, payload: unknown) {
  const key = growthDashboardKey();
  if (!key) {
    return { ok: false, error: `${GROWTH_DASHBOARD_KEY_ENV} is not configured.` };
  }

  const response = await fetchWithTimeout(growthEndpoint(pathname), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Growth-Dashboard-Key": key,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data) {
    return { ok: false, error: body?.message ?? `Outreach save failed with ${response.status}.` };
  }

  return { ok: true, data: body.data as T };
}

export function growthEndpoint(pathname: string) {
  const baseUrl =
    process.env[BACKEND_URL_ENV]?.trim() ||
    process.env[BACKEND_URL_FALLBACK_ENV]?.trim() ||
    "https://zenfulnote.co/zenful";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(pathname.replace(/^\//, ""), normalizedBase).toString();
}

export function growthDashboardKey() {
  return (
    process.env[GROWTH_DASHBOARD_KEY_ENV]?.trim() ||
    process.env[GROWTH_DASHBOARD_KEY_FALLBACK_ENV]?.trim() ||
    ""
  );
}

export async function fetchGrowthBackendJson(pathname: string, init: RequestInit = {}, timeoutMs = GROWTH_FETCH_TIMEOUT_MS) {
  const key = growthDashboardKey();
  if (!key) {
    return { ok: false as const, status: 503, body: null, error: `${GROWTH_DASHBOARD_KEY_ENV} is not configured.` };
  }

  try {
    const response = await fetchWithTimeout(growthEndpoint(pathname), {
      ...init,
      cache: "no-store",
      headers: {
        "X-Growth-Dashboard-Key": key,
        Accept: "application/json",
        ...init.headers,
      },
    }, timeoutMs);
    const body = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      body,
      error: response.ok ? undefined : body?.message ?? body?.error ?? `Growth backend returned ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : "Growth backend is unreachable.",
    };
  }
}

async function getSendGridTemplatesDirectly() {
  const apiKey = process.env[SENDGRID_API_KEY_ENV]?.trim();
  if (!apiKey) {
    return {
      ok: false as const,
      error: `Set ${SENDGRID_API_KEY_ENV} in this Next.js app, or add /api/internal/growth/outreach/sendgrid-templates to the Laravel backend.`,
    };
  }

  const endpoint = new URL("https://api.sendgrid.com/v3/templates");
  endpoint.searchParams.set("generations", "dynamic");
  endpoint.searchParams.set("page_size", "200");

  try {
    const response = await fetchWithTimeout(endpoint.toString(), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(body?.result)) {
      return {
        ok: false as const,
        error: body?.errors?.[0]?.message ?? body?.message ?? `Direct SendGrid template request failed with ${response.status}.`,
      };
    }

    return {
      ok: true as const,
      data: body.result.map(sendGridTemplateFromApi),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Direct SendGrid template request failed.",
    };
  }
}

function sendGridTemplateFromApi(template: Record<string, unknown>): GrowthSendGridTemplate {
  const versions = Array.isArray(template.versions) ? template.versions : [];
  const activeVersion = versions.find((version) => {
    if (!version || typeof version !== "object") return false;
    const active = (version as Record<string, unknown>).active;
    return active === 1 || active === true;
  }) as Record<string, unknown> | undefined;

  return {
    id: String(template.id ?? ""),
    name: String(template.name ?? "Untitled SendGrid template"),
    generation: typeof template.generation === "string" ? template.generation : "dynamic",
    updated_at: typeof template.updated_at === "string" ? template.updated_at : null,
    active_version: activeVersion
      ? {
          id: typeof activeVersion.id === "string" ? activeVersion.id : null,
          name: typeof activeVersion.name === "string" ? activeVersion.name : null,
          subject: typeof activeVersion.subject === "string" ? activeVersion.subject : null,
          thumbnail_url: typeof activeVersion.thumbnail_url === "string" ? activeVersion.thumbnail_url : null,
          updated_at: typeof activeVersion.updated_at === "string" ? activeVersion.updated_at : null,
        }
      : null,
  };
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = GROWTH_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function fallbackGrowthDashboard(message: string): GrowthDashboardData {
  const hasDashboardKey = Boolean(growthDashboardKey());

  return {
    generated_at: new Date().toISOString(),
    period: {
      days: 30,
      start: "",
      end: "",
    },
    health: {
      score: 42,
      status: "needs_attention",
      checks: [
        {
          key: "setup",
          label: "Growth data API",
          status: "needs_setup",
          detail: message,
        },
      ],
      todos: [
        {
          severity: "high",
          title: "Connect the Laravel growth endpoint",
          action: `Set ${BACKEND_URL_ENV} and ${GROWTH_DASHBOARD_KEY_ENV} in this deployment.`,
        },
      ],
    },
    summary: {
      users: {
        total: 0,
        new: 0,
        active_24h: 0,
        active_7d: 0,
        active_30d: 0,
        retention: {
          d1: { cohort: 0, retained: 0, rate: 0 },
          d7: { cohort: 0, retained: 0, rate: 0 },
          d30: { cohort: 0, retained: 0, rate: 0 },
        },
      },
      subscriptions: {
        active: 0,
        new_trials: 0,
        new_purchases: 0,
        churned: 0,
      },
      activation: {
        check_ins: 0,
        triggers: 0,
        glimmers: 0,
        journals: 0,
        daily_request_users: 0,
      },
    },
    funnel: [],
    activity: {
      daily_active_users: [],
      request_volume: [],
      total_requests: 0,
      peak_active_day: null,
      peak_request_day: null,
    },
    events: {
      total: 0,
      unique_users: 0,
      anonymous_users: 0,
      top: [],
      recent: [],
      coverage: {
        tracked: 0,
        expected: 0,
        percent: 0,
        missing: [],
      },
      daily: [],
    },
    emails: {
      total: 0,
      growth_total: 0,
      legacy_total: 0,
      sent: 0,
      failed: 0,
      failure_rate: 0,
      by_type: [],
      recent: [],
    },
    notifications: {
      total: 0,
      by_type: [],
    },
    automation: {
      last_run: null,
      recent_runs: [],
    },
    content: {
      counts: {
        meditations: 0,
        exercises: 0,
        audio: 0,
        affirmations: 0,
        quotes: 0,
        journals: 0,
      },
      recent: {},
      api_surfaces: [],
    },
    vendor_health: [],
    readiness: {
      status: "needs_setup",
      ready_count: hasDashboardKey ? 1 : 0,
      required_count: 1,
      backend: {
        app_url: process.env[BACKEND_URL_ENV] ?? process.env[BACKEND_URL_FALLBACK_ENV] ?? "https://zenfulnote.co/zenful",
        environment: "unknown",
        timezone: "unknown",
      },
      endpoints: {
        dashboard: growthEndpoint("/api/internal/growth/dashboard"),
        outreach: growthEndpoint("/api/internal/growth/outreach"),
        client_events: growthEndpoint("/api/growth/events"),
        client_events_public: growthEndpoint("/api/growth/events/public"),
      },
      tables: {},
      integrations: {
        dashboard_key: hasDashboardKey,
      },
    },
  };
}
