"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Database as DatabaseIcon,
  ExternalLink,
  Eye,
  FileText,
  Gauge,
  HeartPulse,
  ImageIcon,
  LayoutDashboard,
  Mail,
  Maximize2,
  MessageCircle,
  Music,
  PenLine,
  PlayCircle,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { BlogAdmin, type AdminBlogArticle } from "@/components/blog-admin";
import type {
  GrowthContentInventory,
  GrowthContentRow,
  GrowthDashboardData,
  GrowthHealthCheck,
  GrowthOutreachAudience,
  GrowthOutreachData,
  GrowthOutreachDrip,
  GrowthOutreachStep,
  GrowthOutreachTemplate,
  GrowthReadiness,
  GrowthSendGridTemplate,
  GrowthTrendPoint,
} from "@/lib/growth-dashboard";

type AdminConsoleProps = {
  articles: AdminBlogArticle[];
  dashboard: GrowthDashboardData;
  dashboardInitiallyLoaded?: boolean;
  dashboardError?: string | null;
  initialNotice?: Toast | null;
};

type Toast = {
  tone: "success" | "warning" | "danger" | "info";
  message: string;
  sticky?: boolean;
};

type AdminPageKey =
  | "overview"
  | "retention"
  | "events"
  | "outreach"
  | "content"
  | "blogs"
  | "system";

type ContentKey = "meditations" | "exercises" | "audio" | "affirmations" | "quotes" | "journals";
type OutreachViewKey = "performance" | "templates" | "drips" | "audiences" | "email" | "notifications";

type DetailView = {
  eyebrow?: string;
  title: string;
  description?: string | null;
  chart?: {
    color: string;
    data: GrowthTrendPoint[];
    value: string;
  };
  rows?: Array<{ label: string; value: string | number | boolean | null | undefined }>;
};

type ContentEditorState = {
  type: ContentKey;
  row: GrowthContentRow;
  mode: "view" | "edit";
  loading: boolean;
  saving: boolean;
  error?: string;
};

type OutreachTemplateForm = {
  id?: number;
  name: string;
  channel: "email" | "push";
  category: string;
  status: "draft" | "active" | "archived";
  subject: string;
  preview_text: string;
  body: string;
  external_provider: "" | "sendgrid";
  external_template_id: string;
  external_generation: string;
  external_updated_at: string;
  external_metadata?: Record<string, unknown> | null;
};

type OutreachDripForm = {
  id?: number;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  audience_key: string;
  goal: string;
  description: string;
  steps: OutreachDripFormStep[];
};

type OutreachDripFormStep = {
  id?: number;
  local_id: string;
  name: string;
  channel: "email" | "push";
  template_id: string;
  trigger_key: string;
  delay_amount: string;
  delay_unit: "minutes" | "hours" | "days";
  status: "active" | "paused";
};

const periodOptions = [7, 14, 30, 60, 90] as const;
const retentionTargets = {
  d1: 25,
  d7: 10,
  d30: 5,
};

const pages: Array<{ key: AdminPageKey; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "retention", label: "Retention", icon: HeartPulse },
  { key: "events", label: "Events", icon: ClipboardList },
  { key: "outreach", label: "Outreach", icon: Mail },
  { key: "content", label: "Content", icon: BookOpen },
  { key: "blogs", label: "Blogs", icon: FileText },
  { key: "system", label: "System", icon: ShieldCheck },
];

const outreachViews: Array<{ key: OutreachViewKey; label: string }> = [
  { key: "performance", label: "Performance" },
  { key: "templates", label: "Templates" },
  { key: "drips", label: "Drips" },
  { key: "audiences", label: "Audiences" },
  { key: "email", label: "Email stream" },
  { key: "notifications", label: "Notifications" },
];

const dripTriggerOptions: Array<[string, string]> = [
  ["user_joined", "User joined"],
  ["drip_enrolled", "Drip enrollment"],
  ["last_active", "Last active"],
  ["absolute", "Absolute/manual"],
];

const contentTabs: Array<{ key: ContentKey; label: string; icon: LucideIcon }> = [
  { key: "meditations", label: "Meditations", icon: Sparkles },
  { key: "exercises", label: "Exercises", icon: Zap },
  { key: "audio", label: "Audio", icon: Music },
  { key: "affirmations", label: "Affirmations", icon: PenLine },
  { key: "quotes", label: "Quotes", icon: Quote },
  { key: "journals", label: "Journals", icon: BookOpen },
];

const mediaContentTypes = new Set<ContentKey>(["meditations", "exercises", "audio"]);

export function AdminConsole({
  articles,
  dashboard: initialDashboard,
  dashboardInitiallyLoaded = true,
  dashboardError,
  initialNotice,
}: AdminConsoleProps) {
  const [activePage, setActivePage] = useState<AdminPageKey>("overview");
  const [contentTab, setContentTab] = useState<ContentKey>("meditations");
  const [outreachView, setOutreachView] = useState<OutreachViewKey>("performance");
  const [periodDays, setPeriodDays] = useState(initialDashboard.period.days || 30);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [dashboardLoaded, setDashboardLoaded] = useState(dashboardInitiallyLoaded);
  const [dashboardLoading, setDashboardLoading] = useState(!dashboardInitiallyLoaded);
  const [dashboardErrorState, setDashboardErrorState] = useState(dashboardError ?? "");
  const [outreachData, setOutreachData] = useState<GrowthOutreachData | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachLoaded, setOutreachLoaded] = useState(false);
  const [outreachLoadAttempted, setOutreachLoadAttempted] = useState(false);
  const [toast, setToast] = useState<Toast | null>(
    initialNotice ?? (dashboardError ? { tone: "warning", message: dashboardError } : null),
  );
  const [detailView, setDetailView] = useState<DetailView | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!toast || toast.sticky) return;
    const timeout = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const users = dashboard.summary.users;
  const subscriptions = dashboard.summary.subscriptions;
  const readiness = dashboard.readiness ?? fallbackReadiness();
  const dauTrend = dashboard.activity?.daily_active_users ?? [];
  const requestTrend = dashboard.activity?.request_volume ?? [];
  const openWork = dashboard.health.todos.length;

  async function refreshDashboard({ days = periodDays, quiet = false }: { days?: number; quiet?: boolean } = {}) {
    setDashboardLoading(true);
    if (!quiet) {
      setToast({ tone: "info", sticky: true, message: `Refreshing ${days}-day dashboard data.` });
    }

    try {
      const response = await fetch(`/api/admin/growth/dashboard?days=${days}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok || !body?.data) {
        const message = body?.error ?? "Dashboard data could not be loaded.";
        setDashboardErrorState(message);
        setToast({ tone: "warning", message });
        return;
      }

      setDashboard(body.data as GrowthDashboardData);
      setPeriodDays((body.data as GrowthDashboardData).period.days || days);
      setDashboardLoaded(true);
      setDashboardErrorState("");
      if (!quiet) {
        setToast({ tone: "success", message: "Dashboard data refreshed." });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard data could not be loaded.";
      setDashboardErrorState(message);
      setToast({ tone: "warning", message });
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    if (!dashboardInitiallyLoaded) {
      const timeout = window.setTimeout(() => {
        void refreshDashboard({ days: periodDays, quiet: true });
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshOutreach({ quiet = false }: { quiet?: boolean } = {}) {
    setOutreachLoading(true);
    setOutreachLoadAttempted(true);
    if (!quiet) {
      setToast({ tone: "info", sticky: true, message: "Refreshing outreach workspace." });
    }

    try {
      const response = await fetch("/api/admin/growth/outreach", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok || !body?.data) {
        const message = body?.error ?? "Outreach data could not be loaded.";
        setToast({ tone: "warning", message });
        return;
      }

      setOutreachData(body.data as GrowthOutreachData);
      setOutreachLoaded(true);
      if (!quiet) {
        setToast({ tone: "success", message: "Outreach workspace refreshed." });
      }
    } catch (error) {
      setToast({
        tone: "danger",
        message: error instanceof Error ? error.message : "Outreach data could not be loaded.",
      });
    } finally {
      setOutreachLoading(false);
    }
  }

  useEffect(() => {
    if (activePage === "outreach" && !outreachLoaded && !outreachLoading && !outreachLoadAttempted) {
      const timeout = window.setTimeout(() => {
        void refreshOutreach({ quiet: true });
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [activePage, outreachLoaded, outreachLoading, outreachLoadAttempted]);

  async function saveOutreachTemplate(payload: Partial<GrowthOutreachTemplate>, id?: number) {
    const response = await fetch(id ? `/api/admin/growth/outreach/templates/${id}` : "/api/admin/growth/outreach/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.ok) {
      throw new Error(body?.error ?? "Template save failed.");
    }

    await refreshOutreach({ quiet: true });
    setToast({ tone: "success", message: "Template saved." });
  }

  async function saveOutreachDrip(payload: Partial<GrowthOutreachDrip>, id?: number) {
    const response = await fetch(id ? `/api/admin/growth/outreach/drips/${id}` : "/api/admin/growth/outreach/drips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.ok) {
      throw new Error(body?.error ?? "Drip save failed.");
    }

    await refreshOutreach({ quiet: true });
    setToast({ tone: "success", message: "Drip saved." });
  }

  return (
    <main className="relative isolate flex h-dvh min-h-0 overflow-hidden bg-[#f7f2f9] text-black">
      <Image
        src="/images/generated/brand-atmosphere-light.png"
        alt=""
        fill
        className="absolute inset-0 -z-20 object-cover opacity-72"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(80,104,231,0.20),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(234,111,207,0.16),transparent_30%),linear-gradient(180deg,rgba(251,250,246,0.70),rgba(251,250,246,0.86))]" />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-white/55 bg-white/34 shadow-[0_12px_42px_rgba(30,32,50,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl">
          <div className="relative grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 sm:px-4 lg:grid-cols-[minmax(190px,1fr)_auto_minmax(190px,1fr)]">
            <div className="relative z-10 flex min-w-0 items-center gap-3 pr-2 lg:justify-self-start">
              <Image
                src="/images/brand/app-icon-1024.png"
                alt=""
                width={38}
                height={38}
                className="size-9 rounded-lg border border-black/10"
                priority
              />
              <div className="min-w-0">
                <Image
                  src="/images/brand/wordmark-white-large.png"
                  alt="ZenfulNote"
                  width={146}
                  height={36}
                  className="h-auto w-[98px] [filter:brightness(0)]"
                  priority
                />
                <p className="mt-0.5 truncate text-xs text-black/54">Admin console</p>
              </div>
            </div>

            <nav className="col-span-2 row-start-2 min-w-0 overflow-x-auto lg:absolute lg:left-1/2 lg:top-1/2 lg:z-0 lg:col-span-1 lg:row-start-1 lg:-translate-x-1/2 lg:-translate-y-1/2">
              <div className="mx-auto flex w-max gap-1 rounded-full border border-white/55 bg-white/36 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl">
                {pages.map((page) => (
                  <TabButton
                    key={page.key}
                    active={activePage === page.key}
                    icon={page.icon}
                    label={page.label}
                    onClick={() => setActivePage(page.key)}
                  />
                ))}
              </div>
            </nav>

            <div className="relative z-10 flex shrink-0 items-center gap-2 justify-self-end lg:col-start-3">
              <PeriodControl
                days={periodDays}
                loading={dashboardLoading}
                onChange={(days) => {
                  setPeriodDays(days);
                  void refreshDashboard({ days });
                }}
              />
              <HeaderActionButton onClick={() => setChatOpen(true)}>
                <MessageCircle aria-hidden="true" size={16} strokeWidth={1.9} />
                <span className="hidden sm:inline">Ask</span>
              </HeaderActionButton>
              <form action="/api/admin/session/logout" method="post">
                <button className="min-h-10 rounded-full bg-black px-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#292929] hover:shadow-[0_18px_42px_rgba(0,0,0,0.24)] sm:px-4">
                  Log out
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 p-3 sm:p-4">
          <div className="h-full min-h-0 overflow-hidden">
            {!dashboardLoaded && activePage !== "blogs" ? (
              <DashboardSkeleton error={dashboardErrorState} loading={dashboardLoading} />
            ) : null}
            {dashboardLoaded && activePage === "overview" ? (
              <OverviewPage
                dashboard={dashboard}
                dauTrend={dauTrend}
                onInspect={setDetailView}
                openWork={openWork}
                requestTrend={requestTrend}
                subscriptions={subscriptions}
                users={users}
              />
            ) : null}
            {dashboardLoaded && activePage === "retention" ? (
              <RetentionPage dashboard={dashboard} onInspect={setDetailView} />
            ) : null}
            {dashboardLoaded && activePage === "events" ? <EventsPage dashboard={dashboard} onInspect={setDetailView} /> : null}
            {dashboardLoaded && activePage === "outreach" ? (
              <OutreachPage
                dashboard={dashboard}
                onInspect={setDetailView}
                onNotice={setToast}
                onRefresh={() => void refreshOutreach()}
                onSaveDrip={saveOutreachDrip}
                onSaveTemplate={saveOutreachTemplate}
                outreach={outreachData}
                outreachLoading={outreachLoading}
                outreachView={outreachView}
                onOutreachViewChange={setOutreachView}
                readiness={readiness}
              />
            ) : null}
            {dashboardLoaded && activePage === "content" ? (
              <ContentPage
                key={contentTab}
                content={dashboard.content}
                contentTab={contentTab}
                onContentTabChange={setContentTab}
                onContentSaved={() => {
                  void refreshDashboard({ days: periodDays, quiet: true });
                }}
                onNotice={setToast}
              />
            ) : null}
            {activePage === "blogs" ? <BlogsPage articles={articles} /> : null}
            {dashboardLoaded && activePage === "system" ? <SystemPage dashboard={dashboard} onInspect={setDetailView} readiness={readiness} /> : null}
          </div>
        </section>
      </div>
      {toast ? <ToastNotice toast={toast} onClose={() => setToast(null)} /> : null}
      {detailView ? <DetailModal detail={detailView} onClose={() => setDetailView(null)} /> : null}
      {chatOpen ? <GrowthChatModal dashboard={dashboard} onClose={() => setChatOpen(false)} /> : null}
    </main>
  );
}

function OverviewPage({
  dashboard,
  dauTrend,
  onInspect,
  openWork,
  requestTrend,
  subscriptions,
  users,
}: {
  dashboard: GrowthDashboardData;
  dauTrend: GrowthTrendPoint[];
  onInspect: (detail: DetailView) => void;
  openWork: number;
  requestTrend: GrowthTrendPoint[];
  subscriptions: Record<string, number>;
  users: GrowthDashboardData["summary"]["users"];
}) {
  const activeRate = users.total > 0 ? (users.active_7d / users.total) * 100 : 0;
  const eventTrend = dashboard.events.daily ?? [];

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden">
      <div className="flex shrink-0 gap-2 overflow-x-auto md:grid md:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          icon={Gauge}
          label="Health"
          value={dashboard.health.score}
          detail={titleCase(dashboard.health.status)}
          tone={dashboard.health.score >= 85 ? "green" : dashboard.health.score >= 65 ? "yellow" : "red"}
          onClick={() => onInspect({
            eyebrow: "Health",
            title: `Score ${dashboard.health.score}`,
            rows: dashboard.health.checks.map((check) => ({ label: check.label, value: titleCase(check.status) })),
          })}
        />
        <MetricTile
          icon={Users}
          label="Users"
          value={users.total}
          detail={`${formatNumber(users.new)} new`}
          tone="black"
          onClick={() => onInspect({
            eyebrow: "Users",
            title: formatNumber(users.total),
            rows: [
              { label: "New users", value: users.new },
              { label: "Active 24h", value: users.active_24h },
              { label: "Active 7d", value: users.active_7d },
              { label: "Active 30d", value: users.active_30d },
            ],
          })}
        />
        <MetricTile
          icon={Activity}
          label="Active 7d"
          value={users.active_7d}
          detail={`${formatPercent(activeRate)} of users`}
          tone="blue"
          onClick={() => onInspect({
            eyebrow: "Active users",
            title: `${formatNumber(users.active_7d)} in 7 days`,
            rows: [
              { label: "Active 24h", value: users.active_24h },
              { label: "Active 30d", value: users.active_30d },
              { label: "Request volume", value: dashboard.activity?.total_requests ?? 0 },
            ],
          })}
        />
        <MetricTile
          icon={CircleDollarSign}
          label="Subscriptions"
          value={subscriptions.active ?? 0}
          detail={`${formatNumber(subscriptions.new_purchases ?? 0)} purchases`}
          tone="green"
          onClick={() => onInspect({
            eyebrow: "Subscriptions",
            title: `${formatNumber(subscriptions.active ?? 0)} active`,
            rows: Object.entries(subscriptions).map(([label, value]) => ({ label: labelize(label), value })),
          })}
        />
        <MetricTile
          icon={Mail}
          label="Email Fail"
          value={`${dashboard.emails.failure_rate}%`}
          detail={`${formatNumber(dashboard.emails.total)} records`}
          tone={dashboard.emails.failure_rate >= 5 ? "red" : "green"}
          onClick={() => onInspect({
            eyebrow: "Outreach email",
            title: `${dashboard.emails.failure_rate}% failure rate`,
            rows: [
              { label: "Total", value: dashboard.emails.total },
              { label: "Growth", value: dashboard.emails.growth_total },
              { label: "Legacy", value: dashboard.emails.legacy_total },
              { label: "Failed", value: dashboard.emails.failed },
            ],
          })}
        />
        <MetricTile
          icon={AlertTriangle}
          label="Queue"
          value={openWork}
          detail={`${dashboard.events.coverage.percent}% events`}
          tone={openWork ? "yellow" : "green"}
          onClick={() => onInspect({
            eyebrow: "Operator queue",
            title: `${openWork} open items`,
            rows: dashboard.health.todos.map((todo) => ({ label: todo.title, value: todo.severity })),
          })}
        />
      </div>

      <div className="min-h-0 overflow-hidden">
      <Panel title="App Pulse" eyebrow={`${dashboard.period.days} day window`} icon={TrendingUp}>
        <div className="grid h-full min-h-0 gap-2.5 overflow-y-auto pr-1">
          <div className="grid min-h-0 gap-5 md:grid-cols-3">
            <ChartBlock
              title="Daily active users"
              value={formatNumber(users.active_7d)}
              data={dauTrend}
              color="#5068e7"
              onClick={() => onInspect(chartDetail("Daily active users", formatNumber(users.active_7d), dauTrend, "#5068e7"))}
            />
            <ChartBlock
              title="Request volume"
              value={formatNumber(dashboard.activity?.total_requests ?? 0)}
              data={requestTrend}
              color="#209d13"
              onClick={() => onInspect(chartDetail("Backend request volume", formatNumber(dashboard.activity?.total_requests ?? 0), requestTrend, "#209d13"))}
            />
            <ChartBlock
              title="Growth events"
              value={formatNumber(dashboard.events.total)}
              data={eventTrend}
              color="#ea6fcf"
              onClick={() => onInspect(chartDetail("First-party growth events", formatNumber(dashboard.events.total), eventTrend, "#ea6fcf"))}
            />
          </div>
        </div>
      </Panel>
      </div>
    </div>
  );
}

function RetentionPage({
  dashboard,
  onInspect,
}: {
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
}) {
  const retention = dashboard.summary.users.retention;

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] xl:overflow-hidden">
      <Panel title="Retention Cohorts" eyebrow="Returned after signup" icon={HeartPulse}>
        <RetentionCurveCard
          retention={retention}
          onClick={() => onInspect({
            eyebrow: "Retention curve",
            title: "Current vs Target",
            rows: retentionCurveRows(retention),
          })}
        />
      </Panel>
      <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,0.62fr)_minmax(0,0.38fr)]">
        <Panel title="Activation Mix" eyebrow="Core behaviors" icon={Activity}>
          <BarSet
            items={[
              { label: "Check-ins", value: dashboard.summary.activation.check_ins ?? 0, color: "#5068e7" },
              { label: "Triggers", value: dashboard.summary.activation.triggers ?? 0, color: "#f45253" },
              { label: "Glimmers", value: dashboard.summary.activation.glimmers ?? 0, color: "#209d13" },
              { label: "Journals", value: dashboard.summary.activation.journals ?? 0, color: "#ea6fcf" },
            ]}
            onInspect={onInspect}
          />
        </Panel>
        <Panel title="Cohort Counts" eyebrow="Sample quality" icon={Users}>
          <ScrollStack>
            {(["d1", "d7", "d30"] as const).map((key) => {
              const cohort = retention[key];
              return (
                <SignalRow
                  key={key}
                  title={`${key.toUpperCase()} cohort`}
                  detail={`${formatNumber(cohort?.retained ?? 0)} retained from ${formatNumber(cohort?.cohort ?? 0)} users`}
                  value={formatPercent(cohort?.rate ?? 0)}
                  tone="neutral"
                  onClick={() => onInspect(retentionDetail(key.toUpperCase(), cohort))}
                />
              );
            })}
          </ScrollStack>
        </Panel>
      </div>
    </div>
  );
}

function EventsPage({
  dashboard,
  onInspect,
}: {
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
}) {
  const recentEvents = useMemo(() => dedupeRecentEvents(dashboard.events.recent), [dashboard.events.recent]);
  const hiddenDuplicateCount = dashboard.events.recent.length - recentEvents.length;

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:overflow-hidden">
      <Panel title="Event Coverage" eyebrow="Expected client taxonomy" icon={ClipboardList}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <button
            type="button"
            onClick={() => onInspect({
              eyebrow: "Event coverage",
              title: `${dashboard.events.coverage.percent}% covered`,
              description: "Coverage compares the expected growth-event tracking plan against events actually seen in the selected period.",
              rows: [
                { label: "Tracked", value: dashboard.events.coverage.tracked },
                { label: "Expected", value: dashboard.events.coverage.expected },
                { label: "Missing", value: dashboard.events.coverage.missing.length },
                { label: "Total live events", value: dashboard.events.total },
              ],
            })}
            className="grid gap-3 text-left transition hover:opacity-85 sm:grid-cols-[150px_minmax(0,1fr)]"
          >
            <RingMeter value={dashboard.events.coverage.percent} />
            <div className="grid content-center gap-2">
              <p className="text-xs font-medium leading-5 text-black/56">
                Seen this period from the expected event tracking plan.
              </p>
              <TinyStat
                label="Tracked"
                value={`${dashboard.events.coverage.tracked}/${dashboard.events.coverage.expected}`}
              />
              <TinyStat label="Total events" value={formatNumber(dashboard.events.total)} />
              <TinyStat label="Known users" value={formatNumber(dashboard.events.unique_users)} />
            </div>
          </button>
          <ScrollStack>
            {dashboard.events.coverage.missing.map((event) => (
              <SignalRow
                key={event}
                title={event}
                detail="Expected event with no traffic in this period"
                value="Not seen"
                tone="warn"
                onClick={() => onInspect({
                  eyebrow: "Missing event",
                  title: event,
                  description: "This expected event has not appeared in production traffic for the selected period. If the flow exists in iOS, verify instrumentation and ship a new app release; otherwise add the event to the client tracking plan.",
                })}
              />
            ))}
            {!dashboard.events.coverage.missing.length ? (
              <QuietState
                icon={CheckCircle2}
                title="Taxonomy covered"
                detail="All expected events appeared in the selected period."
                tone="good"
              />
            ) : null}
          </ScrollStack>
        </div>
      </Panel>
      <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
        <Panel title="Event Volume" eyebrow="Client signal trend" icon={TrendingUp}>
          <EventVolumeBreakdown dashboard={dashboard} onInspect={onInspect} />
        </Panel>
        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <Panel title="Top Events" eyebrow="Volume by event" icon={BarChart3}>
            <ScrollStack>
              <SignalList
                items={dashboard.events.top.map((event) => ({
                  label: event.event_name,
                  value: formatNumber(event.count),
                }))}
                empty="No first-party events received yet."
                onInspect={(item) => onInspect({
                  eyebrow: "Event",
                  title: item.label,
                  rows: [{ label: "Count", value: item.value }],
                })}
              />
            </ScrollStack>
          </Panel>
          <Panel title="Recent Stream" eyebrow="Latest payloads" icon={Send}>
            <ScrollStack>
              {hiddenDuplicateCount > 0 ? (
                <p className="border-b border-black/10 py-2 text-xs font-medium leading-5 text-black/52">
                  Hidden {formatNumber(hiddenDuplicateCount)} exact duplicate event rows with the same event, source, user, and timestamp.
                </p>
              ) : null}
              {recentEvents.map((event) => (
                <SignalRow
                  key={recentEventKey(event)}
                  title={event.event_name}
                  detail={`${event.source} / user ${event.user_id ?? "anonymous"}`}
                  value={formatDateTime(event.created_at)}
                  onClick={() => onInspect({
                    eyebrow: "Recent event",
                    title: event.event_name,
                    rows: [
                      { label: "Source", value: event.source },
                      { label: "User", value: event.user_id ?? "anonymous" },
                      { label: "Created", value: formatDateTime(event.created_at) },
                    ],
                  })}
                />
              ))}
              {!recentEvents.length ? (
                <QuietState
                  icon={AlertTriangle}
                  title="No recent events"
                  detail="The stream will fill after the released app posts growth events."
                  tone="warn"
                />
              ) : null}
            </ScrollStack>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function EventVolumeBreakdown({
  dashboard,
  onInspect,
}: {
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
}) {
  const topEvents = dashboard.events.top.slice(0, 5);
  const topTotal = topEvents.reduce((sum, event) => sum + event.count, 0);
  const max = Math.max(...topEvents.map((event) => event.count), 1);

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.42fr)]">
      <ChartBlock
        title="Daily growth events"
        value={formatNumber(dashboard.events.total)}
        data={dashboard.events.daily}
        color="#ea6fcf"
        onClick={() => onInspect(chartDetail("Daily growth events", formatNumber(dashboard.events.total), dashboard.events.daily, "#ea6fcf"))}
      />
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">Top five events</p>
            <p className="mt-1 text-xs font-medium text-black/52">Period composition from live event rows.</p>
          </div>
          <p className="shrink-0 text-lg font-semibold tabular-nums text-black">{formatNumber(topTotal)}</p>
        </div>
        <div className="mt-3 grid min-h-0 content-start gap-2 overflow-y-auto pr-1">
          {topEvents.map((event, index) => (
            <button
              key={`${event.event_name}-${index}`}
              type="button"
              onClick={() => onInspect({
                eyebrow: "Event volume",
                title: event.event_name,
                rows: [
                  { label: "Count", value: event.count },
                  { label: "Rank", value: index + 1 },
                  { label: "Share of top five", value: topTotal ? `${Math.round((event.count / topTotal) * 100)}%` : "0%" },
                ],
              })}
              className="grid gap-1.5 border-b border-black/10 py-2 text-left transition last:border-0 hover:translate-x-1"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-semibold text-black">{event.event_name}</p>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-black/68">{formatNumber(event.count)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.08]">
                <div
                  className="h-full rounded-full bg-[#ea6fcf]"
                  style={{ width: `${Math.max(4, (event.count / max) * 100)}%` }}
                />
              </div>
            </button>
          ))}
          {!topEvents.length ? (
            <QuietState icon={AlertTriangle} title="No event mix" detail="Top event composition will appear after client events arrive." tone="warn" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OutreachPage({
  dashboard,
  onInspect,
  onNotice,
  onOutreachViewChange,
  onRefresh,
  onSaveDrip,
  onSaveTemplate,
  outreach,
  outreachLoading,
  outreachView,
  readiness,
}: {
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
  onNotice: (toast: Toast) => void;
  onOutreachViewChange: (key: OutreachViewKey) => void;
  onRefresh: () => void;
  onSaveDrip: (payload: Partial<GrowthOutreachDrip>, id?: number) => Promise<void>;
  onSaveTemplate: (payload: Partial<GrowthOutreachTemplate>, id?: number) => Promise<void>;
  outreach: GrowthOutreachData | null;
  outreachLoading: boolean;
  outreachView: OutreachViewKey;
  readiness: GrowthReadiness;
}) {
  const sendgridReady = readiness.integrations.sendgrid_api_key;
  const automationReady = readiness.integrations.growth_automation_enabled;
  const readinessStatus = sendgridReady && automationReady ? "Ready" : "Needs setup";
  const summary = outreach?.summary;
  const performance = outreach?.performance;

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <OutreachSummaryCard icon={Mail} label="Emailable" value={formatNumber(summary?.emailable_users ?? 0)} detail="eligible addresses" />
          <OutreachSummaryCard icon={Send} label="Push reach" value={formatNumber(summary?.push_reachable_users ?? 0)} detail="available tokens" />
          <OutreachSummaryCard icon={FileText} label="Templates" value={formatNumber((summary?.active_templates ?? 0) + (summary?.draft_templates ?? 0))} detail={`${formatNumber(summary?.active_templates ?? 0)} active`} />
          <OutreachSummaryCard icon={Zap} label="Drips" value={formatNumber((summary?.active_drips ?? 0) + (summary?.draft_drips ?? 0))} detail={`${formatNumber(summary?.active_drips ?? 0)} active`} />
          <OutreachSummaryCard
            icon={ShieldCheck}
            label="Delivery"
            value={readinessStatus}
            detail={`SendGrid ${sendgridReady ? "ready" : "missing"} / scheduler ${automationReady ? "on" : "off"}`}
            onClick={() => onInspect({
              eyebrow: "Outreach readiness",
              title: readinessStatus,
              rows: [
                { label: "SendGrid", value: sendgridReady ? "Ready" : "Missing API key" },
                { label: "Automation scheduler", value: automationReady ? "Enabled" : "Disabled" },
                { label: "Email failure rate", value: `${performance?.email_failure_rate ?? dashboard.emails.failure_rate}%` },
              ],
            })}
          />
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          <label className="sr-only" htmlFor="outreach-view">Outreach view</label>
          <div className="relative">
            <select
              id="outreach-view"
              aria-label="Outreach view"
              value={outreachView}
              onChange={(event) => onOutreachViewChange(event.target.value as OutreachViewKey)}
              className="min-h-10 appearance-none rounded-full border border-white/60 bg-white/52 px-4 pr-9 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] outline-none transition hover:bg-white/74 focus:border-[#5068e7]"
            >
              {outreachViews.map((view) => (
                <option key={view.key} value={view.key}>{view.label}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/48" size={15} />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={outreachLoading}
            className="grid size-10 place-items-center rounded-full border border-white/60 bg-white/52 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition hover:-translate-y-0.5 hover:bg-white/74 hover:shadow-[0_16px_42px_rgba(80,104,231,0.14)] disabled:cursor-wait disabled:opacity-60"
            aria-label="Refresh outreach"
          >
            <RefreshCw aria-hidden="true" size={16} strokeWidth={1.9} className={outreachLoading ? "animate-spin" : undefined} />
          </button>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden">
        {outreachView === "performance" ? <OutreachPerformanceView dashboard={dashboard} onInspect={onInspect} outreach={outreach} /> : null}
        {outreachView === "templates" ? <OutreachTemplatesView onNotice={onNotice} onSaveTemplate={onSaveTemplate} outreach={outreach} /> : null}
        {outreachView === "drips" ? <OutreachDripsView onNotice={onNotice} onSaveDrip={onSaveDrip} outreach={outreach} /> : null}
        {outreachView === "audiences" ? <OutreachAudiencesView audiences={outreach?.audiences ?? []} onInspect={onInspect} /> : null}
        {outreachView === "email" ? <OutreachEmailView dashboard={dashboard} onInspect={onInspect} outreach={outreach} /> : null}
        {outreachView === "notifications" ? (
          <OutreachNotificationsView
            dashboard={dashboard}
            onCreatePushTemplate={() => onOutreachViewChange("templates")}
            onInspect={onInspect}
          />
        ) : null}
      </div>
    </div>
  );
}

function OutreachSummaryCard({
  detail,
  icon: Icon,
  label,
  onClick,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-black/46">{label}</p>
        <Icon aria-hidden="true" size={15} strokeWidth={1.9} className="shrink-0 text-[#5068e7]" />
      </div>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums text-black">{value}</p>
      <p className="truncate text-xs text-black/52">{detail}</p>
    </>
  );
  const className = "min-h-[86px] rounded-lg border border-white/58 bg-white/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_18px_48px_rgba(80,104,231,0.13)]";

  if (onClick) {
    return <button type="button" onClick={onClick} className={className}>{content}</button>;
  }

  return <div className={className}>{content}</div>;
}

function OutreachPerformanceView({
  dashboard,
  onInspect,
  outreach,
}: {
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
  outreach: GrowthOutreachData | null;
}) {
  const performance = outreach?.performance;

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:overflow-hidden">
      <Panel title="Delivery Performance" eyebrow="Email and push health" icon={TrendingUp}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <TinyStat label="Email sent" value={formatNumber(performance?.email_sent ?? dashboard.emails.sent)} />
            <TinyStat label="Open rate" value={`${performance?.email_open_rate ?? 0}%`} />
            <TinyStat label="Click rate" value={`${performance?.email_click_rate ?? 0}%`} />
            <TinyStat label="Push records" value={formatNumber(performance?.push_total ?? dashboard.notifications.total)} />
          </div>
          <p className="rounded-lg border border-white/55 bg-white/34 px-3 py-2 text-xs font-medium text-black/56">
            Email metrics read from <span className="font-semibold text-black/72">growth_email_messages</span>; push metrics read from <span className="font-semibold text-black/72">notification_logs</span>.
          </p>
          <ScrollStack>
            <EmailStatusBars
              emails={dashboard.emails.by_type}
              onInspect={(email) => onInspect({
                eyebrow: "Email cohort",
                title: `${labelize(email.email_type)} / ${labelize(email.status)}`,
                rows: [
                  { label: "Type", value: email.email_type },
                  { label: "Status", value: email.status },
                  { label: "Count", value: email.count },
                ],
              })}
            />
          </ScrollStack>
        </div>
      </Panel>
      <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,0.52fr)_minmax(0,0.48fr)]">
        <Panel title="Status Mix" eyebrow="Send outcomes" icon={BarChart3}>
          <ScrollStack>
            {(performance?.status_mix ?? []).map((status) => (
              <SignalRow
                key={status.status}
                title={labelize(status.status)}
                value={formatNumber(status.count)}
                onClick={() => onInspect({
                  eyebrow: "Send outcome",
                  title: labelize(status.status),
                  description: status.status.toLowerCase() === "skipped"
                    ? "Skipped rows were recorded as not sent and are not counted as SendGrid failures. The current backend response does not include skip reasons."
                    : null,
                  rows: [
                    { label: "Status", value: status.status },
                    { label: "Count", value: status.count },
                  ],
                })}
              />
            ))}
            {!performance?.status_mix?.length ? (
              <QuietState icon={AlertTriangle} title="No status mix" detail="Email status rows will appear after outreach sends are logged." tone="warn" />
            ) : null}
          </ScrollStack>
        </Panel>
        <Panel title="Recent Email Stream" eyebrow="Actual sends" icon={Send}>
          <EmailRecentStream emails={dashboard.emails.recent} onInspect={onInspect} />
        </Panel>
      </div>
    </div>
  );
}

function OutreachTemplatesView({
  onNotice,
  onSaveTemplate,
  outreach,
}: {
  onNotice: (toast: Toast) => void;
  onSaveTemplate: (payload: Partial<GrowthOutreachTemplate>, id?: number) => Promise<void>;
  outreach: GrowthOutreachData | null;
}) {
  const [form, setForm] = useState<OutreachTemplateForm>(emptyTemplateForm());
  const [editorOpen, setEditorOpen] = useState(false);
  const [sendGridOpen, setSendGridOpen] = useState(false);
  const [sendGridLoading, setSendGridLoading] = useState(false);
  const [sendGridTemplates, setSendGridTemplates] = useState<GrowthSendGridTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const templates = outreach?.templates ?? [];

  function openTemplateEditor(template?: GrowthOutreachTemplate, channel: "email" | "push" = "email") {
    setForm(template ? templateFormFromTemplate(template) : { ...emptyTemplateForm(), channel });
    setEditorOpen(true);
  }

  async function openSendGridImport() {
    setSendGridOpen(true);
    setSendGridLoading(true);
    try {
      const response = await fetch("/api/admin/growth/outreach/sendgrid-templates", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok || !body?.data) {
        throw new Error(body?.error ?? "SendGrid templates could not be loaded.");
      }
      setSendGridTemplates(body.data as GrowthSendGridTemplate[]);
    } catch (error) {
      onNotice({ tone: "danger", message: error instanceof Error ? error.message : "SendGrid templates could not be loaded." });
    } finally {
      setSendGridLoading(false);
    }
  }

  async function importSendGridTemplate(template: GrowthSendGridTemplate) {
    setSaving(true);
    try {
      await onSaveTemplate(templatePayloadFromSendGrid(template));
      setSendGridOpen(false);
    } catch (error) {
      onNotice({ tone: "danger", message: error instanceof Error ? error.message : "SendGrid template import failed." });
    } finally {
      setSaving(false);
    }
  }

  async function submitTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaveTemplate(templatePayloadFromForm(form), form.id);
      setForm(emptyTemplateForm());
      setEditorOpen(false);
    } catch (error) {
      onNotice({ tone: "danger", message: error instanceof Error ? error.message : "Template save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function draftTemplate() {
    setDrafting(true);
    try {
      const response = await fetch("/api/admin/growth/outreach/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          audience: form.category || "inactive users",
          channel: form.channel,
          goal: form.subject || form.name || "bring users back to one mindful check-in",
          tone: "warm, concise, ZenfulNote branded",
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok || !body?.data) {
        throw new Error(body?.error ?? "Draft generation failed.");
      }
      setForm((current) => ({
        ...current,
        name: current.name || body.data.name || "",
        subject: body.data.subject ?? current.subject,
        preview_text: body.data.preview_text ?? current.preview_text,
        body: body.data.body ?? current.body,
      }));
      onNotice({ tone: "success", message: "Draft generated. Review it before activating." });
    } catch (error) {
      onNotice({ tone: "danger", message: error instanceof Error ? error.message : "Draft generation failed." });
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <Panel title="Template Library" eyebrow={`${formatNumber(templates.length)} saved`} icon={ClipboardList}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/55 bg-white/34 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">
              Email, push, and linked SendGrid templates used by scheduled drips.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={openSendGridImport}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/65 bg-white/56 px-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(80,104,231,0.14)]"
              >
                <ExternalLink aria-hidden="true" size={15} strokeWidth={1.9} />
                Import SendGrid
              </button>
              <button
                type="button"
                onClick={() => openTemplateEditor(undefined, "push")}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/65 bg-white/56 px-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(80,104,231,0.14)]"
              >
                <Send aria-hidden="true" size={15} strokeWidth={1.9} />
                Push template
              </button>
              <button
                type="button"
                onClick={() => openTemplateEditor(undefined, "email")}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)]"
              >
                <FileText aria-hidden="true" size={15} strokeWidth={1.9} />
                Email template
              </button>
            </div>
          </div>
          <ScrollStack>
            {templates.map((template) => (
              <SignalRow
                key={template.id}
                title={template.name}
                detail={`${template.external_provider === "sendgrid" ? "SendGrid" : labelize(template.channel)} / ${labelize(template.status)}${template.category ? ` / ${template.category}` : ""}${template.external_template_id ? ` / ${template.external_template_id}` : ""}`}
                value={template.updated_at ? formatDateTime(template.updated_at) : `#${template.id}`}
                onClick={() => openTemplateEditor(template)}
              />
            ))}
            {!templates.length ? (
              <QuietState icon={AlertTriangle} title="No templates yet" detail="Create an email or push template, or import existing SendGrid dynamic templates." tone="warn" />
            ) : null}
          </ScrollStack>
        </div>
      </Panel>
      {editorOpen ? (
        <OutreachTemplateModal
          drafting={drafting}
          form={form}
          onClose={() => setEditorOpen(false)}
          onDraft={draftTemplate}
          onFormChange={setForm}
          onSubmit={submitTemplate}
          saving={saving}
        />
      ) : null}
      {sendGridOpen ? (
        <SendGridTemplateImportModal
          loading={sendGridLoading}
          onClose={() => setSendGridOpen(false)}
          onImport={importSendGridTemplate}
          saving={saving}
          templates={sendGridTemplates}
        />
      ) : null}
    </div>
  );
}

function SendGridTemplateImportModal({
  loading,
  onClose,
  onImport,
  saving,
  templates,
}: {
  loading: boolean;
  onClose: () => void;
  onImport: (template: GrowthSendGridTemplate) => void;
  saving: boolean;
  templates: GrowthSendGridTemplate[];
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/24 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="grid max-h-[86dvh] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/65 bg-white/76 shadow-[0_34px_120px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/60 bg-white/28 px-5 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">SendGrid dynamic templates</p>
            <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-black">Import sender template</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close SendGrid import" className="grid size-9 shrink-0 place-items-center rounded-full border border-white/65 bg-white/50 text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">
          <p className="mb-3 rounded-lg border border-white/55 bg-white/38 px-3 py-2 text-xs font-medium leading-5 text-black/58">
            These are existing SendGrid transactional templates. Importing one creates a ZenfulNote outreach template that stores the SendGrid template ID and lets drips send through that sender-side design.
          </p>
          {loading ? (
            <div className="grid gap-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-lg border border-white/55 bg-white/46" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onImport(template)}
                  disabled={saving || Boolean(template.linked_template_id)}
                  className="grid gap-2 border-b border-black/10 py-3 text-left transition last:border-0 hover:translate-x-1 disabled:cursor-not-allowed disabled:opacity-58 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-black">{template.name}</p>
                    <p className="mt-0.5 truncate text-xs text-black/50">
                      {template.active_version?.subject || "No active subject surfaced"} / {template.generation || "dynamic"}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-black/36">{template.id}</p>
                  </div>
                  <span className="self-center rounded-full border border-white/65 bg-white/54 px-3 py-1 text-xs font-semibold text-black">
                    {template.linked_template_id ? "Linked" : saving ? "Saving" : "Import"}
                  </span>
                </button>
              ))}
              {!templates.length ? (
                <QuietState icon={AlertTriangle} title="No SendGrid templates" detail="SendGrid returned no dynamic transactional templates for this API key." tone="warn" />
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function OutreachTemplateModal({
  drafting,
  form,
  onClose,
  onDraft,
  onFormChange,
  onSubmit,
  saving,
}: {
  drafting: boolean;
  form: OutreachTemplateForm;
  onClose: () => void;
  onDraft: () => void;
  onFormChange: React.Dispatch<React.SetStateAction<OutreachTemplateForm>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/24 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="grid max-h-[90dvh] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/65 bg-white/76 shadow-[0_34px_120px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/60 bg-white/28 px-5 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">Email or push copy</p>
            <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-black">{form.id ? "Edit template" : "Create template"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close template editor" className="grid size-9 shrink-0 place-items-center rounded-full border border-white/65 bg-white/50 text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 p-4">
          <div className="grid min-h-0 gap-3 overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <OutreachInput label="Name" value={form.name} onChange={(value) => onFormChange((current) => ({ ...current, name: value }))} />
              <OutreachSelect
                label="Channel"
                value={form.channel}
                onChange={(value) => onFormChange((current) => ({
                  ...current,
                  channel: value as "email" | "push",
                  external_provider: value === "push" ? "" : current.external_provider,
                  external_template_id: value === "push" ? "" : current.external_template_id,
                }))}
                options={[["email", "Email"], ["push", "Push notification"]]}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <OutreachInput label="Category" value={form.category} onChange={(value) => onFormChange((current) => ({ ...current, category: value }))} placeholder="onboarding, streak, trial" />
              <OutreachSelect
                label="Status"
                value={form.status}
                onChange={(value) => onFormChange((current) => ({ ...current, status: value as OutreachTemplateForm["status"] }))}
                options={[["draft", "Draft"], ["active", "Active"], ["archived", "Archived"]]}
              />
            </div>
            {form.channel === "email" ? (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <OutreachSelect
                  label="Sender source"
                  value={form.external_provider}
                  onChange={(value) => onFormChange((current) => ({
                    ...current,
                    external_provider: value === "sendgrid" ? "sendgrid" : "",
                    external_template_id: value === "sendgrid" ? current.external_template_id : "",
                    external_generation: value === "sendgrid" ? current.external_generation : "",
                    external_updated_at: value === "sendgrid" ? current.external_updated_at : "",
                    external_metadata: value === "sendgrid" ? current.external_metadata : null,
                  }))}
                  options={[["", "Native body"], ["sendgrid", "SendGrid dynamic template"]]}
                />
                <OutreachInput
                  label="SendGrid template ID"
                  value={form.external_template_id}
                  onChange={(value) => onFormChange((current) => ({ ...current, external_template_id: value, external_provider: value ? "sendgrid" : current.external_provider }))}
                  placeholder="d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
            ) : (
              <p className="rounded-lg border border-white/55 bg-white/36 px-3 py-2 text-xs font-medium leading-5 text-black/58">
                Push notification templates use the title and body below and are sent by Firebase from the scheduled drip runner.
              </p>
            )}
            <OutreachInput label={form.channel === "push" ? "Push title" : "Subject"} value={form.subject} onChange={(value) => onFormChange((current) => ({ ...current, subject: value }))} />
            <OutreachInput label="Preview text" value={form.preview_text} onChange={(value) => onFormChange((current) => ({ ...current, preview_text: value }))} />
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{form.external_provider === "sendgrid" ? "Fallback/context body" : "Body"}</span>
              <textarea
                aria-label="Body"
                value={form.body}
                onChange={(event) => onFormChange((current) => ({ ...current, body: event.target.value }))}
                placeholder={form.external_provider === "sendgrid" ? "Optional internal note or fallback context. SendGrid renders the actual email body." : "Write the editable outreach body here. Use {{first_name}} and {{deep_link}} variables."}
                className="min-h-56 resize-none rounded-lg border border-white/65 bg-white/46 px-3 py-2.5 text-sm leading-6 text-black outline-none transition placeholder:text-black/34 focus:border-[#5068e7] focus:bg-white/68"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-white/55 pt-3">
            <button type="button" onClick={onDraft} disabled={drafting || form.external_provider === "sendgrid"} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/65 bg-white/50 px-4 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(80,104,231,0.14)] disabled:cursor-not-allowed disabled:opacity-60">
              <Sparkles aria-hidden="true" size={15} strokeWidth={1.9} />
              {drafting ? "Drafting" : "Draft"}
            </button>
            <button type="submit" disabled={saving || !form.name.trim() || (form.external_provider === "sendgrid" && !form.external_template_id.trim())} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)] disabled:cursor-not-allowed disabled:opacity-55">
              <Save aria-hidden="true" size={15} strokeWidth={1.9} />
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function OutreachDripsView({
  onNotice,
  onSaveDrip,
  outreach,
}: {
  onNotice: (toast: Toast) => void;
  onSaveDrip: (payload: Partial<GrowthOutreachDrip>, id?: number) => Promise<void>;
  outreach: GrowthOutreachData | null;
}) {
  const [form, setForm] = useState<OutreachDripForm>(emptyDripForm());
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const drips = outreach?.drips ?? [];
  const templates = outreach?.templates ?? [];
  const audiences = outreach?.audiences ?? [];

  function openDripEditor(drip?: GrowthOutreachDrip) {
    setForm(drip ? dripFormFromDrip(drip) : emptyDripForm());
    setEditorOpen(true);
  }

  async function submitDrip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaveDrip(dripPayloadFromForm(form), form.id);
      setForm(emptyDripForm());
      setEditorOpen(false);
    } catch (error) {
      onNotice({ tone: "danger", message: error instanceof Error ? error.message : "Drip save failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <Panel title="Drip Library" eyebrow={`${formatNumber(drips.length)} saved`} icon={ClipboardList}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/55 bg-white/34 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">
              Active drips are evaluated by the hourly growth scheduler and deduped per user step.
            </p>
            <button
              type="button"
              onClick={() => openDripEditor()}
              className="inline-flex min-h-9 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)]"
            >
              <Zap aria-hidden="true" size={15} strokeWidth={1.9} />
              Create drip
            </button>
          </div>
          <ScrollStack>
            {drips.map((drip) => (
              <SignalRow
                key={drip.id}
                title={drip.name}
                detail={`${labelize(drip.status)} / ${drip.audience_key ? labelize(drip.audience_key) : "no audience"} / ${formatNumber(drip.steps?.length ?? 0)} steps`}
                value={drip.updated_at ? formatDateTime(drip.updated_at) : `#${drip.id}`}
                onClick={() => openDripEditor(drip)}
              />
            ))}
            {!drips.length ? (
              <QuietState icon={AlertTriangle} title="No drips yet" detail="Create a drip shell and connect templates to start sequencing outreach." tone="warn" />
            ) : null}
          </ScrollStack>
        </div>
      </Panel>
      {editorOpen ? (
        <OutreachDripModal
          audiences={audiences}
          form={form}
          onClose={() => setEditorOpen(false)}
          onFormChange={setForm}
          onSubmit={submitDrip}
          saving={saving}
          templates={templates}
        />
      ) : null}
    </div>
  );
}

function OutreachDripModal({
  audiences,
  form,
  onClose,
  onFormChange,
  onSubmit,
  saving,
  templates,
}: {
  audiences: GrowthOutreachAudience[];
  form: OutreachDripForm;
  onClose: () => void;
  onFormChange: React.Dispatch<React.SetStateAction<OutreachDripForm>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  templates: GrowthOutreachTemplate[];
}) {
  function updateStep(localId: string, patch: Partial<OutreachDripFormStep>) {
    onFormChange((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.local_id === localId ? { ...step, ...patch } : step)),
    }));
  }

  function addStep() {
    onFormChange((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          ...emptyDripStep(current.steps.length + 1),
          local_id: `new-step-${current.steps.length + 1}-${Date.now()}`,
        },
      ],
    }));
  }

  function removeStep(localId: string) {
    onFormChange((current) => ({
      ...current,
      steps: current.steps.length > 1 ? current.steps.filter((step) => step.local_id !== localId) : current.steps,
    }));
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/24 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="grid max-h-[90dvh] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/65 bg-white/76 shadow-[0_34px_120px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/60 bg-white/28 px-5 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">Scheduled outreach sequence</p>
            <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-black">{form.id ? "Edit drip" : "Create drip"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close drip editor" className="grid size-9 shrink-0 place-items-center rounded-full border border-white/65 bg-white/50 text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 p-4">
          <div className="grid min-h-0 gap-3 overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <OutreachInput label="Name" value={form.name} onChange={(value) => onFormChange((current) => ({ ...current, name: value }))} />
              <OutreachSelect
                label="Status"
                value={form.status}
                onChange={(value) => onFormChange((current) => ({ ...current, status: value as OutreachDripForm["status"] }))}
                options={[["draft", "Draft"], ["active", "Active"], ["paused", "Paused"], ["archived", "Archived"]]}
              />
            </div>
            <OutreachSelect
              label="Audience"
              value={form.audience_key}
              onChange={(value) => onFormChange((current) => ({ ...current, audience_key: value }))}
              options={[["", "Choose audience"], ...audiences.map((audience) => [audience.key, audience.label] as [string, string])]}
            />
            <OutreachInput label="Goal" value={form.goal} onChange={(value) => onFormChange((current) => ({ ...current, goal: value }))} placeholder="Increase D7 retention, rescue streaks..." />
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">Description</span>
              <textarea
                aria-label="Description"
                value={form.description}
                onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
                className="min-h-24 resize-none rounded-lg border border-white/65 bg-white/46 px-3 py-2.5 text-sm leading-6 text-black outline-none transition focus:border-[#5068e7] focus:bg-white/68"
              />
            </label>
            <div className="border-t border-black/10 pt-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">Sequence steps</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-black/52">Default timing is relative to when the user joined.</p>
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/65 bg-white/54 px-3 text-xs font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(80,104,231,0.13)]"
                >
                  <Plus aria-hidden="true" size={14} strokeWidth={1.9} />
                  Add step
                </button>
              </div>
              <div className="grid gap-3">
                {form.steps.map((step, index) => {
                  const stepTemplates = templates.filter((template) => template.channel === step.channel || String(template.id) === step.template_id);

                  return (
                    <div key={step.local_id} className="border-b border-black/10 pb-3 last:border-0 last:pb-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/44">Step {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeStep(step.local_id)}
                          disabled={form.steps.length <= 1}
                          aria-label={`Remove step ${index + 1}`}
                          className="grid size-8 place-items-center rounded-full border border-white/65 bg-white/52 text-black/62 transition hover:-translate-y-0.5 hover:text-black hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 aria-hidden="true" size={14} strokeWidth={1.9} />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <OutreachInput label="Step name" value={step.name} onChange={(value) => updateStep(step.local_id, { name: value })} />
                        <OutreachSelect
                          label="Channel"
                          value={step.channel}
                          onChange={(value) => updateStep(step.local_id, {
                            channel: value as "email" | "push",
                            template_id: "",
                          })}
                          options={[["email", "Email"], ["push", "Push notification"]]}
                        />
                      </div>
                      <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_150px_90px_120px]">
                        <OutreachSelect
                          label="Template"
                          value={step.template_id}
                          onChange={(value) => updateStep(step.local_id, { template_id: value })}
                          options={[["", "No template"], ...stepTemplates.map((template) => [String(template.id), `${template.name} (${labelize(template.channel)})`] as [string, string])]}
                        />
                        <OutreachSelect
                          label="Timing anchor"
                          value={step.trigger_key}
                          onChange={(value) => updateStep(step.local_id, { trigger_key: value })}
                          options={dripTriggerOptions}
                        />
                        <OutreachInput label="Delay" value={step.delay_amount} onChange={(value) => updateStep(step.local_id, { delay_amount: value.replace(/\D/g, "") })} />
                        <OutreachSelect
                          label="Unit"
                          value={step.delay_unit}
                          onChange={(value) => updateStep(step.local_id, { delay_unit: value as OutreachDripFormStep["delay_unit"] })}
                          options={[["minutes", "Minutes"], ["hours", "Hours"], ["days", "Days"]]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-white/55 pt-3">
            <button type="submit" disabled={saving || !form.name.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)] disabled:cursor-not-allowed disabled:opacity-55">
              <Save aria-hidden="true" size={15} strokeWidth={1.9} />
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function OutreachAudiencesView({
  audiences,
  onInspect,
}: {
  audiences: GrowthOutreachAudience[];
  onInspect: (detail: DetailView) => void;
}) {
  return (
    <Panel title="Audiences" eyebrow="Reachable cohorts" icon={Users}>
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <p className="rounded-lg border border-white/55 bg-white/34 px-3 py-2 text-xs font-medium text-black/56">
          Counts are live backend estimates from <span className="font-semibold text-black/72">users</span>, <span className="font-semibold text-black/72">user_subscriptions</span>, notification preference fields, FCM tokens, and last activity timestamps.
        </p>
        <ScrollStack>
          {audiences.map((audience) => (
            <SignalRow
              key={audience.key}
              title={audience.label}
              detail={audience.description}
              value={formatNumber(audience.count)}
              onClick={() => onInspect({
                eyebrow: "Audience",
                title: audience.label,
                rows: [
                  { label: "Key", value: audience.key },
                  { label: "Users", value: audience.count },
                  { label: "Description", value: audience.description },
                ],
              })}
            />
          ))}
          {!audiences.length ? (
            <QuietState icon={AlertTriangle} title="No audience estimates" detail="The backend outreach endpoint is not returning audience counts yet." tone="warn" />
          ) : null}
        </ScrollStack>
      </div>
    </Panel>
  );
}

function OutreachEmailView({
  dashboard,
  onInspect,
  outreach,
}: {
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
  outreach: GrowthOutreachData | null;
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:overflow-hidden">
      <Panel title="Email Delivery Mix" eyebrow="Template and status volume" icon={Mail}>
        <ScrollStack>
          <p className="mb-2 rounded-lg border border-white/55 bg-white/34 px-3 py-2 text-xs font-medium text-black/56">
            This page uses recorded SendGrid/outreach rows in <span className="font-semibold text-black/72">growth_email_messages</span>; legacy counts come from <span className="font-semibold text-black/72">email_notifications</span>.
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            <TinyStat label="Total email" value={formatNumber(outreach?.performance.email_total ?? dashboard.emails.total)} />
            <TinyStat label="Failed" value={formatNumber(outreach?.performance.email_failed ?? dashboard.emails.failed)} />
            <TinyStat label="Failure rate" value={`${outreach?.performance.email_failure_rate ?? dashboard.emails.failure_rate}%`} />
            <TinyStat label="Open rate" value={`${outreach?.performance.email_open_rate ?? 0}%`} />
          </div>
          <EmailStatusBars emails={dashboard.emails.by_type} onInspect={(email) => onInspect({ eyebrow: "Email", title: labelize(email.email_type), rows: [{ label: "Status", value: email.status }, { label: "Count", value: email.count }] })} />
        </ScrollStack>
      </Panel>
      <Panel title="Recent Email Stream" eyebrow="Actual sends" icon={Send}>
        <EmailRecentStream emails={dashboard.emails.recent} onInspect={onInspect} />
      </Panel>
    </div>
  );
}

function OutreachNotificationsView({
  dashboard,
  onCreatePushTemplate,
  onInspect,
}: {
  dashboard: GrowthDashboardData;
  onCreatePushTemplate: () => void;
  onInspect: (detail: DetailView) => void;
}) {
  return (
    <Panel title="Notifications" eyebrow="Push outreach" icon={Send}>
      <ScrollStack>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/55 bg-white/34 px-3 py-2">
          <p className="min-w-0 text-xs font-medium text-black/56">
            Notification volume is grouped from <span className="font-semibold text-black/72">notification_logs</span>, written by Firebase jobs and Outreach push steps.
          </p>
          <button
            type="button"
            onClick={onCreatePushTemplate}
            className="inline-flex min-h-8 items-center gap-2 rounded-full bg-black px-3 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
          >
            <Send aria-hidden="true" size={14} strokeWidth={1.9} />
            Create push template
          </button>
        </div>
        <TinyStat label="Total push records" value={formatNumber(dashboard.notifications.total)} />
        <p className="rounded-lg border border-white/55 bg-white/34 px-3 py-2 text-xs font-medium leading-5 text-black/56">
          This list only shows notification types with rows in <span className="font-semibold text-black/72">notification_logs</span>. Scheduled notification definitions need to be returned by the backend outreach endpoint before they can appear here.
        </p>
        {dashboard.notifications.by_type.map((notification) => (
          <SignalRow
            key={notification.notification_type}
            title={labelize(notification.notification_type)}
            value={formatNumber(notification.count)}
            onClick={() => onInspect({
              eyebrow: "Notification",
              title: labelize(notification.notification_type),
              rows: [{ label: "Count", value: notification.count }],
            })}
          />
        ))}
        {!dashboard.notifications.by_type.length ? (
          <QuietState icon={AlertTriangle} title="No notification rows" detail="Push outreach will appear after notification logs are recorded." tone="warn" />
        ) : null}
      </ScrollStack>
    </Panel>
  );
}

function ContentPage({
  content,
  contentTab,
  onContentTabChange,
  onContentSaved,
  onNotice,
}: {
  content?: GrowthContentInventory;
  contentTab: ContentKey;
  onContentTabChange: (key: ContentKey) => void;
  onContentSaved: () => void;
  onNotice: (toast: Toast) => void;
}) {
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<ContentEditorState | null>(null);
  const counts = content?.counts ?? {};
  const recentRows = content?.recent?.[contentTab] ?? [];
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(recentRows.length / pageSize));
  const visibleRows = recentRows.slice((page - 1) * pageSize, page * pageSize);

  async function openEditor(row: GrowthContentRow) {
    if (!row.id) return;

    const fallbackRow = { ...row };
    setEditor({ type: contentTab, row: fallbackRow, mode: "view", loading: true, saving: false });

    try {
      const response = await fetch(`/api/admin/growth/content/${contentTab}/${row.id}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok || !body?.data) {
        const message = body?.error ?? "Content detail could not be loaded.";
        setEditor({ type: contentTab, row: fallbackRow, mode: "view", loading: false, saving: false, error: message });
        return;
      }

      setEditor({ type: contentTab, row: body.data as GrowthContentRow, mode: "view", loading: false, saving: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Content detail could not be loaded.";
      setEditor({ type: contentTab, row: fallbackRow, mode: "view", loading: false, saving: false, error: message });
    }
  }

  async function saveEditor(formData: FormData) {
    if (!editor?.row.id) return;

    setEditor((current) => current ? { ...current, saving: true, error: undefined } : current);

    try {
      const response = await fetch(`/api/admin/growth/content/${editor.type}/${editor.row.id}`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok || !body?.data) {
        const message = body?.error ?? "Content update failed.";
        setEditor((current) => current ? { ...current, saving: false, error: message } : current);
        onNotice({ tone: "warning", message });
        return;
      }

      setEditor({ type: editor.type, row: body.data as GrowthContentRow, mode: "view", loading: false, saving: false });
      onNotice({ tone: "success", message: "Content updated." });
      onContentSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Content update failed.";
      setEditor((current) => current ? { ...current, saving: false, error: message } : current);
      onNotice({ tone: "danger", message });
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="flex justify-center overflow-x-auto rounded-full border border-white/55 bg-white/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl">
        <div className="flex w-max gap-1">
        {contentTabs.map((tab) => (
          <ContentTabButton
            key={tab.key}
            active={contentTab === tab.key}
            count={counts[tab.key] ?? 0}
            icon={tab.icon}
            label={tab.label}
            onClick={() => onContentTabChange(tab.key)}
          />
        ))}
        </div>
      </div>

      <div className="min-h-0">
        <Panel title={titleCase(contentTab)} eyebrow="Recent content" icon={BookOpen}>
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
            <div className="min-h-0 overflow-y-auto">
              {visibleRows.map((row, index) => (
                <ContentRow
                  key={`${contentTab}-${row.id ?? index}`}
                  row={row}
                  onClick={() => void openEditor(row)}
                />
              ))}
              {!visibleRows.length ? (
                <QuietState
                  icon={AlertTriangle}
                  title="No recent rows"
                  detail="This content type is not returning inventory rows yet."
                  tone="warn"
                />
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">
                Page {page} of {totalPages} / {formatNumber(recentRows.length)} rows
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="min-h-9 rounded-full border border-white/60 bg-white/45 px-3 text-xs font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="min-h-9 rounded-full border border-white/60 bg-white/45 px-3 text-xs font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </Panel>
      </div>
      {editor ? (
        <ContentEditorModal
          editor={editor}
          onClose={() => setEditor(null)}
          onEdit={() => setEditor((current) => current ? { ...current, mode: "edit" } : current)}
          onSave={saveEditor}
        />
      ) : null}
    </div>
  );
}

function BlogsPage({ articles }: { articles: AdminBlogArticle[] }) {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <BlogAdmin initialArticles={articles} />
    </div>
  );
}

function ContentTabButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-left transition duration-200",
        active
          ? "border-white/85 bg-white/76 shadow-[0_14px_38px_rgba(80,104,231,0.16),inset_0_1px_0_rgba(255,255,255,0.95)]"
          : "border-white/45 bg-white/24 hover:-translate-y-0.5 hover:border-white/75 hover:bg-white/56 hover:shadow-[0_12px_28px_rgba(80,104,231,0.12)]",
      ].join(" ")}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={1.9} className="text-[#5068e7]" />
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-black/58">{label}</span>
      <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-black">
        {formatNumber(count)}
      </span>
    </button>
  );
}

function SystemPage({
  dashboard,
  onInspect,
  readiness,
}: {
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
  readiness: GrowthReadiness;
}) {
  const healthChecks = dashboard.health.checks
    .filter(isSupportedSystemHealthCheck)
    .map(normalizeSystemHealthCheck);
  const readinessIntegrations = Object.entries(readiness.integrations).filter(([key]) => isSupportedSystemIntegration(key));

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:overflow-hidden">
      <Panel title="System Health" eyebrow="Operational checks" icon={ShieldCheck}>
        <ScrollStack>
          {healthChecks.map((check) => (
            <button
              key={check.key}
              type="button"
              onClick={() => onInspect({
                eyebrow: "Health check",
                title: check.label,
                description: check.detail,
                rows: [{ label: "Status", value: titleCase(check.status) }],
              })}
              className="block w-full text-left transition hover:-translate-y-0.5"
            >
              <HealthCheckRow check={check} />
            </button>
          ))}
        </ScrollStack>
      </Panel>
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <Panel title="Readiness" eyebrow="Data and scheduler" icon={CheckCircle2}>
          <ScrollStack>
            <div className="grid gap-2">
              <TinyStat label="Required ready" value={`${readiness.ready_count}/${readiness.required_count}`} />
              {Object.entries(readiness.tables).map(([key, value]) => (
                <SignalRow
                  key={`table-${key}`}
                  title={labelize(key)}
                  detail="Table"
                  value={value ? "Ready" : "Missing"}
                  tone={value ? "good" : "warn"}
                  onClick={() => onInspect({
                    eyebrow: "Readiness table",
                    title: labelize(key),
                    rows: [{ label: "Status", value: value ? "Ready" : "Missing" }],
                  })}
                />
              ))}
              {readinessIntegrations.map(([key, value]) => (
                <SignalRow
                  key={`integration-${key}`}
                  title={labelize(key)}
                  detail="Integration"
                  value={value ? "Ready" : "Missing"}
                  tone={value ? "good" : "warn"}
                  onClick={() => onInspect({
                    eyebrow: "Integration",
                    title: labelize(key),
                    rows: [{ label: "Status", value: value ? "Ready" : "Missing" }],
                  })}
                />
              ))}
            </div>
          </ScrollStack>
        </Panel>
        <Panel title="Data Sources" eyebrow="What powers this view" icon={DatabaseIcon}>
          <ScrollStack>
            <SignalRow title="Users and audiences" detail="users, user_subscriptions, fcm_token, is_notification, last_active_at" value={formatNumber(dashboard.summary.users.total)} />
            <SignalRow title="Email stream" detail="growth_email_messages plus legacy email_notifications totals" value={formatNumber(dashboard.emails.total)} />
            <SignalRow title="Notifications" detail="notification_logs grouped by notification_type" value={formatNumber(dashboard.notifications.total)} />
            <SignalRow title="Growth scheduler" detail="growth:run-lifecycle hourly when automation is enabled" value={dashboard.automation.last_run ? "Running" : "No run"} tone={dashboard.automation.last_run ? "good" : "warn"} />
            <SignalRow title="Last automation" detail={dashboard.automation.last_run?.finished_at ? formatDateTime(dashboard.automation.last_run.finished_at) : "No completed run recorded"} value={dashboard.automation.last_run?.status ? titleCase(dashboard.automation.last_run.status) : "Missing"} tone={dashboard.automation.last_run ? "good" : "warn"} />
          </ScrollStack>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  children,
  eyebrow,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/55 bg-white/[0.42] shadow-[0_18px_55px_rgba(30,32,50,0.08),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:shadow-[0_28px_90px_rgba(80,104,231,0.13),inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/55 bg-white/[0.18] px-3 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-base font-semibold tracking-tight text-black">{title}</h2>
          <span className="hidden truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-black/42 sm:inline">
            {eyebrow}
          </span>
        </div>
        <Icon aria-hidden="true" className="shrink-0 text-[#5068e7]" size={17} strokeWidth={1.9} />
      </div>
      <div className="min-h-0 overflow-hidden p-2.5">{children}</div>
    </section>
  );
}

function ScrollStack({ children }: { children: React.ReactNode }) {
  return <div className="h-full min-h-0 overflow-y-auto overscroll-contain pr-1">{children}</div>;
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition duration-200",
        active
          ? "bg-black text-white shadow-[0_12px_34px_rgba(0,0,0,0.18)]"
          : "text-black/62 hover:-translate-y-0.5 hover:bg-white/70 hover:text-black hover:shadow-[0_14px_34px_rgba(80,104,231,0.12)]",
      ].join(" ")}
    >
      <Icon aria-hidden="true" size={15} strokeWidth={1.9} />
      {label}
    </button>
  );
}

function PeriodControl({
  days,
  loading,
  onChange,
}: {
  days: number;
  loading: boolean;
  onChange: (days: number) => void;
}) {
  return (
    <label className="relative inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-white/85 hover:bg-white/75 hover:shadow-[0_16px_42px_rgba(80,104,231,0.16)]">
      <CalendarDays aria-hidden="true" size={16} strokeWidth={1.9} className="text-black/58" />
      <span className="sr-only">Dashboard window</span>
      <select
        aria-label="Dashboard window"
        value={days}
        disabled={loading}
        onChange={(event) => onChange(Number(event.target.value))}
        className="cursor-pointer appearance-none bg-transparent py-0 pl-0 pr-5 text-sm font-semibold tabular-nums text-black outline-none disabled:cursor-wait disabled:opacity-60"
      >
        {periodOptions.map((option) => (
          <option key={option} value={option}>
            {option}d
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute right-3 text-black/48"
      />
    </label>
  );
}

function HeaderActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition duration-200 hover:-translate-y-0.5 hover:border-white/85 hover:bg-white/75 hover:shadow-[0_16px_42px_rgba(80,104,231,0.16)] disabled:cursor-wait disabled:opacity-65"
    >
      {children}
    </button>
  );
}

function MetricTile({
  detail,
  icon: Icon,
  label,
  onClick,
  tone,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  tone: "black" | "blue" | "green" | "red" | "yellow";
  value: number | string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-black/50">{label}</p>
        <span className={["grid size-7 place-items-center rounded-full", toneClass(tone)].join(" ")}>
          <Icon aria-hidden="true" size={14} strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-1.5 truncate text-xl font-semibold tabular-nums text-black">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="truncate text-xs text-black/56">{detail}</p>
    </>
  );

  const className = "min-h-20 w-40 shrink-0 rounded-lg border border-white/55 bg-white/42 px-3 py-2.5 text-left shadow-[0_14px_44px_rgba(30,32,50,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:border-white/75 hover:shadow-[0_24px_70px_rgba(80,104,231,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] md:w-auto";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

function ChartBlock({
  color,
  data,
  onClick,
  title,
  value,
}: {
  color: string;
  data: GrowthTrendPoint[];
  onClick?: () => void;
  title: string;
  value: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-xl font-semibold tabular-nums text-black">{value}</p>
          {onClick ? <Maximize2 aria-hidden="true" size={14} strokeWidth={1.9} className="text-black/34" /> : null}
        </div>
      </div>
      <div className="min-h-0">
        <LineChart data={data} color={color} />
      </div>
    </>
  );

  const className = "grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-2 text-left transition duration-200 hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5068e7]";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

function LineChart({
  color,
  data,
  size = "normal",
}: {
  color: string;
  data: GrowthTrendPoint[];
  size?: "normal" | "large";
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const rawGradientId = useId();
  const gradientId = `chart-${rawGradientId.replace(/:/g, "")}`;
  const chartWidth = size === "large" ? 520 : 320;
  const chartHeight = 128;
  const chart = useMemo(() => {
    const visible = data.slice(-30);
    const max = Math.max(...visible.map((point) => point.count), 1);
    const xStep = visible.length > 1 ? chartWidth / (visible.length - 1) : chartWidth;

    return visible.map((point, index) => {
      const x = visible.length > 1 ? index * xStep : chartWidth / 2;
      const y = chartHeight - 10 - (point.count / max) * (chartHeight - 22);
      return { ...point, x, y };
    });
  }, [chartHeight, chartWidth, data]);
  const points = chart;

  if (!points.length) {
    return (
      <div className={["grid h-full place-items-center text-sm font-medium text-black/48", size === "large" ? "min-h-[clamp(240px,38dvh,420px)]" : "min-h-28"].join(" ")}>
        No trend data
      </div>
    );
  }

  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,${chartHeight} ${path} ${chartWidth},${chartHeight}`;
  const activePoint = hoverIndex === null ? null : points[hoverIndex] ?? null;
  const lineWidth = size === "large" ? 1.15 : 1.7;
  const endpointRadius = size === "large" ? 1.5 : 2.4;
  const hoverRadius = size === "large" ? 2.4 : 3.4;
  const hoverStrokeWidth = size === "large" ? 1.1 : 1.6;

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const bounded = Math.max(0, Math.min(1, ratio));
    setHoverIndex(Math.round(bounded * (points.length - 1)));
  }

  const tooltipWidth = size === "large" ? 94 : 104;
  const tooltipHeight = size === "large" ? 34 : 38;
  const tooltipX = activePoint ? Math.max(4, Math.min(chartWidth - tooltipWidth - 4, activePoint.x - tooltipWidth / 2)) : 0;
  const tooltipY = activePoint ? (activePoint.y > 56 ? activePoint.y - tooltipHeight - 10 : activePoint.y + 14) : 0;
  const tooltipDateClass = size === "large" ? "fill-black/55 text-[7px] font-semibold uppercase" : "fill-black/55 text-[8px] font-semibold uppercase";
  const tooltipValueClass = size === "large" ? "fill-black text-[10px] font-semibold" : "fill-black text-[11px] font-semibold";

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className={size === "large" ? "h-[clamp(240px,38dvh,420px)] w-full" : "h-full min-h-28 w-full"}
      role="img"
      aria-label="Trend chart"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={lineWidth}
        vectorEffect="non-scaling-stroke"
      />
      {points.slice(-1).map((point) => (
        <circle key={point.date} cx={point.x} cy={point.y} r={endpointRadius} fill={color} />
      ))}
      {activePoint ? (
        <g className="pointer-events-none">
          <line x1={activePoint.x} x2={activePoint.x} y1="8" y2={chartHeight - 8} stroke="rgba(0,0,0,0.14)" strokeDasharray="3 5" />
          <circle cx={activePoint.x} cy={activePoint.y} r={hoverRadius} fill="white" stroke={color} strokeWidth={hoverStrokeWidth} />
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx="7" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.10)" />
            <text x="8" y={size === "large" ? "13" : "15"} className={tooltipDateClass}>
              {formatChartDate(activePoint.date)}
            </text>
            <text x="8" y={size === "large" ? "27" : "30"} className={tooltipValueClass}>
              {formatNumber(activePoint.count)}
            </text>
          </g>
        </g>
      ) : null}
    </svg>
  );
}

function RetentionCurveCard({
  onClick,
  retention,
}: {
  onClick: () => void;
  retention: GrowthDashboardData["summary"]["users"]["retention"];
}) {
  const latestRate = retention.d30?.rate ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-full min-h-[420px] w-full grid-rows-[auto_minmax(240px,1fr)_auto] gap-3 text-left transition duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5068e7]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-black/48">Retention curve</p>
          <span className="rounded-full bg-[#fff9e8] px-2 py-0.5 text-[10px] font-semibold text-[#9b710c]">Product targets</span>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-black">D30 {formatPercent(latestRate)}</p>
      </div>
      <RetentionCurveChart retention={retention} />
      <RetentionSnapshotGrid retention={retention} />
    </button>
  );
}

function RetentionSnapshotGrid({
  retention,
}: {
  retention: GrowthDashboardData["summary"]["users"]["retention"];
}) {
  const rows = [
    { key: "d1" as const, label: "D1", target: retentionTargets.d1, cohort: retention.d1 },
    { key: "d7" as const, label: "D7", target: retentionTargets.d7, cohort: retention.d7 },
    { key: "d30" as const, label: "D30", target: retentionTargets.d30, cohort: retention.d30 },
  ];

  return (
    <div className="grid gap-4 border-t border-black/10 pt-3 sm:grid-cols-3">
      {rows.map((row) => {
        const rate = row.cohort?.rate ?? 0;
        const delta = rate - row.target;
        const scaleMax = Math.max(row.target * 1.5, rate, 1);
        const barWidth = Math.min(100, (rate / scaleMax) * 100);
        const targetLeft = Math.min(98, (row.target / scaleMax) * 100);

        return (
          <div key={row.key} className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/48">{row.label}</p>
              <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", delta >= 0 ? "bg-[#f3fbf1] text-[#176e0f]" : "bg-[#fff9e8] text-[#96690f]"].join(" ")}>
                {delta >= 0 ? "+" : ""}{formatPercent(delta)}
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-lg font-semibold tabular-nums text-black">{formatPercent(rate)}</p>
              <p className="text-[11px] font-semibold text-[#9b710c]">Target {formatPercent(row.target)}</p>
            </div>
            <div className="relative mt-2 h-2 rounded-full bg-black/[0.08]">
              <div
                className="h-full rounded-full bg-black"
                style={{ width: `${Math.max(rate > 0 ? 3 : 0, barWidth)}%` }}
              />
              <span
                className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#d29a13]"
                style={{ left: `${targetLeft}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RetentionCurveChart({
  retention,
}: {
  retention: GrowthDashboardData["summary"]["users"]["retention"];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const rawGradientId = useId();
  const gradientId = `retention-${rawGradientId.replace(/:/g, "")}`;
  const rows = [
    { key: "d1" as const, label: "D1", rate: retention.d1?.rate ?? 0, target: retentionTargets.d1 },
    { key: "d7" as const, label: "D7", rate: retention.d7?.rate ?? 0, target: retentionTargets.d7 },
    { key: "d30" as const, label: "D30", rate: retention.d30?.rate ?? 0, target: retentionTargets.d30 },
  ];
  const max = Math.max(30, ...rows.map((row) => row.rate), ...rows.map((row) => row.target));
  const width = 360;
  const height = 150;
  const baseline = 122;
  const topInset = 16;
  const plotHeight = baseline - topInset;
  const points = rows.map((row, index) => ({
    ...row,
    x: 30 + index * 150,
    y: baseline - (row.rate / max) * plotHeight,
    targetY: baseline - (row.target / max) * plotHeight,
  }));
  const currentPath = points.map((point) => `${point.x},${point.y}`).join(" ");
  const currentArea = `${points[0]?.x ?? 30},${baseline} ${currentPath} ${points[points.length - 1]?.x ?? 330},${baseline}`;
  const targetPath = points.map((point) => `${point.x},${point.targetY}`).join(" ");
  const activePoint = hoverIndex === null ? null : points[hoverIndex] ?? null;

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const bounded = Math.max(0, Math.min(1, ratio));
    setHoverIndex(Math.round(bounded * (points.length - 1)));
  }

  return (
    <div className="relative h-full min-h-[170px]">
      <div className="absolute right-1 top-0 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
        <span className="inline-flex items-center gap-1.5 text-black/62"><span className="size-2 rounded-full bg-black" />Current</span>
        <span className="inline-flex items-center gap-1.5 text-[#9b710c]"><span className="size-2 rounded-full bg-[#d29a13]" />Target</span>
        <span className="basis-full text-right text-[10px] tracking-normal text-[#9b710c]">
          D1 {retentionTargets.d1}% / D7 {retentionTargets.d7}% / D30 {retentionTargets.d30}%
        </span>
      </div>
      <div
        className="absolute inset-x-0 bottom-7 top-7"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          role="img"
          aria-label="Retention curve"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#111111" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#111111" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="24" x2="336" y1={baseline} y2={baseline} stroke="rgba(0,0,0,0.10)" />
          <polygon points={currentArea} fill={`url(#${gradientId})`} />
          <polyline
            points={targetPath}
            fill="none"
            stroke="#d29a13"
            strokeDasharray="4 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={currentPath}
            fill="none"
            stroke="#111111"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.3"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point) => (
            <g key={point.key}>
              <circle cx={point.x} cy={point.targetY} r="2.2" fill="#d29a13" />
              <circle cx={point.x} cy={point.y} r="2.7" fill="#111111" />
            </g>
          ))}
          {activePoint ? (
            <g className="pointer-events-none">
              <line x1={activePoint.x} x2={activePoint.x} y1="16" y2={baseline + 4} stroke="rgba(0,0,0,0.14)" strokeDasharray="3 5" />
              <circle cx={activePoint.x} cy={activePoint.y} r="4" fill="white" stroke="#111111" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
            </g>
          ) : null}
        </svg>
        {activePoint ? (
          <div
            className="pointer-events-none absolute w-28 rounded-lg border border-black/10 bg-white/88 px-2.5 py-2 text-left shadow-[0_16px_44px_rgba(30,32,50,0.14)] backdrop-blur-xl"
            style={{
              left: `clamp(6px, calc(${(activePoint.x / width) * 100}% - 56px), calc(100% - 118px))`,
              top: activePoint.y > height * 0.54
                ? `clamp(4px, calc(${(activePoint.y / height) * 100}% - 52px), calc(100% - 54px))`
                : `clamp(4px, calc(${(activePoint.y / height) * 100}% + 10px), calc(100% - 54px))`,
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-black/48">{activePoint.label}</p>
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
              <span className="text-black">{formatPercent(activePoint.rate)}</span>
              <span className="text-[#9b710c]">{formatPercent(activePoint.target)}</span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/48">
        {rows.map((row) => (
          <span key={row.key} className="text-center">{row.label}</span>
        ))}
      </div>
    </div>
  );
}

function BarSet({
  items,
  onInspect,
}: {
  items: Array<{ color: string; label: string; value: number }>;
  onInspect?: (detail: DetailView) => void;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid h-full min-h-0 items-end gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onInspect?.({
            eyebrow: "Activation",
            title: item.label,
            rows: [{ label: "Count", value: item.value }],
          })}
          className="grid h-full min-h-40 grid-rows-[minmax(0,1fr)_auto] gap-2 text-left transition duration-200 hover:-translate-y-0.5"
        >
          <div className="flex h-full items-end border-b border-black/10 bg-black/[0.04] px-1.5 pt-1.5">
            <div
              className="w-full rounded-t"
              style={{ height: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: item.color }}
            />
          </div>
          <div>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-black/48">{item.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-black">{formatNumber(item.value)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function RingMeter({ value }: { value: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="grid place-items-center">
      <svg viewBox="0 0 120 120" className="size-36" role="img" aria-label={`${value}% coverage`}>
        <circle cx="60" cy="60" r={radius} stroke="rgba(0,0,0,0.09)" strokeWidth="7" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={value >= 75 ? "#209d13" : value >= 40 ? "#f9bc2c" : "#f45253"}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="64" textAnchor="middle" className="fill-black text-2xl font-semibold">
          {value}%
        </text>
      </svg>
    </div>
  );
}

function SignalList({
  empty,
  items,
  onInspect,
}: {
  empty: string;
  items: Array<{ label: string; value: string }>;
  onInspect?: (item: { label: string; value: string }) => void;
}) {
  if (!items.length) {
    return <QuietState icon={AlertTriangle} title={empty} detail="Waiting for live data." tone="warn" />;
  }

  return (
    <div className="grid gap-1">
      {items.map((item) => (
        <SignalRow
          key={`${item.label}-${item.value}`}
          title={item.label}
          value={item.value}
          onClick={onInspect ? () => onInspect(item) : undefined}
        />
      ))}
    </div>
  );
}

function EmailStatusBars({
  emails,
  onInspect,
}: {
  emails: GrowthDashboardData["emails"]["by_type"];
  onInspect?: (email: GrowthDashboardData["emails"]["by_type"][number]) => void;
}) {
  const max = Math.max(...emails.map((email) => email.count), 1);
  const skippedCount = emails
    .filter((email) => email.status.toLowerCase() === "skipped")
    .reduce((sum, email) => sum + email.count, 0);

  if (!emails.length) {
    return (
      <QuietState
        icon={AlertTriangle}
        title="No outreach email rows"
        detail="SendGrid activity will appear here after outreach emails are recorded by the backend."
        tone="warn"
      />
    );
  }

  return (
    <div className="grid gap-2">
      {skippedCount > 0 ? (
        <p className="rounded-lg border border-[#f9bc2c]/35 bg-[#fff9e8]/72 px-3 py-2 text-xs font-medium leading-5 text-[#7a5a0b]">
          {formatNumber(skippedCount)} emails are logged as skipped. They were recorded as not sent and are not counted as SendGrid failures; this backend response does not include the skip reason yet.
        </p>
      ) : null}
      {emails.map((email) => (
        <button
          key={`${email.email_type}-${email.status}`}
          type="button"
          onClick={() => onInspect?.(email)}
          className="border-b border-black/10 py-3 text-left transition duration-200 last:border-0 hover:translate-x-1"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-black">{labelize(email.email_type)}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-black/44">{labelize(email.status)}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-black">{formatNumber(email.count)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.08]">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: emailStatusColor(email.status),
                width: `${Math.max(3, (email.count / max) * 100)}%`,
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

function EmailRecentStream({
  emails,
  onInspect,
}: {
  emails: GrowthDashboardData["emails"]["recent"];
  onInspect: (detail: DetailView) => void;
}) {
  return (
    <ScrollStack>
      {emails.map((email, index) => (
        <SignalRow
          key={`${email.provider}-${email.email_type}-${email.status}-${email.recipient_domain ?? "domain"}-${email.created_at}-${index}`}
          title={labelize(email.email_type)}
          detail={`${labelize(email.provider)} / ${email.recipient_domain ?? "unknown domain"}`}
          value={labelize(email.status)}
          tone={email.status.toLowerCase().includes("fail") ? "warn" : "good"}
          onClick={() => onInspect({
            eyebrow: "Email send",
            title: labelize(email.email_type),
            rows: [
              { label: "Provider", value: email.provider },
              { label: "Status", value: email.status },
              { label: "Recipient domain", value: email.recipient_domain ?? "unknown" },
              { label: "Created", value: formatDateTime(email.created_at) },
            ],
          })}
        />
      ))}
      {!emails.length ? (
        <QuietState
          icon={AlertTriangle}
          title="No recent emails"
          detail="The stream fills after outreach sends are recorded by the backend."
          tone="warn"
        />
      ) : null}
    </ScrollStack>
  );
}

function SignalRow({
  detail,
  onClick,
  title,
  tone = "neutral",
  value,
}: {
  detail?: string;
  onClick?: () => void;
  title: string;
  tone?: "neutral" | "good" | "warn";
  value: string;
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
        {detail ? <p className="truncate text-xs text-black/48">{detail}</p> : null}
      </div>
      <span className={["shrink-0 text-sm font-semibold tabular-nums", signalToneClass(tone)].join(" ")}>
        {value}
      </span>
    </>
  );

  const className = "flex min-h-11 w-full items-center justify-between gap-3 border-b border-black/10 py-2 text-left transition duration-200 last:border-0 hover:translate-x-1";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

function HealthCheckRow({ check }: { check: GrowthHealthCheck }) {
  const ok = check.status === "ok";

  return (
    <QuietState
      icon={ok ? CheckCircle2 : AlertTriangle}
      title={check.label}
      detail={check.detail}
      tone={ok ? "good" : "warn"}
    />
  );
}

function ContentRow({ onClick, row }: { onClick?: () => void; row: GrowthContentRow }) {
  const title = row.title ?? row.content ?? row.jounral_name ?? `Item ${row.id ?? ""}`;
  const detail = row.subtitle ?? row.sub_title ?? row.artist ?? row.status ?? row.type ?? row.duration ?? "Content row";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-black/10 px-3 py-2.5 text-left transition duration-200 last:border-0 hover:bg-white/60 hover:shadow-[inset_3px_0_0_#5068e7]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
        <p className="truncate text-xs text-black/50">{detail}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-black/48">
        {row.updated_at ? formatDateTime(row.updated_at) : row.id ? `#${row.id}` : ""}
      </span>
    </button>
  );
}

function QuietState({
  detail,
  icon: Icon,
  title,
  tone,
}: {
  detail: string;
  icon: LucideIcon;
  title: string;
  tone: "good" | "warn";
}) {
  return (
    <div className="flex items-start gap-3 border-b border-black/10 py-3 last:border-0">
      <Icon
        aria-hidden="true"
        className={["mt-0.5 shrink-0", tone === "good" ? "text-[#209d13]" : "text-[#a36f00]"].join(" ")}
        size={18}
        strokeWidth={1.9}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-black">{title}</p>
        <p className="mt-0.5 text-sm leading-5 text-black/58">{detail}</p>
      </div>
    </div>
  );
}

function TinyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-black/10 py-2">
      <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-black">{value}</p>
    </div>
  );
}

function OutreachInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{label}</span>
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-10 rounded-lg border border-white/65 bg-white/46 px-3 text-sm text-black outline-none transition placeholder:text-black/34 focus:border-[#5068e7] focus:bg-white/68"
      />
    </label>
  );
}

function OutreachSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-lg border border-white/65 bg-white/46 px-3 text-sm font-semibold text-black outline-none transition focus:border-[#5068e7] focus:bg-white/68"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function ToastNotice({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  const className = {
    success: "border-[#c8eac2] bg-[#f3fbf1] text-[#176e0f]",
    warning: "border-[#f3df9c] bg-[#fff9e8] text-[#96690f]",
    danger: "border-[#f7c9c9] bg-[#fff3f3] text-[#9f1f20]",
    info: "border-[#dce4ff] bg-[#f4f6ff] text-[#31449f]",
  }[toast.tone];

  return (
    <div
      role="status"
      className={["fixed right-4 top-20 z-50 flex max-w-md items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-[0_18px_70px_rgba(0,0,0,0.16)] backdrop-blur", className].join(" ")}
    >
      {toast.sticky ? <RefreshCw aria-hidden="true" size={16} className="mt-0.5 shrink-0 animate-spin" /> : null}
      <p className="min-w-0 leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="ml-1 grid size-7 shrink-0 place-items-center rounded-md transition hover:bg-black/10"
      >
        <X aria-hidden="true" size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

function DetailModal({ detail, onClose }: { detail: DetailView; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/24 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="grid max-h-[90dvh] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/65 bg-white/72 shadow-[0_34px_120px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/60 bg-white/28 px-5 py-3">
          <div className="min-w-0">
            {detail.eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">{detail.eyebrow}</p>
            ) : null}
            <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-black">{detail.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/65 bg-white/50 text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.16)]"
          >
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">
          {detail.description ? (
            <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-black/68">{detail.description}</p>
          ) : null}
          {detail.chart ? (
            <div className="mb-4 grid rounded-lg border border-white/60 bg-white/44 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">Focused graph</p>
                <p className="text-2xl font-semibold tabular-nums text-black">{detail.chart.value}</p>
              </div>
              <LineChart data={detail.chart.data} color={detail.chart.color} size="large" />
            </div>
          ) : null}
          {detail.rows?.length ? (
            <div className={["grid gap-2", detail.chart ? "sm:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"].join(" ")}>
              {detail.rows.map((row) => (
                <div key={`${row.label}-${String(row.value)}`} className="grid gap-1 border-b border-black/10 py-2 last:border-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{row.label}</p>
                  <p className="min-w-0 break-words text-sm font-semibold text-black">{formatDetailValue(row.value)}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

function GrowthChatModal({
  dashboard,
  onClose,
}: {
  dashboard: GrowthDashboardData;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: growthOpeningMessage(dashboard),
    },
  ]);
  const suggestions = [
    "What should we fix first?",
    "Why is retention low?",
    "What is happening with outreach email?",
    "Which events are missing?",
  ];

  async function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    const nextHistory: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(nextHistory);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/admin/growth/assistant", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          days: dashboard.period.days || 30,
          history: nextHistory.slice(-8),
          question: trimmed,
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok || !body?.data?.answer) {
        throw new Error(body?.error ?? "Assistant answer could not be generated.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", text: body.data.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: error instanceof Error
            ? `I could not generate an answer: ${error.message}`
            : "I could not generate an answer.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/24 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="grid h-[min(760px,90dvh)] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-white/65 bg-white/74 shadow-[0_34px_120px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/60 bg-white/28 px-5 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">Growth assistant</p>
            <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-black">Ask what to improve</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close growth assistant"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/65 bg-white/50 text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.16)]"
          >
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={[
                  "max-w-[82%] whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
                  message.role === "assistant"
                    ? "justify-self-start border-white/60 bg-white/50 text-black/72"
                    : "justify-self-end border-black/10 bg-black text-white",
                ].join(" ")}
              >
                {message.text}
              </div>
            ))}
            {pending ? (
              <div className="justify-self-start rounded-lg border border-white/60 bg-white/50 px-4 py-3 text-sm font-semibold text-black/54 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                Checking live dashboard...
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/60 bg-white/28 p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void submitQuestion(suggestion)}
                disabled={pending}
                className="shrink-0 rounded-full border border-white/65 bg-white/45 px-3 py-2 text-xs font-semibold text-black transition hover:-translate-y-0.5 hover:bg-white/72 hover:shadow-[0_12px_30px_rgba(80,104,231,0.12)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submitQuestion(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={pending}
              placeholder="Ask about retention, churn, email, events, or revenue..."
              className="min-h-11 min-w-0 flex-1 rounded-full border border-white/65 bg-white/58 px-4 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition placeholder:text-black/35 focus:border-[#5068e7] focus:bg-white/78"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)] disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? <RefreshCw aria-hidden="true" className="animate-spin" size={15} strokeWidth={1.9} /> : <Send aria-hidden="true" size={15} strokeWidth={1.9} />}
              {pending ? "Asking" : "Ask"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ContentEditorModal({
  editor,
  onClose,
  onEdit,
  onSave,
}: {
  editor: ContentEditorState;
  onClose: () => void;
  onEdit: () => void;
  onSave: (formData: FormData) => Promise<void>;
}) {
  const title = contentTitle(editor.type, editor.row);
  const rows = contentRows(editor.type, editor.row);
  const showMedia = mediaContentTypes.has(editor.type);
  const editorGridClass = showMedia
    ? "grid min-h-0 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
    : "grid min-h-0 gap-4";

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    form.querySelectorAll<HTMLInputElement>("input[type='checkbox'][name]").forEach((input) => {
      formData.set(input.name, input.checked ? "1" : "0");
    });

    await onSave(formData);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="grid max-h-[88dvh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/65 bg-white/70 shadow-[0_34px_120px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/60 bg-white/30 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">
              {titleCase(editor.type)}
            </p>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-black">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {editor.mode === "view" ? (
              <button
                type="button"
                onClick={onEdit}
                disabled={editor.loading}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/65 bg-white/50 px-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(80,104,231,0.14)] disabled:opacity-45"
              >
                <PenLine aria-hidden="true" size={15} strokeWidth={1.9} />
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close detail"
              className="grid size-9 place-items-center rounded-full border border-white/65 bg-white/50 text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.16)]"
            >
              <X aria-hidden="true" size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">
          {editor.error ? (
            <div className="mb-3 rounded-lg border border-[#f3df9c] bg-[#fff9e8] p-3 text-sm font-semibold text-[#96690f]">
              {editor.error}
            </div>
          ) : null}
          {editor.loading ? (
            <div className="grid min-h-64 place-items-center rounded-lg border border-white/55 bg-white/38">
              <RefreshCw aria-hidden="true" className="animate-spin text-[#5068e7]" size={22} />
            </div>
          ) : editor.mode === "edit" ? (
            <form onSubmit={submitForm} className={editorGridClass}>
              {showMedia ? <MediaPreview row={editor.row} /> : null}
              <div className="grid content-start gap-3">
                <ContentEditFields row={editor.row} type={editor.type} />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-10 rounded-full border border-white/65 bg-white/42 px-4 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editor.saving}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)] disabled:cursor-wait disabled:opacity-60"
                  >
                    {editor.saving ? <RefreshCw aria-hidden="true" className="animate-spin" size={15} /> : <Save aria-hidden="true" size={15} />}
                    Save
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className={editorGridClass}>
              {showMedia ? <MediaPreview row={editor.row} /> : null}
              <div className="grid content-start gap-2">
                {rows.map((row) => (
                  <div key={`${row.label}-${String(row.value)}`} className="grid gap-1 border-b border-black/10 py-2 last:border-0 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{row.label}</p>
                    <p className="min-w-0 break-words text-sm font-semibold text-black">{formatDetailValue(row.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MediaPreview({ row }: { row: GrowthContentRow }) {
  const preview = row.preview ?? {};
  const rawVideo = row.video;
  const rawThumbnail = row.thumbnail ?? row.cover_image;
  const rawAudio = row.audio_link ?? row.audio_file ?? row.file;
  const videoUrl = normalizeMediaUrl(preview.video_url) ?? normalizeMediaUrl(rawVideo);
  const thumbnailUrl = normalizeMediaUrl(preview.thumbnail_url) ?? normalizeMediaUrl(rawThumbnail);
  const audioUrl = normalizeMediaUrl(preview.audio_url) ?? normalizeMediaUrl(rawAudio);
  const mediaKey = `${videoUrl ?? ""}|${thumbnailUrl ?? ""}|${audioUrl ?? ""}`;
  const [failedState, setFailedState] = useState({
    key: mediaKey,
    video: false,
    thumbnail: false,
    audio: false,
  });
  const failed = failedState.key === mediaKey
    ? failedState
    : { key: mediaKey, video: false, thumbnail: false, audio: false };

  function markFailed(kind: "video" | "thumbnail" | "audio") {
    setFailedState((current) => {
      const currentForMedia = current.key === mediaKey
        ? current
        : { key: mediaKey, video: false, thumbnail: false, audio: false };

      return currentForMedia[kind] ? currentForMedia : { ...currentForMedia, [kind]: true };
    });
  }

  if (!videoUrl && !thumbnailUrl && !audioUrl && !rawVideo && !rawThumbnail && !rawAudio) {
    return (
      <div className="grid min-h-64 place-items-center border-y border-black/10 p-5 text-center">
        <div>
          <Eye aria-hidden="true" className="mx-auto text-black/38" size={26} />
          <p className="mt-3 text-sm font-semibold text-black/58">No media preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid content-start gap-3">
      {videoUrl && !failed.video ? (
        <div className="overflow-hidden bg-black">
          <video
            src={videoUrl}
            controls
            preload="metadata"
            onError={() => markFailed("video")}
            className="aspect-video w-full bg-black object-contain"
          />
        </div>
      ) : null}
      {thumbnailUrl && !failed.thumbnail ? (
        <div className="overflow-hidden bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt=""
            onError={() => markFailed("thumbnail")}
            className="max-h-72 w-full object-contain"
          />
        </div>
      ) : null}
      {audioUrl && !failed.audio ? (
        <div className="border-y border-black/10 py-3">
          <audio src={audioUrl} controls onError={() => markFailed("audio")} className="w-full" />
        </div>
      ) : null}
      {failed.video || failed.thumbnail || failed.audio ? (
        <p className="border-b border-black/10 pb-2 text-xs font-medium leading-5 text-[#96690f]">
          Some media could not render inline. Use the direct links below to open the source asset.
        </p>
      ) : null}
      <div className="grid gap-2">
        {videoUrl ? <MediaLink icon={PlayCircle} label="Video" url={videoUrl} /> : null}
        {thumbnailUrl ? <MediaLink icon={ImageIcon} label="Thumbnail" url={thumbnailUrl} /> : null}
        {audioUrl ? <MediaLink icon={Music} label="Audio" url={audioUrl} /> : null}
      </div>
    </div>
  );
}

function MediaLink({ icon: Icon, label, url }: { icon: LucideIcon; label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-9 items-center justify-between gap-3 rounded-full border border-white/60 bg-white/45 px-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(80,104,231,0.14)]"
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon aria-hidden="true" size={15} className="shrink-0 text-[#5068e7]" />
        <span>{label}</span>
      </span>
      <ExternalLink aria-hidden="true" size={14} className="shrink-0 text-black/48" />
    </a>
  );
}

function normalizeMediaUrl(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return encodeURI(trimmed);
  }

  if (trimmed.startsWith("//")) {
    return `https:${encodeURI(trimmed)}`;
  }

  if (trimmed.startsWith("/")) {
    return encodeURI(trimmed);
  }

  return null;
}

function ContentEditFields({ row, type }: { row: GrowthContentRow; type: ContentKey }) {
  return (
    <div className="grid gap-3">
      <ReadonlyField label="ID" value={row.id ?? "n/a"} />
      {contentEditFields(type, row).map((field) => (
        <EditField key={field.name} field={field} />
      ))}
      {contentUploadFields(type).map((field) => (
        <label key={field.name} className="grid gap-1.5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/48">
            <Upload aria-hidden="true" size={13} />
            {field.label}
          </span>
          <input
            name={field.name}
            type="file"
            accept={field.accept}
            className="min-h-10 rounded-lg border border-white/65 bg-white/50 px-3 py-2 text-sm text-black file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </label>
      ))}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{label}</span>
      <div className="min-h-10 rounded-lg border border-white/55 bg-black/[0.04] px-3 py-2 text-sm font-semibold text-black/58">
        {value}
      </div>
    </div>
  );
}

type EditFieldConfig = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "checkbox";
  value?: string | number | boolean | null;
};

function EditField({ field }: { field: EditFieldConfig }) {
  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-white/55 bg-white/42 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{field.label}</span>
        <input name={field.name} type="checkbox" defaultChecked={Boolean(field.value)} className="size-4 accent-black" />
      </label>
    );
  }

  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{field.label}</span>
      {field.type === "textarea" ? (
        <textarea
          name={field.name}
          defaultValue={field.value === null || field.value === undefined ? "" : String(field.value)}
          rows={4}
          className="min-h-28 resize-y rounded-lg border border-white/65 bg-white/50 px-3 py-2 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
        />
      ) : (
        <input
          name={field.name}
          type={field.type ?? "text"}
          defaultValue={field.value === null || field.value === undefined ? "" : String(field.value)}
          className="min-h-10 rounded-lg border border-white/65 bg-white/50 px-3 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#5068e7] focus:bg-white/78"
        />
      )}
    </label>
  );
}

function DashboardSkeleton({ error, loading }: { error?: string; loading: boolean }) {
  return (
    <div className="grid h-full min-h-0 place-items-center rounded-lg border border-white/60 bg-white/34 p-6 text-center shadow-[0_24px_80px_rgba(80,104,231,0.12),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-2xl">
      <div className="w-full max-w-xl">
        <div className="mx-auto grid size-12 place-items-center rounded-full border border-white/70 bg-white/54 shadow-[0_18px_42px_rgba(80,104,231,0.18)]">
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin text-[#5068e7]" : "text-[#a36f00]"} size={20} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-black">
          {loading ? "Loading growth data" : "Dashboard data unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-black/62">
          {error || "The console is ready. Metrics hydrate in the background so login and navigation stay fast."}
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-lg border border-white/55 bg-white/42" />
          ))}
        </div>
      </div>
    </div>
  );
}

function emptyTemplateForm(): OutreachTemplateForm {
  return {
    name: "",
    channel: "email",
    category: "",
    status: "draft",
    subject: "",
    preview_text: "",
    body: "",
    external_provider: "",
    external_template_id: "",
    external_generation: "",
    external_updated_at: "",
    external_metadata: null,
  };
}

function templateFormFromTemplate(template: GrowthOutreachTemplate): OutreachTemplateForm {
  return {
    id: template.id,
    name: template.name ?? "",
    channel: template.channel === "push" ? "push" : "email",
    category: template.category ?? "",
    status: template.status === "active" || template.status === "archived" ? template.status : "draft",
    subject: template.subject ?? "",
    preview_text: template.preview_text ?? "",
    body: template.body ?? "",
    external_provider: template.external_provider === "sendgrid" ? "sendgrid" : "",
    external_template_id: template.external_template_id ?? "",
    external_generation: template.external_generation ?? "",
    external_updated_at: template.external_updated_at ?? "",
    external_metadata: template.external_metadata ?? null,
  };
}

function templatePayloadFromForm(form: OutreachTemplateForm): Partial<GrowthOutreachTemplate> {
  const externalProvider = form.external_provider || null;

  return {
    name: form.name.trim(),
    channel: form.channel,
    category: form.category.trim() || null,
    status: form.status,
    subject: form.subject.trim() || null,
    preview_text: form.preview_text.trim() || null,
    body: form.body,
    variables: extractTemplateVariables(`${form.subject}\n${form.preview_text}\n${form.body}`),
    external_provider: externalProvider,
    external_template_id: externalProvider === "sendgrid" ? form.external_template_id.trim() || null : null,
    external_generation: externalProvider === "sendgrid" ? form.external_generation.trim() || null : null,
    external_updated_at: externalProvider === "sendgrid" ? form.external_updated_at || null : null,
    external_metadata: externalProvider === "sendgrid" ? form.external_metadata ?? null : null,
  };
}

function templatePayloadFromSendGrid(template: GrowthSendGridTemplate): Partial<GrowthOutreachTemplate> {
  const subject = template.active_version?.subject ?? "";

  return {
    name: template.name,
    channel: "email",
    category: "sendgrid",
    status: "draft",
    subject: subject || null,
    preview_text: null,
    body: subject ? `Linked SendGrid dynamic template: ${subject}` : "Linked SendGrid dynamic template.",
    variables: [],
    external_provider: "sendgrid",
    external_template_id: template.id,
    external_generation: template.generation ?? "dynamic",
    external_updated_at: template.updated_at ?? null,
    external_metadata: {
      active_version: template.active_version ?? null,
      imported_from: "sendgrid_transactional_templates",
    },
  };
}

function emptyDripForm(): OutreachDripForm {
  return {
    name: "",
    status: "draft",
    audience_key: "",
    goal: "",
    description: "",
    steps: [emptyDripStep(1)],
  };
}

function dripFormFromDrip(drip: GrowthOutreachDrip): OutreachDripForm {
  return {
    id: drip.id,
    name: drip.name ?? "",
    status: drip.status === "active" || drip.status === "paused" || drip.status === "archived" ? drip.status : "draft",
    audience_key: drip.audience_key ?? "",
    goal: drip.goal ?? "",
    description: drip.description ?? "",
    steps: drip.steps?.length
      ? drip.steps.map((step, index) => dripFormStepFromStep(step, index))
      : [emptyDripStep(1)],
  };
}

function dripPayloadFromForm(form: OutreachDripForm): Partial<GrowthOutreachDrip> {
  const steps = form.steps
    .filter((step) => step.name.trim() || step.template_id)
    .map((step) => {
      const delayAmount = Number(step.delay_amount || 0);
      return {
        ...(step.id ? { id: step.id } : {}),
        name: step.name.trim() || "Untitled step",
        channel: step.channel,
        template_id: step.template_id ? Number(step.template_id) : null,
        trigger_key: step.trigger_key || "user_joined",
        delay_amount: Number.isFinite(delayAmount) ? delayAmount : 0,
        delay_unit: step.delay_unit,
        status: step.status,
      } satisfies GrowthOutreachStep;
    });

  return {
    name: form.name.trim(),
    status: form.status,
    audience_key: form.audience_key || null,
    goal: form.goal.trim() || null,
    description: form.description.trim() || null,
    channel_mix: {
      email: steps.filter((step) => step.channel === "email").length,
      push: steps.filter((step) => step.channel === "push").length,
    },
    steps,
  };
}

function emptyDripStep(position: number): OutreachDripFormStep {
  return {
    local_id: `new-step-${position}`,
    name: position === 1 ? "First touch" : `Step ${position}`,
    channel: "email",
    template_id: "",
    trigger_key: "user_joined",
    delay_amount: position === 1 ? "0" : String(position),
    delay_unit: position === 1 ? "hours" : "days",
    status: "active",
  };
}

function dripFormStepFromStep(step: GrowthOutreachStep, index: number): OutreachDripFormStep {
  return {
    id: step.id,
    local_id: step.id ? `step-${step.id}` : `step-${index + 1}`,
    name: step.name ?? `Step ${index + 1}`,
    channel: step.channel === "push" ? "push" : "email",
    template_id: step.template_id ? String(step.template_id) : "",
    trigger_key: step.trigger_key || "user_joined",
    delay_amount: String(step.delay_amount ?? 0),
    delay_unit: step.delay_unit === "minutes" || step.delay_unit === "days" ? step.delay_unit : "hours",
    status: step.status === "paused" ? "paused" : "active",
  };
}

function extractTemplateVariables(text: string) {
  const variables = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}

function dedupeRecentEvents(events: GrowthDashboardData["events"]["recent"]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = recentEventKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recentEventKey(event: GrowthDashboardData["events"]["recent"][number]) {
  return [
    event.event_name,
    event.source,
    event.user_id ?? "anonymous",
    event.created_at,
  ].join("|");
}

function trendSummaryRows(data: GrowthTrendPoint[]) {
  const values = data.map((point) => point.count);
  const latest = values.at(-1) ?? 0;
  const peak = values.length ? Math.max(...values) : 0;
  const total = values.reduce((sum, value) => sum + value, 0);

  return [
    { label: "Latest", value: latest },
    { label: "Peak", value: peak },
    { label: "Total", value: total },
    { label: "Points", value: data.length },
  ];
}

function retentionCurveRows(retention: GrowthDashboardData["summary"]["users"]["retention"]) {
  return (["d1", "d7", "d30"] as const).flatMap((key) => {
    const cohort = retention[key];
    return [
      { label: `${key.toUpperCase()} rate`, value: formatPercent(cohort?.rate ?? 0) },
      { label: `${key.toUpperCase()} target benchmark`, value: formatPercent(retentionTargets[key]) },
      { label: `${key.toUpperCase()} retained`, value: `${formatNumber(cohort?.retained ?? 0)} / ${formatNumber(cohort?.cohort ?? 0)}` },
    ];
  });
}

function chartDetail(title: string, value: string, data: GrowthTrendPoint[], color: string): DetailView {
  return {
    eyebrow: "Expanded chart",
    title,
    chart: { color, data, value },
    rows: trendSummaryRows(data),
  };
}

function growthOpeningMessage(dashboard: GrowthDashboardData) {
  const retention = dashboard.summary.users.retention;
  const topTodo = dashboard.health.todos[0];
  return [
    `Health score is ${dashboard.health.score} (${titleCase(dashboard.health.status)}).`,
    `D1/D7/D30 retention is ${formatPercent(retention.d1?.rate ?? 0)} / ${formatPercent(retention.d7?.rate ?? 0)} / ${formatPercent(retention.d30?.rate ?? 0)} against dashboard target benchmarks of ${retentionTargets.d1}% / ${retentionTargets.d7}% / ${retentionTargets.d30}%.`,
    topTodo ? `Top fix: ${topTodo.title}. ${topTodo.action}` : "No urgent operator tasks are open for this window.",
  ].join("\n\n");
}

function retentionDetail(label: string, cohort?: { cohort: number; retained: number; rate: number }): DetailView {
  return {
    eyebrow: "Retention cohort",
    title: label,
    rows: [
      { label: "Cohort", value: cohort?.cohort ?? 0 },
      { label: "Retained", value: cohort?.retained ?? 0 },
      { label: "Rate", value: `${cohort?.rate ?? 0}%` },
    ],
  };
}

function normalizeSystemHealthCheck(check: GrowthHealthCheck): GrowthHealthCheck {
  if (check.key === "sendgrid") {
    return {
      ...check,
      label: "SendGrid outreach sends",
      detail: check.detail.replace(/legacy email records/gi, "recorded email rows"),
    };
  }

  return check;
}

function isSupportedSystemHealthCheck(check: GrowthHealthCheck) {
  return new Set([
    "first_party_events",
    "push",
    "revenuecat",
    "sendgrid",
    "setup",
  ]).has(check.key);
}

function isSupportedSystemIntegration(key: string) {
  return new Set([
    "dashboard_key",
    "growth_automation_enabled",
    "rudderstack_data_plane_url",
    "rudderstack_write_key",
    "sendgrid_api_key",
  ]).has(key);
}

function contentTitle(contentType: ContentKey, row: GrowthContentRow) {
  return String(row.title ?? row.content ?? row.jounral_name ?? `${titleCase(contentType)} item`);
}

function contentRows(contentType: ContentKey, row: GrowthContentRow) {
  const title = row.title ?? row.content ?? row.jounral_name ?? `${titleCase(contentType)} item`;
  return [
    { label: "ID", value: row.id },
    { label: "Status", value: row.status },
    { label: "Subtitle", value: row.subtitle ?? row.sub_title },
    { label: "Title", value: title },
    { label: "Description", value: row.description ?? row.desc },
    { label: "Artist", value: row.artist },
    { label: "Author", value: row.author },
    { label: "Duration", value: row.duration ?? row.time },
    { label: "Activity ID", value: row.activity_id },
    { label: "Activity Type", value: row.activity_type },
    { label: "Category", value: row.cat_id },
    { label: "Audio Category", value: row.audio_category_id },
    { label: "User ID", value: row.user_id },
    { label: "Trending", value: row.is_trending },
    { label: "Partner Content", value: row.partner_content ?? row.is_partner_content },
    { label: "Partner ID", value: row.partner_id },
    { label: "Video", value: row.video },
    { label: "Thumbnail", value: row.thumbnail ?? row.cover_image },
    { label: "Audio", value: row.audio_link },
    { label: "Audio File", value: row.audio_file },
    { label: "File", value: row.file },
    { label: "Share link", value: row.share_link },
    { label: "Spotify URL", value: row.spotify_url },
    { label: "Created", value: row.created_at ? formatDateTime(row.created_at) : null },
    { label: "Updated", value: row.updated_at ? formatDateTime(row.updated_at) : null },
  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== "");
}

function contentEditFields(type: ContentKey, row: GrowthContentRow): EditFieldConfig[] {
  if (type === "meditations" || type === "exercises") {
    return [
      { name: "title", label: "Title", value: row.title },
      { name: "sub_title", label: "Subtitle", value: row.sub_title ?? row.subtitle },
      { name: "desc", label: "Description", type: "textarea", value: row.desc ?? row.description },
      { name: "time", label: "Time", value: row.time },
      { name: "duration", label: "Duration", value: row.duration },
      { name: "artist", label: "Artist", value: row.artist },
      { name: "video", label: "Video URL or S3 path", value: row.video },
      { name: "thumbnail", label: "Thumbnail URL or S3 path", value: row.thumbnail },
      { name: "share_link", label: "Share link", value: row.share_link },
      { name: "activity_type", label: "Activity type", type: "number", value: row.activity_type },
      { name: "activity_id", label: "Activity ID", type: "number", value: row.activity_id },
      { name: "status", label: "Status", value: row.status },
      { name: "is_partner_content", label: "Partner content", type: "checkbox", value: row.partner_content ?? row.is_partner_content },
      { name: "partner_id", label: "Partner ID", type: "number", value: row.partner_id },
    ];
  }

  if (type === "audio") {
    return [
      { name: "title", label: "Title", value: row.title },
      { name: "artist", label: "Artist", value: row.artist },
      { name: "duration", label: "Duration", value: row.duration },
      { name: "audio_link", label: "Audio URL or S3 path", value: row.audio_link },
      { name: "cover_image", label: "Cover image URL or S3 path", value: row.cover_image },
      { name: "share_link", label: "Share link", value: row.share_link },
      { name: "spotify_url", label: "Spotify URL", value: row.spotify_url },
      { name: "audio_category_id", label: "Audio category ID", type: "number", value: row.audio_category_id },
      { name: "status", label: "Status", value: row.status },
      { name: "is_trending", label: "Trending", type: "checkbox", value: row.is_trending },
      { name: "is_partner_content", label: "Partner content", type: "checkbox", value: row.partner_content ?? row.is_partner_content },
      { name: "partner_id", label: "Partner ID", type: "number", value: row.partner_id },
    ];
  }

  if (type === "quotes") {
    return [
      { name: "content", label: "Content", type: "textarea", value: row.content },
      { name: "author", label: "Author", value: row.author },
    ];
  }

  if (type === "affirmations") {
    return [
      { name: "content", label: "Content", type: "textarea", value: row.content },
    ];
  }

  return [
    { name: "jounral_name", label: "Journal name", value: row.jounral_name },
    { name: "cat_id", label: "Category ID", type: "number", value: row.cat_id },
    { name: "type", label: "Type", value: row.type },
    { name: "user_id", label: "User ID", type: "number", value: row.user_id },
  ];
}

function contentUploadFields(type: ContentKey) {
  if (type === "meditations" || type === "exercises") {
    return [
      { name: "video_file", label: "Replace video", accept: "video/*" },
      { name: "thumbnail_file", label: "Replace thumbnail", accept: "image/*" },
    ];
  }

  if (type === "audio") {
    return [
      { name: "audio_file", label: "Replace audio", accept: "audio/*" },
      { name: "cover_image_file", label: "Replace cover", accept: "image/*" },
    ];
  }

  return [];
}

function formatDetailValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "n/a";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatNumber(value);
  return value;
}

function toneClass(tone: "black" | "blue" | "green" | "red" | "yellow") {
  return {
    black: "bg-black text-white",
    blue: "bg-[#f3f5ff] text-[#5068e7]",
    green: "bg-[#f3fbf1] text-[#176e0f]",
    red: "bg-[#fff3f3] text-[#9f1f20]",
    yellow: "bg-[#fff9e8] text-[#96690f]",
  }[tone];
}

function signalToneClass(tone: "neutral" | "good" | "warn") {
  if (tone === "good") return "text-[#176e0f]";
  if (tone === "warn") return "text-[#96690f]";
  return "text-black";
}

function emailStatusColor(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("bounce") || normalized.includes("spam")) return "#f45253";
  if (normalized.includes("open") || normalized.includes("click")) return "#5068e7";
  if (normalized.includes("sent") || normalized.includes("deliver")) return "#209d13";
  return "#d29a13";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatChartDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function labelize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function titleCase(value: string) {
  return labelize(value);
}

function fallbackReadiness(): GrowthReadiness {
  return {
    status: "needs_setup",
    ready_count: 0,
    required_count: 0,
    backend: {},
    endpoints: {},
    tables: {},
    integrations: {},
  };
}
