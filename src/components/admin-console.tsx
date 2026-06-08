"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  Mail,
  Music,
  PenLine,
  Quote,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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

export function AdminConsole({
  articles,
  dashboard,
  dashboardError,
  initialNotice,
}: AdminConsoleProps) {
  const router = useRouter();
  const [activePage, setActivePage] = useState<AdminPageKey>("overview");
  const [contentTab, setContentTab] = useState<ContentKey>("meditations");
  const [toast, setToast] = useState<Toast | null>(
    initialNotice ?? (dashboardError ? { tone: "warning", message: dashboardError } : null),
  );
  const [auditRunning, setAuditRunning] = useState(false);

  useEffect(() => {
    if (!toast || toast.sticky) return;
    const timeout = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const users = dashboard.summary.users;
  const subscriptions = dashboard.summary.subscriptions;
  const activation = dashboard.summary.activation;
  const readiness = dashboard.readiness ?? fallbackReadiness();
  const activeRate = users.total > 0 ? (users.active_7d / users.total) * 100 : 0;
  const dauTrend = dashboard.activity?.daily_active_users ?? [];
  const requestTrend = dashboard.activity?.request_volume ?? [];
  const openWork = dashboard.health.todos.length;

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
        message: `Lifecycle audit completed in ${elapsed}s. Refreshing dashboard data.`,
      });
      router.refresh();
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
    <main className="relative isolate flex h-dvh min-h-0 overflow-hidden bg-[#fbfaf6] text-black">
      <Image
        src="/images/generated/brand-atmosphere-light.png"
        alt=""
        fill
        className="absolute inset-0 -z-20 object-cover opacity-65"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-[#fbfaf6]/78" />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-black/10 bg-[#fbfaf6]/86 backdrop-blur-xl">
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
                  src="/images/brand/logotype-dark.png"
                  alt="ZenfulNote"
                  width={118}
                  height={27}
                  className="h-auto w-28 [filter:brightness(0)]"
                  priority
                />
                <p className="mt-0.5 truncate text-xs text-black/54">Admin console</p>
              </div>
            </div>

            <nav className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex w-max gap-1 rounded-lg border border-black/10 bg-white/68 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
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
              <button
                type="button"
                onClick={runAudit}
                disabled={auditRunning}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-black/12 bg-white/76 px-3 text-sm font-semibold text-black transition hover:border-black/35 hover:bg-white disabled:cursor-wait disabled:opacity-65"
              >
                <RefreshCw
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.9}
                  className={auditRunning ? "animate-spin" : undefined}
                />
                <span className="hidden sm:inline">{auditRunning ? "Auditing" : "Audit"}</span>
              </button>
              <form action="/api/admin/session/logout" method="post">
                <button className="min-h-10 rounded-lg bg-black px-3 text-sm font-semibold text-white transition hover:bg-[#292929] sm:px-4">
                  Log out
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 sm:p-4">
          <div className="flex shrink-0 gap-2 overflow-x-auto md:grid md:grid-cols-3 xl:grid-cols-6">
            <MetricTile
              icon={Gauge}
              label="Health"
              value={dashboard.health.score}
              detail={titleCase(dashboard.health.status)}
              tone={dashboard.health.score >= 85 ? "green" : dashboard.health.score >= 65 ? "yellow" : "red"}
            />
            <MetricTile
              icon={Users}
              label="Users"
              value={users.total}
              detail={`${formatNumber(users.new)} new`}
              tone="black"
            />
            <MetricTile
              icon={Activity}
              label="Active 7d"
              value={users.active_7d}
              detail={`${formatPercent(activeRate)} of users`}
              tone="blue"
            />
            <MetricTile
              icon={CircleDollarSign}
              label="Subscriptions"
              value={subscriptions.active ?? 0}
              detail={`${formatNumber(subscriptions.new_purchases ?? 0)} purchases`}
              tone="green"
            />
            <MetricTile
              icon={Mail}
              label="Email Fail"
              value={`${dashboard.emails.failure_rate}%`}
              detail={`${formatNumber(dashboard.emails.total)} records`}
              tone={dashboard.emails.failure_rate >= 5 ? "red" : "green"}
            />
            <MetricTile
              icon={AlertTriangle}
              label="Queue"
              value={openWork}
              detail={`${dashboard.events.coverage.percent}% events`}
              tone={openWork ? "yellow" : "green"}
            />
          </div>

          <div className="min-h-0 overflow-hidden">
            {activePage === "overview" ? (
              <OverviewPage
                activation={activation}
                dashboard={dashboard}
                dauTrend={dauTrend}
                requestTrend={requestTrend}
                users={users}
              />
            ) : null}
            {activePage === "retention" ? (
              <RetentionPage dashboard={dashboard} dauTrend={dauTrend} requestTrend={requestTrend} />
            ) : null}
            {activePage === "events" ? <EventsPage dashboard={dashboard} /> : null}
            {activePage === "lifecycle" ? (
              <LifecyclePage
                auditRunning={auditRunning}
                dashboard={dashboard}
                onAudit={runAudit}
                readiness={readiness}
              />
            ) : null}
            {activePage === "content" ? (
              <ContentPage
                content={dashboard.content}
                contentTab={contentTab}
                onContentTabChange={setContentTab}
              />
            ) : null}
            {activePage === "blogs" ? <BlogsPage articles={articles} /> : null}
            {activePage === "system" ? <SystemPage dashboard={dashboard} readiness={readiness} /> : null}
          </div>
        </section>
      </div>
      {toast ? <ToastNotice toast={toast} onClose={() => setToast(null)} /> : null}
    </main>
  );
}

function OverviewPage({
  activation,
  dashboard,
  dauTrend,
  requestTrend,
  users,
}: {
  activation: Record<string, number>;
  dashboard: GrowthDashboardData;
  dauTrend: GrowthTrendPoint[];
  requestTrend: GrowthTrendPoint[];
  users: GrowthDashboardData["summary"]["users"];
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <Panel title="App Pulse" eyebrow={`${dashboard.period.days} day window`} icon={TrendingUp}>
        <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
          <div className="grid min-h-0 gap-3 lg:grid-cols-2">
            <ChartBlock
              title="Daily active users"
              value={formatNumber(users.active_7d)}
              data={dauTrend}
              color="#5068e7"
            />
            <ChartBlock
              title="Request volume"
              value={formatNumber(dashboard.activity?.total_requests ?? 0)}
              data={requestTrend}
              color="#209d13"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <TinyStat label="D1 retention" value={formatPercent(users.retention.d1?.rate ?? 0)} />
            <TinyStat label="D7 retention" value={formatPercent(users.retention.d7?.rate ?? 0)} />
            <TinyStat label="D30 retention" value={formatPercent(users.retention.d30?.rate ?? 0)} />
            <TinyStat label="Daily users" value={formatNumber(activation.daily_request_users ?? 0)} />
          </div>
        </div>
      </Panel>

      <div className="grid min-h-0 gap-3 lg:grid-cols-2 xl:grid-cols-1">
        <Panel title="Operator Queue" eyebrow="Highest priority" icon={Sparkles}>
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
        </Panel>
        <Panel title="Conversion Shape" eyebrow="Current funnel" icon={BarChart3}>
          <ScrollStack>
            <FunnelBars funnel={dashboard.funnel} />
          </ScrollStack>
        </Panel>
      </div>
    </div>
  );
}

function RetentionPage({
  dashboard,
  dauTrend,
  requestTrend,
}: {
  dashboard: GrowthDashboardData;
  dauTrend: GrowthTrendPoint[];
  requestTrend: GrowthTrendPoint[];
}) {
  const retention = dashboard.summary.users.retention;

  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel title="Retention Cohorts" eyebrow="Returned after signup" icon={HeartPulse}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <RetentionCard label="Day 1" cohort={retention.d1?.cohort ?? 0} retained={retention.d1?.retained ?? 0} rate={retention.d1?.rate ?? 0} />
            <RetentionCard label="Day 7" cohort={retention.d7?.cohort ?? 0} retained={retention.d7?.retained ?? 0} rate={retention.d7?.rate ?? 0} />
            <RetentionCard label="Day 30" cohort={retention.d30?.cohort ?? 0} retained={retention.d30?.retained ?? 0} rate={retention.d30?.rate ?? 0} />
          </div>
          <div className="min-h-0 rounded-lg border border-black/10 bg-white/70 p-3">
            <LineChart data={dauTrend} color="#5068e7" />
          </div>
        </div>
      </Panel>
      <Panel title="Activation Mix" eyebrow="Behavior loops" icon={Activity}>
        <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
          <BarSet
            items={[
              { label: "Check-ins", value: dashboard.summary.activation.check_ins ?? 0, color: "#5068e7" },
              { label: "Triggers", value: dashboard.summary.activation.triggers ?? 0, color: "#f45253" },
              { label: "Glimmers", value: dashboard.summary.activation.glimmers ?? 0, color: "#209d13" },
              { label: "Journals", value: dashboard.summary.activation.journals ?? 0, color: "#ea6fcf" },
            ]}
          />
          <ChartBlock
            title="Backend activity requests"
            value={formatNumber(dashboard.activity?.total_requests ?? 0)}
            data={requestTrend}
            color="#111111"
          />
        </div>
      </Panel>
    </div>
  );
}

function EventsPage({ dashboard }: { dashboard: GrowthDashboardData }) {
  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Panel title="Event Coverage" eyebrow="Expected client taxonomy" icon={ClipboardList}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <RingMeter value={dashboard.events.coverage.percent} />
            <div className="grid content-center gap-2">
              <TinyStat
                label="Tracked"
                value={`${dashboard.events.coverage.tracked}/${dashboard.events.coverage.expected}`}
              />
              <TinyStat label="Total events" value={formatNumber(dashboard.events.total)} />
              <TinyStat label="Known users" value={formatNumber(dashboard.events.unique_users)} />
            </div>
          </div>
          <ScrollStack>
            {dashboard.events.coverage.missing.map((event) => (
              <SignalRow key={event} title={event} detail="Missing in selected period" value="Needs release" tone="warn" />
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
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <Panel title="Top Events" eyebrow="Volume by event" icon={BarChart3}>
          <ScrollStack>
            <SignalList
              items={dashboard.events.top.map((event) => ({
                label: event.event_name,
                value: formatNumber(event.count),
              }))}
              empty="No first-party events received yet."
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
  );
}

function LifecyclePage({
  auditRunning,
  dashboard,
  onAudit,
  readiness,
}: {
  auditRunning: boolean;
  dashboard: GrowthDashboardData;
  onAudit: () => void;
  readiness: GrowthReadiness;
}) {
  const loopsReady = readiness.integrations.loops_api_key && readiness.integrations.loops_webhook_secret;
  const sendgridReady = readiness.integrations.sendgrid_api_key;

  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="Lifecycle Email" eyebrow="Loops and SendGrid" icon={Mail}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <TinyStat label="Total email" value={formatNumber(dashboard.emails.total)} />
            <TinyStat label="Growth sends" value={formatNumber(dashboard.emails.growth_total)} />
            <TinyStat label="Legacy sends" value={formatNumber(dashboard.emails.legacy_total)} />
            <TinyStat label="Failure rate" value={`${dashboard.emails.failure_rate}%`} />
          </div>
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
            <SignalList
              items={dashboard.emails.by_type.map((email) => ({
                label: `${email.email_type} / ${email.status}`,
                value: formatNumber(email.count),
              }))}
              empty="No lifecycle email rows found."
            />
          </ScrollStack>
        </div>
      </Panel>
      <Panel title="Automation Runs" eyebrow="Audit and recommendations" icon={RefreshCw}>
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <button
            type="button"
            onClick={onAudit}
            disabled={auditRunning}
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#292929] disabled:cursor-wait disabled:opacity-65"
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
  );
}

function ContentPage({
  content,
  contentTab,
  onContentTabChange,
}: {
  content?: GrowthContentInventory;
  contentTab: ContentKey;
  onContentTabChange: (key: ContentKey) => void;
}) {
  const counts = content?.counts ?? {};
  const recentRows = content?.recent?.[contentTab] ?? [];
  const surface = content?.api_surfaces?.find((item) => item.key === contentTab);

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <div className="flex gap-2 overflow-x-auto md:grid md:grid-cols-3 xl:grid-cols-6">
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

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={titleCase(contentTab)} eyebrow="Recent content" icon={BookOpen}>
          <ScrollStack>
            {recentRows.map((row, index) => (
              <ContentRow key={`${contentTab}-${row.id ?? index}`} row={row} />
            ))}
            {!recentRows.length ? (
              <QuietState
                icon={AlertTriangle}
                title="No recent rows"
                detail="This content type is not returning inventory rows yet."
                tone="warn"
              />
            ) : null}
          </ScrollStack>
        </Panel>
        <Panel title="API Surface" eyebrow="Backend route" icon={ShieldCheck}>
          <div className="grid content-start gap-3">
            <TinyStat label="Method" value={surface?.method ?? "Unknown"} />
            <div className="rounded-lg border border-black/10 bg-white/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">Path</p>
              <p className="mt-2 break-all font-mono text-sm text-black">
                {surface?.path ?? "Not mapped"}
              </p>
            </div>
            <div className="rounded-lg border border-[#dce4ff] bg-[#f4f6ff] p-3 text-sm leading-6 text-[#31449f]">
              Create/edit actions need an admin-auth bridge before this web console can safely write through the old mobile API routes.
            </div>
          </div>
        </Panel>
      </div>
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
        "grid min-h-20 w-44 shrink-0 gap-2 rounded-lg border p-3 text-left transition md:w-auto",
        active
          ? "border-black bg-white shadow-[0_12px_34px_rgba(0,0,0,0.08)]"
          : "border-black/10 bg-white/68 hover:border-black/32",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/52">
          {label}
        </span>
        <Icon aria-hidden="true" size={16} strokeWidth={1.9} className="text-[#5068e7]" />
      </div>
      <span className="text-2xl font-semibold tabular-nums text-black">{formatNumber(count)}</span>
    </button>
  );
}

function SystemPage({
  dashboard,
  readiness,
}: {
  dashboard: GrowthDashboardData;
  readiness: GrowthReadiness;
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Panel title="System Health" eyebrow="Vendor status" icon={ShieldCheck}>
        <ScrollStack>
          {dashboard.health.checks.map((check) => (
            <HealthCheckRow key={check.key} check={check} />
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
                />
              ))}
              {Object.entries(readiness.integrations).map(([key, value]) => (
                <SignalRow
                  key={`integration-${key}`}
                  title={labelize(key)}
                  detail="Integration"
                  value={value ? "Ready" : "Missing"}
                  tone={value ? "good" : "warn"}
                />
              ))}
            </div>
          </ScrollStack>
        </Panel>
        <Panel title="Endpoints" eyebrow="Connected APIs" icon={Send}>
          <ScrollStack>
            {Object.entries(readiness.endpoints ?? {}).map(([key, value]) => (
              <div key={key} className="grid gap-1 border-b border-black/10 py-2.5 last:border-0">
                <p className="text-sm font-semibold text-black">{labelize(key)}</p>
                <p className="truncate font-mono text-xs text-black/58">{value}</p>
              </div>
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
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-black/10 bg-white/[0.78] shadow-[0_16px_48px_rgba(0,0,0,0.055)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3 border-b border-black/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-black/50">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-black">{title}</h2>
        </div>
        <Icon aria-hidden="true" className="shrink-0 text-[#5068e7]" size={20} strokeWidth={1.9} />
      </div>
      <div className="min-h-0 p-3">{children}</div>
    </section>
  );
}

function ScrollStack({ children }: { children: React.ReactNode }) {
  return <div className="h-full min-h-0 overflow-y-auto pr-1">{children}</div>;
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
        "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
        active
          ? "bg-black text-white shadow-sm"
          : "text-black/62 hover:bg-black/[0.06] hover:text-black",
      ].join(" ")}
    >
      <Icon aria-hidden="true" size={15} strokeWidth={1.9} />
      {label}
    </button>
  );
}

function MetricTile({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: "black" | "blue" | "green" | "red" | "yellow";
  value: number | string;
}) {
  return (
    <div className="min-h-24 w-44 shrink-0 rounded-lg border border-black/10 bg-white/74 p-3 shadow-[0_10px_34px_rgba(0,0,0,0.04)] backdrop-blur-xl md:w-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-black/50">{label}</p>
        <span className={["grid size-8 place-items-center rounded-lg", toneClass(tone)].join(" ")}>
          <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-black">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="mt-0.5 truncate text-sm text-black/56">{detail}</p>
    </div>
  );
}

function ChartBlock({
  color,
  data,
  title,
  value,
}: {
  color: string;
  data: GrowthTrendPoint[];
  title: string;
  value: string;
}) {
  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-lg border border-black/10 bg-white/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/48">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-black">{value}</p>
        </div>
      </div>
      <div className="min-h-0">
        <LineChart data={data} color={color} />
      </div>
    </div>
  );
}

function LineChart({ color, data }: { color: string; data: GrowthTrendPoint[] }) {
  const points = useMemo(() => {
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

  if (!points.length) {
    return (
      <div className="grid h-full min-h-32 place-items-center text-sm font-medium text-black/48">
        No trend data
      </div>
    );
  }

  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,128 ${path} 320,128`;

  return (
    <svg viewBox="0 0 320 128" className="h-full min-h-32 w-full" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id={`chart-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#chart-${color.replace("#", "")})`} />
      <polyline points={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {points.slice(-1).map((point) => (
        <circle key={point.date} cx={point.x} cy={point.y} r="4" fill={color} />
      ))}
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

function BarSet({ items }: { items: Array<{ color: string; label: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid h-full min-h-56 items-end gap-3 rounded-lg border border-black/10 bg-white/70 p-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="grid h-full min-h-44 grid-rows-[minmax(0,1fr)_auto] gap-2">
          <div className="flex h-full items-end rounded-lg bg-black/[0.05] p-1.5">
            <div
              className="w-full rounded-md"
              style={{ height: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: item.color }}
            />
          </div>
          <div>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-black/48">{item.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-black">{formatNumber(item.value)}</p>
          </div>
        </div>
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
        <circle cx="60" cy="60" r={radius} stroke="rgba(0,0,0,0.09)" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={value >= 75 ? "#209d13" : value >= 40 ? "#f9bc2c" : "#f45253"}
          strokeWidth="10"
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
  rate,
  retained,
}: {
  cohort: number;
  label: string;
  rate: number;
  retained: number;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/72 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-black">{label}</p>
        <span className={["rounded-full px-2 py-1 text-xs font-semibold", rate >= 20 ? "bg-[#f3fbf1] text-[#176e0f]" : "bg-[#fff9e8] text-[#96690f]"].join(" ")}>
          {formatPercent(rate)}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-black">{formatNumber(retained)}</p>
      <p className="text-sm text-black/56">of {formatNumber(cohort)} users</p>
    </div>
  );
}

function SignalList({ empty, items }: { empty: string; items: Array<{ label: string; value: string }> }) {
  if (!items.length) {
    return <QuietState icon={AlertTriangle} title={empty} detail="Waiting for live data." tone="warn" />;
  }

  return (
    <div className="grid gap-1">
      {items.map((item) => (
        <SignalRow key={`${item.label}-${item.value}`} title={item.label} value={item.value} />
      ))}
    </div>
  );
}

function SignalRow({
  detail,
  title,
  tone = "neutral",
  value,
}: {
  detail?: string;
  title: string;
  tone?: "neutral" | "good" | "warn";
  value: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-black/10 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
        {detail ? <p className="truncate text-xs text-black/48">{detail}</p> : null}
      </div>
      <span className={["shrink-0 text-sm font-semibold tabular-nums", signalToneClass(tone)].join(" ")}>
        {value}
      </span>
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

function ContentRow({ row }: { row: GrowthContentRow }) {
  const title = row.title ?? row.content ?? row.jounral_name ?? `Item ${row.id ?? ""}`;
  const detail = row.subtitle ?? row.sub_title ?? row.artist ?? row.status ?? row.type ?? "Content row";

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-black/10 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
        <p className="truncate text-xs text-black/50">{detail}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-black/48">
        {row.updated_at ? formatDateTime(row.updated_at) : row.id ? `#${row.id}` : ""}
      </span>
    </div>
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
    <div className="rounded-lg border border-black/10 bg-white/70 p-3">
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

const chartColors = ["#5068e7", "#209d13", "#ea6fcf", "#f9bc2c", "#f45253", "#111111"];

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
