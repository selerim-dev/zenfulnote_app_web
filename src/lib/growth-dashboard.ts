import "server-only";

export const BACKEND_URL_ENV = "ZENFULNOTE_BACKEND_URL";
export const GROWTH_DASHBOARD_KEY_ENV = "ZENFULNOTE_GROWTH_DASHBOARD_KEY";
export const BACKEND_URL_FALLBACK_ENV = "ZENFULNOTE_API_BASE_URL";
export const GROWTH_DASHBOARD_KEY_FALLBACK_ENV = "GROWTH_DASHBOARD_API_KEY";

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
  updated_at?: string | null;
};

type GrowthDashboardResult =
  | { ok: true; data: GrowthDashboardData; error?: never }
  | { ok: false; data: GrowthDashboardData; error: string };

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
    const response = await fetch(endpoint, {
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

  const response = await fetch(growthEndpoint("/api/internal/growth/run-lifecycle"), {
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

function growthEndpoint(pathname: string) {
  const baseUrl =
    process.env[BACKEND_URL_ENV]?.trim() ||
    process.env[BACKEND_URL_FALLBACK_ENV]?.trim() ||
    "https://zenfulnote.co/zenful";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(pathname.replace(/^\//, ""), normalizedBase).toString();
}

function growthDashboardKey() {
  return (
    process.env[GROWTH_DASHBOARD_KEY_ENV]?.trim() ||
    process.env[GROWTH_DASHBOARD_KEY_FALLBACK_ENV]?.trim() ||
    ""
  );
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
        lifecycle: growthEndpoint("/api/internal/growth/run-lifecycle"),
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
