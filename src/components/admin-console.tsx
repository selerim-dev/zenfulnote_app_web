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
  Quote,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
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
  GrowthReadiness,
  GrowthTodo,
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
  | "lifecycle"
  | "content"
  | "blogs"
  | "system";

type ContentKey = "meditations" | "exercises" | "audio" | "affirmations" | "quotes" | "journals";

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
  { key: "lifecycle", label: "Lifecycle", icon: Mail },
  { key: "content", label: "Content", icon: BookOpen },
  { key: "blogs", label: "Blogs", icon: FileText },
  { key: "system", label: "System", icon: ShieldCheck },
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
  const [periodDays, setPeriodDays] = useState(initialDashboard.period.days || 30);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [dashboardLoaded, setDashboardLoaded] = useState(dashboardInitiallyLoaded);
  const [dashboardLoading, setDashboardLoading] = useState(!dashboardInitiallyLoaded);
  const [dashboardErrorState, setDashboardErrorState] = useState(dashboardError ?? "");
  const [toast, setToast] = useState<Toast | null>(
    initialNotice ?? (dashboardError ? { tone: "warning", message: dashboardError } : null),
  );
  const [auditRunning, setAuditRunning] = useState(false);
  const [detailView, setDetailView] = useState<DetailView | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!toast || toast.sticky) return;
    const timeout = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const users = dashboard.summary.users;
  const subscriptions = dashboard.summary.subscriptions;
  const activation = dashboard.summary.activation;
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

  async function runAudit() {
    const startedAt = performance.now();
    setAuditRunning(true);
    setToast({
      tone: "info",
      sticky: true,
      message: "Lifecycle audit is running. This can take 15-20 seconds while the backend checks email, push, automation, and event health.",
    });

    try {
      const response = await fetch("/api/admin/growth/lifecycle?format=json", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);
      const elapsed = Math.max(1, Math.round((performance.now() - startedAt) / 1000));

      if (!response.ok || !body?.ok) {
        setToast({
          tone: "danger",
          message: body?.error ?? `Lifecycle audit failed after ${elapsed}s.`,
        });
        return;
      }

      setToast({
        tone: "success",
        message: `Lifecycle audit completed in ${elapsed}s. Updating dashboard data.`,
      });
      void refreshDashboard({ days: periodDays, quiet: true });
    } catch (error) {
      setToast({
        tone: "danger",
        message: error instanceof Error ? error.message : "Lifecycle audit failed.",
      });
    } finally {
      setAuditRunning(false);
    }
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
          <div className="flex min-h-16 items-center gap-3 px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3 pr-2">
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

            <nav className="min-w-0 flex-1 overflow-x-auto">
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

            <div className="flex shrink-0 items-center gap-2">
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
              <HeaderActionButton onClick={runAudit} disabled={auditRunning}>
                <RefreshCw
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.9}
                  className={auditRunning ? "animate-spin" : undefined}
                />
                <span className="hidden sm:inline">{auditRunning ? "Auditing" : "Audit"}</span>
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
                activation={activation}
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
              <RetentionPage dashboard={dashboard} dauTrend={dauTrend} onInspect={setDetailView} requestTrend={requestTrend} />
            ) : null}
            {dashboardLoaded && activePage === "events" ? <EventsPage dashboard={dashboard} onInspect={setDetailView} /> : null}
            {dashboardLoaded && activePage === "lifecycle" ? (
              <LifecyclePage
                auditRunning={auditRunning}
                dashboard={dashboard}
                onInspect={setDetailView}
                onAudit={runAudit}
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
  activation,
  dashboard,
  dauTrend,
  onInspect,
  openWork,
  requestTrend,
  subscriptions,
  users,
}: {
  activation: Record<string, number>;
  dashboard: GrowthDashboardData;
  dauTrend: GrowthTrendPoint[];
  onInspect: (detail: DetailView) => void;
  openWork: number;
  requestTrend: GrowthTrendPoint[];
  subscriptions: Record<string, number>;
  users: GrowthDashboardData["summary"]["users"];
}) {
  const activeRate = users.total > 0 ? (users.active_7d / users.total) * 100 : 0;
  const retention = users.retention;
  const eventTrend = dashboard.events.daily ?? [];
  const dailyUsers = activation.daily_request_users ?? 0;

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
            eyebrow: "Lifecycle email",
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

      <div className="grid min-h-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <Panel title="App Pulse" eyebrow={`${dashboard.period.days} day window`} icon={TrendingUp}>
        <div className="grid h-full min-h-0 gap-2.5 overflow-y-auto pr-1">
          <div className="grid min-h-0 gap-3 md:grid-cols-2">
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
            <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-lg border border-white/55 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(80,104,231,0.14)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">Activation users</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-black">{formatNumber(dailyUsers)}</p>
                </div>
                <Target aria-hidden="true" className="text-[#d29a13]" size={18} strokeWidth={1.9} />
              </div>
              <div className="min-h-0 content-center">
                <RetentionTargetGrid
                  compact
                  retention={retention}
                  onInspect={(label, cohort) => onInspect(retentionDetail(label, cohort))}
                />
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid min-h-0 gap-3 lg:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
        <Panel title="Conversion Shape" eyebrow="Current funnel" icon={BarChart3}>
          <button
            type="button"
            onClick={() => onInspect({
              eyebrow: "Current funnel",
              title: "Conversion Shape",
              rows: dashboard.funnel.map((item) => ({ label: item.label, value: item.count })),
            })}
            className="h-full w-full text-left"
          >
            <ScrollStack>
              <FunnelBars funnel={dashboard.funnel} />
            </ScrollStack>
          </button>
        </Panel>
        <Panel title="Operator Queue" eyebrow="Highest priority" icon={Sparkles}>
          <button
            type="button"
            onClick={() => onInspect({
              eyebrow: "Highest priority",
              title: "Operator Queue",
              rows: dashboard.health.todos.map((todo) => ({ label: todo.title, value: todo.action })),
            })}
            className="h-full w-full text-left"
          >
            <ScrollStack>
              {dashboard.health.todos.slice(0, 7).map((todo) => (
                <TodoRow key={`${todo.title}-${todo.action}`} todo={todo} />
              ))}
              {!dashboard.health.todos.length ? (
                <QuietState
                  icon={CheckCircle2}
                  title="No urgent tasks"
                  detail="The current growth checks are clear for this period."
                  tone="good"
                />
              ) : null}
            </ScrollStack>
          </button>
        </Panel>
      </div>
      </div>
    </div>
  );
}

function RetentionPage({
  dashboard,
  dauTrend,
  onInspect,
  requestTrend,
}: {
  dashboard: GrowthDashboardData;
  dauTrend: GrowthTrendPoint[];
  onInspect: (detail: DetailView) => void;
  requestTrend: GrowthTrendPoint[];
}) {
  const retention = dashboard.summary.users.retention;

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:overflow-hidden">
      <Panel title="Retention Cohorts" eyebrow="Returned after signup" icon={HeartPulse}>
        <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <RetentionCard
              label="Day 1"
              cohort={retention.d1?.cohort ?? 0}
              retained={retention.d1?.retained ?? 0}
              rate={retention.d1?.rate ?? 0}
              onClick={() => onInspect(retentionDetail("Day 1", retention.d1))}
            />
            <RetentionCard
              label="Day 7"
              cohort={retention.d7?.cohort ?? 0}
              retained={retention.d7?.retained ?? 0}
              rate={retention.d7?.rate ?? 0}
              onClick={() => onInspect(retentionDetail("Day 7", retention.d7))}
            />
            <RetentionCard
              label="Day 30"
              cohort={retention.d30?.cohort ?? 0}
              retained={retention.d30?.retained ?? 0}
              rate={retention.d30?.rate ?? 0}
              onClick={() => onInspect(retentionDetail("Day 30", retention.d30))}
            />
          </div>
          <RetentionTargetGrid
            retention={retention}
            onInspect={(label, cohort) => onInspect(retentionDetail(label, cohort))}
          />
          <ChartBlock
            title="Daily active trend"
            value={formatNumber(dashboard.summary.users.active_7d)}
            data={dauTrend}
            color="#5068e7"
            onClick={() => onInspect(chartDetail("Daily active users", formatNumber(dashboard.summary.users.active_7d), dauTrend, "#5068e7"))}
          />
        </div>
      </Panel>
      <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,0.54fr)_minmax(0,0.46fr)]">
        <Panel title="Activation Mix" eyebrow="Behavior loops" icon={Activity}>
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
        <Panel title="Backend Activity Requests" eyebrow="Request volume" icon={TrendingUp}>
          <ChartBlock
            title="Last 30 days"
            value={formatNumber(dashboard.activity?.total_requests ?? 0)}
            data={requestTrend}
            color="#111111"
            onClick={() => onInspect(chartDetail("Backend activity requests", formatNumber(dashboard.activity?.total_requests ?? 0), requestTrend, "#111111"))}
          />
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
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:overflow-hidden">
      <Panel title="Event Coverage" eyebrow="Expected client taxonomy" icon={ClipboardList}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <button
            type="button"
            onClick={() => onInspect({
              eyebrow: "Event coverage",
              title: `${dashboard.events.coverage.percent}% covered`,
              rows: [
                { label: "Tracked", value: dashboard.events.coverage.tracked },
                { label: "Expected", value: dashboard.events.coverage.expected },
                { label: "Missing", value: dashboard.events.coverage.missing.length },
              ],
            })}
            className="grid gap-3 rounded-lg border border-white/55 bg-white/42 p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(80,104,231,0.14)] sm:grid-cols-[150px_minmax(0,1fr)]"
          >
            <RingMeter value={dashboard.events.coverage.percent} />
            <div className="grid content-center gap-2">
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
          <ChartBlock
            title="Daily growth events"
            value={formatNumber(dashboard.events.total)}
            data={dashboard.events.daily}
            color="#ea6fcf"
            onClick={() => onInspect(chartDetail("Daily growth events", formatNumber(dashboard.events.total), dashboard.events.daily, "#ea6fcf"))}
          />
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
              {dashboard.events.recent.map((event) => (
                <SignalRow
                  key={`${event.event_name}-${event.created_at}`}
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
              {!dashboard.events.recent.length ? (
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

function LifecyclePage({
  auditRunning,
  dashboard,
  onInspect,
  onAudit,
  readiness,
}: {
  auditRunning: boolean;
  dashboard: GrowthDashboardData;
  onInspect: (detail: DetailView) => void;
  onAudit: () => void;
  readiness: GrowthReadiness;
}) {
  const loopsReady = readiness.integrations.loops_api_key && readiness.integrations.loops_webhook_secret;
  const sendgridReady = readiness.integrations.sendgrid_api_key;

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:overflow-hidden">
      <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
        <Panel title="Lifecycle Email" eyebrow="Delivery mix" icon={Mail}>
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <TinyStat label="Total email" value={formatNumber(dashboard.emails.total)} />
              <TinyStat label="Growth sends" value={formatNumber(dashboard.emails.growth_total)} />
              <TinyStat label="Failed" value={formatNumber(dashboard.emails.failed)} />
              <TinyStat label="Failure rate" value={`${dashboard.emails.failure_rate}%`} />
            </div>
            <ScrollStack>
              <EmailStatusBars
                emails={dashboard.emails.by_type}
                onInspect={(email) => onInspect({
                  eyebrow: "Email cohort",
                  title: `${email.email_type} / ${email.status}`,
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
        <Panel title="Vendor Readiness" eyebrow="Loops and SendGrid" icon={ShieldCheck}>
          <ScrollStack>
            <HealthCheckRow
              check={{
                key: "loops",
                label: "Loops",
                status: loopsReady ? "ok" : "needs_setup",
                detail: loopsReady ? "API key and webhook secret are configured." : "LOOPS_API_KEY or LOOPS_WEBHOOK_SECRET is missing.",
              }}
            />
            <HealthCheckRow
              check={{
                key: "sendgrid",
                label: "SendGrid",
                status: sendgridReady ? "ok" : "needs_setup",
                detail: sendgridReady ? "SENDGRID_API_KEY is configured." : "SENDGRID_API_KEY is missing.",
              }}
            />
            {dashboard.vendor_health.map((check) => (
              <HealthCheckRow key={check.key} check={check} />
            ))}
          </ScrollStack>
        </Panel>
      </div>
      <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
        <Panel title="Recent Email Stream" eyebrow="Actual sends" icon={Send}>
          <EmailRecentStream emails={dashboard.emails.recent} onInspect={onInspect} />
        </Panel>
        <Panel title="Automation Runs" eyebrow="Audit and recommendations" icon={RefreshCw}>
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <button
              type="button"
              onClick={onAudit}
              disabled={auditRunning}
              className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#292929] hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)] disabled:cursor-wait disabled:opacity-65"
            >
              <RefreshCw
                aria-hidden="true"
                size={16}
                strokeWidth={1.9}
                className={auditRunning ? "animate-spin" : undefined}
              />
              {auditRunning ? "Audit running" : "Run audit"}
            </button>
            <ScrollStack>
              {dashboard.automation.recent_runs.map((run) => (
                <SignalRow
                  key={`${run.run_type}-${run.started_at}`}
                  title={run.run_type}
                  detail={run.finished_at ? `Finished ${formatDateTime(run.finished_at)}` : "Run in progress"}
                  value={titleCase(run.status)}
                  tone={run.status === "completed" ? "good" : "warn"}
                  onClick={() => onInspect({
                    eyebrow: "Automation run",
                    title: run.run_type,
                    rows: [
                      { label: "Status", value: titleCase(run.status) },
                      { label: "Health score", value: run.health_score ?? "n/a" },
                      { label: "Started", value: run.started_at ? formatDateTime(run.started_at) : "n/a" },
                      { label: "Finished", value: run.finished_at ? formatDateTime(run.finished_at) : "n/a" },
                    ],
                  })}
                />
              ))}
              {!dashboard.automation.recent_runs.length ? (
                <QuietState
                  icon={AlertTriangle}
                  title="No automation runs"
                  detail="Run an audit after Loops workflows are configured."
                  tone="warn"
                />
              ) : null}
            </ScrollStack>
          </div>
        </Panel>
      </div>
    </div>
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
            <div className="min-h-0 overflow-y-auto rounded-lg border border-white/50 bg-white/36 backdrop-blur-xl">
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
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:overflow-hidden">
      <Panel title="System Health" eyebrow="Vendor status" icon={ShieldCheck}>
        <ScrollStack>
          {dashboard.health.checks.map((check) => (
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
        <Panel title="Readiness" eyebrow="Backend wiring" icon={CheckCircle2}>
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
              {Object.entries(readiness.integrations).map(([key, value]) => (
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
        <Panel title="Endpoints" eyebrow="Connected APIs" icon={Send}>
          <ScrollStack>
            {Object.entries(readiness.endpoints ?? {}).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => onInspect({
                  eyebrow: "Endpoint",
                  title: labelize(key),
                  description: value,
                })}
                className="grid gap-1 border-b border-black/10 py-2.5 text-left transition hover:translate-x-1 last:border-0"
              >
                <p className="text-sm font-semibold text-black">{labelize(key)}</p>
                <p className="truncate font-mono text-xs text-black/58">{value}</p>
              </button>
            ))}
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

  const className = "grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] rounded-lg border border-white/55 bg-white/42 p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(80,104,231,0.14)]";

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
  const chart = useMemo(() => {
    const visible = data.slice(-30);
    const max = Math.max(...visible.map((point) => point.count), 1);
    const width = 320;
    const height = 128;
    const xStep = visible.length > 1 ? width / (visible.length - 1) : width;

    return visible.map((point, index) => {
      const x = visible.length > 1 ? index * xStep : width / 2;
      const y = height - 10 - (point.count / max) * (height - 22);
      return { ...point, x, y };
    });
  }, [data]);
  const points = chart;

  if (!points.length) {
    return (
      <div className={["grid h-full place-items-center text-sm font-medium text-black/48", size === "large" ? "min-h-[420px]" : "min-h-28"].join(" ")}>
        No trend data
      </div>
    );
  }

  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,128 ${path} 320,128`;
  const activePoint = hoverIndex === null ? null : points[hoverIndex] ?? null;

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const bounded = Math.max(0, Math.min(1, ratio));
    setHoverIndex(Math.round(bounded * (points.length - 1)));
  }

  const tooltipWidth = 118;
  const tooltipHeight = 42;
  const tooltipX = activePoint ? Math.max(4, Math.min(320 - tooltipWidth - 4, activePoint.x - tooltipWidth / 2)) : 0;
  const tooltipY = activePoint ? (activePoint.y > 56 ? activePoint.y - tooltipHeight - 10 : activePoint.y + 14) : 0;

  return (
    <svg
      viewBox="0 0 320 128"
      className={["h-full w-full", size === "large" ? "min-h-[420px]" : "min-h-28"].join(" ")}
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
      <polyline points={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      {points.slice(-1).map((point) => (
        <circle key={point.date} cx={point.x} cy={point.y} r="3" fill={color} />
      ))}
      {activePoint ? (
        <g className="pointer-events-none">
          <line x1={activePoint.x} x2={activePoint.x} y1="8" y2="120" stroke="rgba(0,0,0,0.18)" strokeDasharray="3 4" />
          <circle cx={activePoint.x} cy={activePoint.y} r="4.5" fill="white" stroke={color} strokeWidth="2" />
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx="9" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.12)" />
            <text x="10" y="17" className="fill-black/55 text-[10px] font-semibold uppercase">
              {formatChartDate(activePoint.date)}
            </text>
            <text x="10" y="33" className="fill-black text-[13px] font-semibold">
              {formatNumber(activePoint.count)}
            </text>
          </g>
        </g>
      ) : null}
    </svg>
  );
}

function FunnelBars({ funnel }: { funnel: GrowthDashboardData["funnel"] }) {
  const max = Math.max(...funnel.map((item) => item.count), 1);

  if (!funnel.length) {
    return (
      <QuietState
        icon={AlertTriangle}
        title="Funnel unavailable"
        detail="Growth events have not reached the backend for this period."
        tone="warn"
      />
    );
  }

  return (
    <div className="grid gap-3">
      {funnel.map((item, index) => (
        <div key={item.key} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-black">{item.label}</span>
            <span className="shrink-0 tabular-nums text-black/58">{formatNumber(item.count)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/[0.08]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(3, (item.count / max) * 100)}%`,
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
          </div>
        </div>
      ))}
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
    <div className="grid h-full min-h-0 items-end gap-3 rounded-lg border border-white/55 bg-white/36 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl sm:grid-cols-4">
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
          <div className="flex h-full items-end rounded-lg bg-white/52 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div
              className="w-full rounded-md"
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

function RetentionCard({
  cohort,
  label,
  onClick,
  rate,
  retained,
}: {
  cohort: number;
  label: string;
  onClick?: () => void;
  rate: number;
  retained: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/55 bg-white/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(80,104,231,0.14)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-black">{label}</p>
        <span className={["rounded-full px-2 py-1 text-xs font-semibold", rate >= 20 ? "bg-[#f3fbf1] text-[#176e0f]" : "bg-[#fff9e8] text-[#96690f]"].join(" ")}>
          {formatPercent(rate)}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-black">{formatNumber(retained)}</p>
      <p className="text-sm text-black/56">of {formatNumber(cohort)} users</p>
    </button>
  );
}

function RetentionTargetGrid({
  compact = false,
  onInspect,
  retention,
}: {
  compact?: boolean;
  onInspect?: (label: string, cohort?: { cohort: number; retained: number; rate: number }) => void;
  retention: GrowthDashboardData["summary"]["users"]["retention"];
}) {
  const items = [
    { key: "d1", label: "D1 retention", target: retentionTargets.d1, cohort: retention.d1 },
    { key: "d7", label: "D7 retention", target: retentionTargets.d7, cohort: retention.d7 },
    { key: "d30", label: "D30 retention", target: retentionTargets.d30, cohort: retention.d30 },
  ];

  return (
    <div className={compact ? "grid gap-2" : "grid gap-2 md:grid-cols-3"}>
      {items.map((item) => {
        const rate = item.cohort?.rate ?? 0;
        const scaleMax = Math.max(item.target * 1.55, rate, 1);
        const barWidth = Math.min(100, (rate / scaleMax) * 100);
        const targetLeft = Math.min(98, (item.target / scaleMax) * 100);
        const delta = rate - item.target;
        const shortLabel = item.key.toUpperCase();

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onInspect?.(item.label.toUpperCase().replace(" RETENTION", ""), item.cohort)}
            className="rounded-lg border border-white/55 bg-white/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(80,104,231,0.14)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/48">{compact ? item.label : shortLabel}</p>
              <span className={["rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", delta >= 0 ? "bg-[#f3fbf1] text-[#176e0f]" : "bg-[#fff9e8] text-[#96690f]"].join(" ")}>
                {delta >= 0 ? "+" : ""}{formatPercent(delta)}
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-xl font-semibold tabular-nums text-black">{formatPercent(rate)}</p>
              <p className="text-xs font-semibold text-[#9b710c]">Gold {formatPercent(item.target)}</p>
            </div>
            <div className="relative mt-2 h-2.5 rounded-full bg-black/[0.08]">
              <div
                className="h-full rounded-full bg-[#5068e7]"
                style={{ width: `${Math.max(rate > 0 ? 3 : 0, barWidth)}%` }}
              />
              <span
                className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#d29a13] shadow-[0_0_0_3px_rgba(210,154,19,0.15)]"
                style={{ left: `${targetLeft}%` }}
              />
            </div>
            {!compact ? (
              <p className="mt-2 truncate text-xs text-black/52">
                {formatNumber(item.cohort?.retained ?? 0)} retained / {formatNumber(item.cohort?.cohort ?? 0)} cohort
              </p>
            ) : null}
          </button>
        );
      })}
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

  if (!emails.length) {
    return (
      <QuietState
        icon={AlertTriangle}
        title="No lifecycle email rows"
        detail="Loops and SendGrid activity will appear here after emails are recorded by the backend."
        tone="warn"
      />
    );
  }

  return (
    <div className="grid gap-2">
      {emails.map((email) => (
        <button
          key={`${email.email_type}-${email.status}`}
          type="button"
          onClick={() => onInspect?.(email)}
          className="rounded-lg border border-white/55 bg-white/40 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_16px_42px_rgba(80,104,231,0.12)]"
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
      {emails.map((email) => (
        <SignalRow
          key={`${email.provider}-${email.email_type}-${email.created_at}`}
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
          detail="The stream fills after lifecycle sends are recorded by the backend."
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

function TodoRow({ todo }: { todo: GrowthTodo }) {
  return (
    <div className="grid gap-1 border-b border-black/10 py-3 last:border-0">
      <div className="flex items-center gap-2">
        <span className={["size-2 rounded-full", severityDotClass(todo.severity)].join(" ")} />
        <p className="text-sm font-semibold text-black">{todo.title}</p>
      </div>
      <p className="text-sm leading-5 text-black/60">{todo.action}</p>
    </div>
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
    <div className="rounded-lg border border-white/55 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl">
      <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-black">{value}</p>
    </div>
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
            <div className="mb-4 grid min-h-[48dvh] rounded-lg border border-white/60 bg-white/44 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
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
                <div key={`${row.label}-${String(row.value)}`} className="grid gap-1 rounded-lg border border-white/55 bg-white/42 p-3">
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: growthOpeningMessage(dashboard),
    },
  ]);
  const suggestions = [
    "What should we fix first?",
    "Why is retention low?",
    "What is happening with lifecycle email?",
    "Which events are missing?",
  ];

  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: growthAnswer(trimmed, dashboard) },
    ]);
    setInput("");
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
          </div>
        </div>

        <div className="border-t border-white/60 bg-white/28 p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submitQuestion(suggestion)}
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
              submitQuestion(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about retention, churn, email, events, or revenue..."
              className="min-h-11 min-w-0 flex-1 rounded-full border border-white/65 bg-white/58 px-4 text-sm text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition placeholder:text-black/35 focus:border-[#5068e7] focus:bg-white/78"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(0,0,0,0.24)]"
            >
              <Send aria-hidden="true" size={15} strokeWidth={1.9} />
              Ask
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
                  <div key={`${row.label}-${String(row.value)}`} className="grid gap-1 rounded-lg border border-white/55 bg-white/42 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
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

  if (!preview.video_url && !preview.thumbnail_url && !preview.audio_url && !rawVideo && !rawThumbnail && !rawAudio) {
    return (
      <div className="grid min-h-64 place-items-center rounded-lg border border-white/55 bg-white/34 p-5 text-center">
        <div>
          <Eye aria-hidden="true" className="mx-auto text-black/38" size={26} />
          <p className="mt-3 text-sm font-semibold text-black/58">No media preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid content-start gap-3 rounded-lg border border-white/55 bg-white/34 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      {preview.video_url ? (
        <div className="overflow-hidden rounded-lg border border-black/10 bg-black">
          <video src={preview.video_url} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
        </div>
      ) : null}
      {preview.thumbnail_url ? (
        <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.thumbnail_url} alt="" className="max-h-72 w-full object-contain" />
        </div>
      ) : null}
      {preview.audio_url ? (
        <div className="rounded-lg border border-black/10 bg-white/58 p-3">
          <audio src={preview.audio_url} controls className="w-full" />
        </div>
      ) : null}
      <div className="grid gap-2">
        {preview.video_url ? <MediaLink icon={PlayCircle} label="Video" url={preview.video_url} /> : null}
        {preview.thumbnail_url ? <MediaLink icon={ImageIcon} label="Thumbnail" url={preview.thumbnail_url} /> : null}
        {preview.audio_url ? <MediaLink icon={Music} label="Audio" url={preview.audio_url} /> : null}
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

const chartColors = ["#5068e7", "#209d13", "#ea6fcf", "#f9bc2c", "#f45253", "#111111"];

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
    `D1/D7/D30 retention is ${formatPercent(retention.d1?.rate ?? 0)} / ${formatPercent(retention.d7?.rate ?? 0)} / ${formatPercent(retention.d30?.rate ?? 0)} against gold targets of ${retentionTargets.d1}% / ${retentionTargets.d7}% / ${retentionTargets.d30}%.`,
    topTodo ? `Top fix: ${topTodo.title}. ${topTodo.action}` : "No urgent operator tasks are open for this window.",
  ].join("\n\n");
}

function growthAnswer(question: string, dashboard: GrowthDashboardData) {
  const normalized = question.toLowerCase();
  const users = dashboard.summary.users;
  const retention = users.retention;
  const topTodo = dashboard.health.todos[0];
  const missingEvents = dashboard.events.coverage.missing;
  const activeUsers = funnelCount(dashboard, ["active_users"], ["active"]);
  const purchases = funnelCount(dashboard, ["purchases"], ["purchase"]);

  if (normalized.includes("retention") || normalized.includes("churn") || normalized.includes("return")) {
    return [
      `Retention is below target: D1 is ${formatPercent(retention.d1?.rate ?? 0)} vs ${retentionTargets.d1}%, D7 is ${formatPercent(retention.d7?.rate ?? 0)} vs ${retentionTargets.d7}%, and D30 is ${formatPercent(retention.d30?.rate ?? 0)} vs ${retentionTargets.d30}%.`,
      "Near-term fix: instrument the missing onboarding/paywall events, then run one onboarding and one lifecycle experiment at a time so we can connect activation behavior to retention movement.",
      `Active 7d users are ${formatNumber(users.active_7d)} out of ${formatNumber(users.total)} total users.`,
    ].join("\n\n");
  }

  if (normalized.includes("email") || normalized.includes("sendgrid") || normalized.includes("loops") || normalized.includes("spam")) {
    return [
      `Email volume is ${formatNumber(dashboard.emails.total)} with a recorded failure rate of ${dashboard.emails.failure_rate}%.`,
      dashboard.readiness?.integrations.sendgrid_api_key ? "SendGrid is configured." : "SendGrid is not marked configured.",
      dashboard.readiness?.integrations.loops_api_key && dashboard.readiness?.integrations.loops_webhook_secret
        ? "Loops is configured."
        : "Loops is not fully configured, so lifecycle email automation is still the highest-confidence setup gap.",
      "For spam specifically, the dashboard can show send/failure records, but inbox placement needs domain authentication and provider-level deliverability signals surfaced from SendGrid/Loops.",
    ].join("\n\n");
  }

  if (normalized.includes("event") || normalized.includes("tracking") || normalized.includes("instrument")) {
    return [
      `Event coverage is ${dashboard.events.coverage.percent}% (${dashboard.events.coverage.tracked}/${dashboard.events.coverage.expected}).`,
      missingEvents.length
        ? `Missing events: ${missingEvents.slice(0, 8).join(", ")}${missingEvents.length > 8 ? ", ..." : ""}.`
        : "All expected events appeared in this period.",
      "If these flows exist in the app, ship or verify iOS instrumentation first; without that, retention and conversion analysis will stay blurry.",
    ].join("\n\n");
  }

  if (normalized.includes("revenue") || normalized.includes("subscription") || normalized.includes("conversion") || normalized.includes("paywall")) {
    return [
      `Active subscriptions are ${formatNumber(dashboard.summary.subscriptions.active ?? 0)} with ${formatNumber(dashboard.summary.subscriptions.new_purchases ?? 0)} purchases in this window.`,
      `The funnel currently shows ${formatNumber(activeUsers)} active users and ${formatNumber(purchases)} purchases.`,
      "The next revenue fix is to complete paywall and purchase event coverage so trial starts, plan selections, purchase attempts, and completions can be compared cleanly.",
    ].join("\n\n");
  }

  return [
    `The most pressing dashboard signal is: ${topTodo ? `${topTodo.title}. ${topTodo.action}` : "no urgent operator task in this period."}`,
    `Health score is ${dashboard.health.score}, event coverage is ${dashboard.events.coverage.percent}%, and D7 retention is ${formatPercent(retention.d7?.rate ?? 0)}.`,
    "I would fix instrumentation and lifecycle setup first, then use the retention and funnel charts to choose one activation experiment and one email experiment.",
  ].join("\n\n");
}

function funnelCount(dashboard: GrowthDashboardData, keys: string[], labelTerms: string[]) {
  const match = dashboard.funnel.find((item) => {
    const label = item.label.toLowerCase();
    return keys.includes(item.key) || labelTerms.some((term) => label.includes(term));
  });

  return match?.count ?? 0;
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

function severityDotClass(severity: string) {
  if (severity === "high") return "bg-[#f45253]";
  if (severity === "medium") return "bg-[#f9bc2c]";
  return "bg-[#5068e7]";
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
