import Link from "next/link";
import { listScenarios } from "@/lib/scenarios";
import { EnterpriseCalc } from "./enterprise-calc";

export const dynamic = "force-dynamic";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString(); }
function fmtPct(n: number) { return `${Math.round(Math.abs(n))}%`; }
function fmtDur(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`; }

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab =
    tab === "scenarios" ? "scenarios" : tab === "enterprise" ? "enterprise" : "overview";
  const scenarios = listScenarios();

  const withBoth = scenarios.filter(
    (s) => s.workato && s.vendor && s.tokenSavingsPct !== null,
  );

  // aggregate stats from real run data
  const avgSavingsPct =
    withBoth.length > 0
      ? withBoth.reduce((sum, s) => sum + s.tokenSavingsPct!, 0) / withBoth.length
      : 0;

  const validSpeed = withBoth.filter((s) => s.speedupPct !== null);
  const avgSpeedPct =
    validSpeed.length > 0
      ? validSpeed.reduce((sum, s) => sum + s.speedupPct!, 0) / validSpeed.length
      : 0;

  const avgVendorTools =
    withBoth.length > 0
      ? withBoth.reduce((sum, s) => {
          return (
            sum +
            Object.values(s.vendor!.run.meta.allowedTools ?? {}).flat().length
          );
        }, 0) / withBoth.length
      : 5;

  const totalWorkatoCost = withBoth.reduce(
    (sum, s) => sum + s.workato!.run.estimatedCostUsd,
    0,
  );
  const totalVendorCost = withBoth.reduce(
    (sum, s) => sum + s.vendor!.run.estimatedCostUsd,
    0,
  );

  // extrapolate to 100K queries / month
  const SCALE = 100_000;
  const n = withBoth.length || 1;
  const monthlyVendorCost = (totalVendorCost / n) * SCALE;
  const monthlyWorkatoCost = (totalWorkatoCost / n) * SCALE;
  const monthlySavings = monthlyVendorCost - monthlyWorkatoCost;

  const savingsPcts = withBoth.map((s) => s.tokenSavingsPct!);
  const minSavingsPct = savingsPcts.length > 0 ? Math.min(...savingsPcts) : 40;
  const maxSavingsPct = savingsPcts.length > 0 ? Math.max(...savingsPcts) : 85;

  const hasData = withBoth.length > 0;

  return (
    <div className="min-h-screen">
      {/* ── Tab Nav ───────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-ink-800 bg-ink-900/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 flex items-center h-12 gap-1">
          <span className="text-sm font-bold text-orange-400 tracking-tight mr-6 flex-shrink-0">
            Workato MCP
          </span>
          <TabLink href="/?tab=overview" active={activeTab === "overview"}>
            Executive Overview
          </TabLink>
          <TabLink href="/?tab=scenarios" active={activeTab === "scenarios"}>
            9 Benchmark Scenarios
          </TabLink>
          <TabLink href="/?tab=enterprise" active={activeTab === "enterprise"}>
            ROI Calculator
          </TabLink>
        </div>
      </nav>

      {activeTab === "overview" && (
        <OverviewTab
          scenarios={withBoth}
          hasData={hasData}
          avgSavingsPct={avgSavingsPct}
          avgSpeedPct={avgSpeedPct}
          avgVendorTools={avgVendorTools}
          monthlyVendorCost={monthlyVendorCost}
          monthlyWorkatoCost={monthlyWorkatoCost}
          monthlySavings={monthlySavings}
          scenarioCount={withBoth.length}
        />
      )}
      {activeTab === "scenarios" && <ScenariosTab scenarios={scenarios} />}
      {activeTab === "enterprise" && (
        <EnterpriseTab
          minPct={minSavingsPct}
          avgPct={avgSavingsPct}
          maxPct={maxSavingsPct}
          hasRealData={hasData}
        />
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`text-sm px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-orange-500 text-orange-400 font-medium"
          : "border-transparent text-ink-400 hover:text-ink-200"
      }`}
    >
      {children}
    </Link>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  scenarios,
  hasData,
  avgSavingsPct,
  avgSpeedPct,
  avgVendorTools,
  monthlyVendorCost,
  monthlyWorkatoCost,
  monthlySavings,
  scenarioCount,
}: {
  scenarios: ReturnType<typeof listScenarios>;
  hasData: boolean;
  avgSavingsPct: number;
  avgSpeedPct: number;
  avgVendorTools: number;
  monthlyVendorCost: number;
  monthlyWorkatoCost: number;
  monthlySavings: number;
  scenarioCount: number;
}) {
  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-ink-800 bg-gradient-to-br from-ink-900 via-ink-900 to-orange-950/25 py-20 px-6">
        {/* subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-medium mb-6 uppercase tracking-widest">
            Measured · Not Estimated
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-ink-50 leading-[1.1] max-w-3xl">
            AI Agents That Deliver More
            <br />
            <span className="text-orange-400">With Dramatically Less.</span>
          </h1>

          <p className="mt-5 text-lg text-ink-300 max-w-2xl leading-relaxed">
            Every AI agent query has a token cost. When agents connect directly to
            vendor tools, that cost is inflated — multiple API calls, verbose JSON,
            and unnecessary context. Workato MCP eliminates the waste.
          </p>

          {hasData && (
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
              <HeroStat
                value={`${fmtPct(avgSavingsPct)}`}
                label="Fewer tokens"
                sub="vs. direct vendor MCP"
                color="emerald"
              />
              <HeroStat
                value={`${Math.round(avgVendorTools)}→1`}
                label="Tool calls"
                sub="one Workato call replaces many"
                color="orange"
              />
              <HeroStat
                value={`${fmtPct(avgSpeedPct)}`}
                label="Faster responses"
                sub="fewer round-trips = less latency"
                color="emerald"
              />
            </div>
          )}

          {hasData && (
            <p className="mt-4 text-[11px] text-ink-600">
              Measured across {scenarioCount} enterprise use cases · claude-sonnet-4-6 · same prompt, same data, two approaches
            </p>
          )}
        </div>
      </section>

      {/* ── The Problem ───────────────────────────────────────────────────── */}
      <section className="border-b border-ink-800 py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <div className="text-[10px] uppercase tracking-widest text-ink-600 mb-2">The Challenge</div>
            <h2 className="text-2xl font-bold text-ink-100">
              Direct Vendor MCP Creates a "Context Bloat" Problem
            </h2>
            <p className="mt-3 text-ink-400 max-w-2xl leading-relaxed">
              When AI agents call vendor tools individually — Salesforce, NetSuite, HubSpot, Snowflake — each
              call returns a full API response. The model receives raw JSON with dozens of fields it will
              never use, and must make sense of it all before it can answer. You pay for every token of that
              overhead.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Vendor */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Direct Vendor MCP
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-5 text-slate-500">
                <FlowChip dim>AI query</FlowChip>
                <Arrow />
                <FlowChip dim>SF</FlowChip>
                <Arrow />
                <FlowChip dim>NS</FlowChip>
                <Arrow />
                <FlowChip dim>Snow</FlowChip>
                <Arrow />
                <FlowChip dim>HubSpot</FlowChip>
                <Arrow />
                <FlowChip dim>Zendesk…</FlowChip>
                <div className="w-full pt-1 text-slate-600">← JSON blobs ×N → model must synthesize</div>
              </div>

              <ul className="space-y-2.5">
                {[
                  `${Math.round(avgVendorTools)} separate vendor API calls per query`,
                  "Full JSON responses — hundreds of unused fields billed as input tokens",
                  "Model spends tokens piecing together context it shouldn't have to manage",
                  "Each round-trip adds latency, compounding across multi-step workflows",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-400">
                    <span className="text-slate-600 flex-shrink-0 mt-0.5">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Workato */}
            <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">
                  Workato MCP
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-5 text-ink-400">
                <FlowChip accent>AI query</FlowChip>
                <Arrow accent />
                <FlowChip accent>Workato MCP</FlowChip>
                <Arrow accent />
                <FlowChip accent>Answer ✓</FlowChip>
                <div className="w-full pt-1 text-orange-400/50 text-[10px]">
                  ↑ joins SF + NS + Snowflake + HubSpot + Zendesk internally · returns only what matters
                </div>
              </div>

              <ul className="space-y-2.5">
                {[
                  "1 optimized tool call — regardless of how many systems are involved",
                  "Pre-joined, pre-filtered output in compact format (only task-relevant fields)",
                  "Workato handles cross-system resolution so the model doesn't have to",
                  "Consistent latency and predictable token usage at any scale",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-300">
                    <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9 Use Cases ───────────────────────────────────────────────────── */}
      {hasData && (
        <section className="border-b border-ink-800 py-16 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-ink-600 mb-2">Benchmarked</div>
                <h2 className="text-2xl font-bold text-ink-100">
                  {scenarioCount} Enterprise Use Cases. Real Numbers.
                </h2>
                <p className="mt-2 text-ink-400 max-w-xl">
                  Identical prompts. Identical data. Two approaches. Every result is a live Claude API measurement — not a projection.
                </p>
              </div>
              <Link
                href="/?tab=scenarios"
                className="text-sm text-orange-400 hover:text-orange-300 whitespace-nowrap"
              >
                Explore all →
              </Link>
            </div>

            <div className="space-y-1.5">
              {scenarios.map((s) => (
                <ScenarioRow key={s.id} scenario={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Scale Math ────────────────────────────────────────────────────── */}
      {hasData && (
        <section className="border-b border-ink-800 py-16 px-6 bg-ink-900/60">
          <div className="mx-auto max-w-5xl">
            <div className="text-[10px] uppercase tracking-widest text-ink-600 mb-2">Business Case</div>
            <h2 className="text-2xl font-bold text-ink-100 mb-2">
              Token Savings at Enterprise Scale
            </h2>
            <p className="text-ink-400 max-w-2xl mb-10">
              Small per-query savings multiply quickly. Based on measured token costs across
              these {scenarioCount} use cases, extrapolated to 100,000 AI agent queries per month:
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <ScaleCard
                label="Direct Vendor MCP"
                value={`$${monthlyVendorCost < 10 ? monthlyVendorCost.toFixed(2) : Math.round(monthlyVendorCost).toLocaleString()}/mo`}
                sub="at 100K queries/month"
                variant="dim"
              />
              <ScaleCard
                label="Workato MCP"
                value={`$${monthlyWorkatoCost < 10 ? monthlyWorkatoCost.toFixed(2) : Math.round(monthlyWorkatoCost).toLocaleString()}/mo`}
                sub="at 100K queries/month"
                variant="orange"
              />
              <ScaleCard
                label="Monthly Savings"
                value={`$${monthlySavings < 10 ? monthlySavings.toFixed(2) : Math.round(monthlySavings).toLocaleString()}/mo`}
                sub={`≈ $${(monthlySavings * 12 < 10 ? (monthlySavings * 12).toFixed(2) : Math.round(monthlySavings * 12).toLocaleString())}/year`}
                variant="emerald"
              />
            </div>

            <p className="text-[11px] text-ink-700">
              Based on claude-sonnet-4-6 pricing applied to measured token counts.
              Actual savings scale with query volume, model choice, and workflow complexity.
              Higher-complexity workflows involving more systems show proportionally larger savings.
            </p>
          </div>
        </section>
      )}

      {/* ── Why It Matters ────────────────────────────────────────────────── */}
      <section className="border-b border-ink-800 py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-[10px] uppercase tracking-widest text-ink-600 mb-2">
            Strategic Impact
          </div>
          <h2 className="text-2xl font-bold text-ink-100 mb-2">
            Why Token Efficiency Is a Strategic Advantage
          </h2>
          <p className="text-ink-400 max-w-2xl mb-10">
            As AI agents move from pilot to production, token efficiency stops being a technical
            detail and becomes a business imperative.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            <BenefitCard
              icon="💰"
              title="Predictable AI Costs"
              body="Vendor MCP makes token usage unpredictable — each query's cost depends on how much JSON the model happens to receive. Workato's pre-optimized tools create consistent, forecastable cost per workflow, enabling real AI budget management."
            />
            <BenefitCard
              icon="⚡"
              title="Faster Agent Cycles"
              body="In multi-step agentic workflows, latency compounds with every round-trip. Workato reduces the number of vendor calls from many to one per task — cutting response time and enabling tighter feedback loops in your automation."
            />
            <BenefitCard
              icon="🎯"
              title="Higher Answer Quality"
              body="Context bloat doesn't just cost money — it degrades accuracy. When a model receives thousands of tokens of irrelevant JSON, it loses focus. Pre-filtered context produces sharper, more consistent answers with fewer hallucinations."
            />
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-950/30 via-ink-900 to-ink-900 p-12 relative overflow-hidden">
            {/* decorative */}
            <div className="pointer-events-none absolute -right-8 -top-8 w-48 h-48 rounded-full bg-orange-500/5 blur-2xl" />

            <div className="relative max-w-2xl">
              <div className="text-[10px] uppercase tracking-widest text-orange-500/70 mb-3">
                Next Steps
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink-50 mb-3">
                Run This Benchmark Against Your Workflows
              </h2>
              <p className="text-ink-400 mb-8 leading-relaxed">
                These 9 scenarios are a starting point. The real savings are in your
                highest-frequency, highest-complexity workflows — the ones where agents
                are calling 5+ systems today. That&apos;s where Workato&apos;s efficiency compounds most.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                {[
                  { n: "1", label: "Identify your top AI agent use cases" },
                  { n: "2", label: "Map which vendor systems each one touches" },
                  { n: "3", label: "Benchmark token cost with and without Workato" },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[11px] font-bold flex items-center justify-center mt-0.5">
                      {step.n}
                    </div>
                    <span className="text-sm text-ink-400 max-w-[160px]">{step.label}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/?tab=scenarios"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors"
              >
                See All 9 Benchmarks →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Enterprise tab ───────────────────────────────────────────────────────────

function EnterpriseTab({
  minPct,
  avgPct,
  maxPct,
  hasRealData,
}: {
  minPct: number;
  avgPct: number;
  maxPct: number;
  hasRealData: boolean;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10">
        <div className="text-[10px] uppercase tracking-widest text-ink-600 mb-2">ROI Estimator</div>
        <h1 className="text-2xl font-semibold text-ink-100">
          What does this mean for your organization?
        </h1>
        <p className="text-sm text-ink-400 mt-2 max-w-2xl leading-relaxed">
          Adjust the inputs to reflect your organization. Token savings range is anchored to{" "}
          {hasRealData
            ? "measured results from the 9 benchmark scenarios."
            : "estimated benchmarks — run the scenarios to replace with live data."}
        </p>
      </header>
      <EnterpriseCalc
        minPct={minPct}
        avgPct={avgPct}
        maxPct={maxPct}
        hasRealData={hasRealData}
      />
    </main>
  );
}

// ─── Scenarios tab ────────────────────────────────────────────────────────────

function ScenariosTab({
  scenarios,
}: {
  scenarios: ReturnType<typeof listScenarios>;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Workato MCP vs. Vendor MCP — 9 Scenarios</h1>
        <p className="text-sm text-ink-400 mt-1 max-w-3xl">
          Nine identical asks, each run twice: once with a single Workato MCP tool, once against the
          direct vendor MCP servers. Numbers below show how many fewer tokens and how much faster
          Workato was. Click any scenario to compare the two runs side by side.
        </p>
      </header>

      {scenarios.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => (
            <ScenarioCard key={s.id} scenario={s} />
          ))}
        </div>
      )}
    </main>
  );
}

// ─── small components ─────────────────────────────────────────────────────────

function HeroStat({
  value,
  label,
  sub,
  color,
}: {
  value: string;
  label: string;
  sub: string;
  color: "emerald" | "orange";
}) {
  const valueClass =
    color === "emerald" ? "text-emerald-300" : "text-orange-300";
  return (
    <div className="rounded-xl bg-ink-800/50 border border-ink-700 p-4">
      <div className={`text-3xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <div className="text-sm font-medium text-ink-200 mt-1">{label}</div>
      <div className="text-[11px] text-ink-500 mt-0.5">{sub}</div>
    </div>
  );
}

function FlowChip({
  children,
  dim,
  accent,
}: {
  children: React.ReactNode;
  dim?: boolean;
  accent?: boolean;
}) {
  const cls = accent
    ? "px-2 py-0.5 rounded bg-orange-900/50 border border-orange-500/30 text-orange-300"
    : "px-2 py-0.5 rounded bg-slate-800/80 text-slate-500";
  return <span className={cls}>{children}</span>;
}

function Arrow({ accent }: { accent?: boolean }) {
  return (
    <span className={accent ? "text-orange-600" : "text-slate-700"}>→</span>
  );
}

function ScenarioRow({
  scenario,
}: {
  scenario: ReturnType<typeof listScenarios>[number];
}) {
  const pct = scenario.tokenSavingsPct ?? 0;
  const bar = Math.min(100, Math.max(0, pct));

  return (
    <Link
      href={`/scenarios/${scenario.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-lg border border-ink-800/80 hover:border-orange-500/40 hover:bg-ink-800/30 transition-colors group"
    >
      <span className="text-[11px] text-ink-700 w-5 text-right font-mono flex-shrink-0">
        {scenario.number}
      </span>
      <span className="flex-1 text-sm text-ink-300 group-hover:text-ink-100 transition-colors min-w-0 truncate">
        {scenario.title}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-28 h-1.5 bg-ink-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${bar}%` }}
          />
        </div>
        <span className="text-[11px] text-emerald-400 tabular-nums w-14 text-right">
          {fmtPct(pct)} less
        </span>
      </div>
      <span className="text-xs text-ink-700 group-hover:text-orange-400 transition-colors flex-shrink-0">
        →
      </span>
    </Link>
  );
}

function ScaleCard({
  label,
  value,
  sub,
  variant,
}: {
  label: string;
  value: string;
  sub: string;
  variant: "dim" | "orange" | "emerald";
}) {
  const styles = {
    dim: {
      wrap: "border-ink-700 bg-ink-800/40",
      label: "text-ink-500",
      value: "text-ink-300",
    },
    orange: {
      wrap: "border-orange-500/30 bg-orange-950/20",
      label: "text-orange-400",
      value: "text-orange-300",
    },
    emerald: {
      wrap: "border-emerald-500/40 bg-emerald-900/20",
      label: "text-emerald-400",
      value: "text-emerald-300",
    },
  }[variant];

  return (
    <div className={`rounded-xl border p-6 text-center ${styles.wrap}`}>
      <div className={`text-[10px] uppercase tracking-widest mb-2 ${styles.label}`}>
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${styles.value}`}>{value}</div>
      <div className="text-[11px] text-ink-600 mt-1">{sub}</div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-ink-800 p-6">
      <div className="text-2xl mb-4">{icon}</div>
      <div className="font-semibold text-ink-100 mb-2">{title}</div>
      <p className="text-sm text-ink-400 leading-relaxed">{body}</p>
    </div>
  );
}

// ─── scenarios tab components ─────────────────────────────────────────────────

function ScenarioCard({
  scenario,
}: {
  scenario: ReturnType<typeof listScenarios>[number];
}) {
  const bothSides = scenario.workato && scenario.vendor;
  const tokenGood = (scenario.tokenDelta ?? 0) > 0;
  const timeGood = (scenario.durationDelta ?? 0) > 0;

  return (
    <Link
      href={`/scenarios/${scenario.id}`}
      className="block rounded-lg border border-ink-700 hover:border-orange-500/60 hover:bg-ink-800/40 transition-colors p-4 space-y-3"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-500">
          Scenario {scenario.number}
        </div>
        <div className="font-semibold text-ink-100 mt-0.5">{scenario.title}</div>
        <p className="text-xs text-ink-400 mt-1 line-clamp-3">{scenario.userMessage}</p>
      </div>

      {bothSides ? (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink-800">
          <Stat
            label="Tokens saved"
            primary={
              scenario.tokenSavingsPct !== null
                ? `${fmtPct(scenario.tokenSavingsPct)} less`
                : "—"
            }
            secondary={`${fmt(Math.max(0, scenario.tokenDelta ?? 0))} tokens`}
            good={tokenGood}
          />
          <Stat
            label="Time saved"
            primary={
              scenario.speedupPct !== null
                ? `${fmtPct(scenario.speedupPct)} faster`
                : "—"
            }
            secondary={fmtDur(Math.max(0, scenario.durationDelta ?? 0))}
            good={timeGood}
          />
        </div>
      ) : (
        <div className="pt-2 border-t border-ink-800 text-xs text-ink-500">
          Only {scenario.workato ? "Workato" : "vendor"} side recorded.
        </div>
      )}

      <div className="text-xs text-orange-400 pt-1">Compare →</div>
    </Link>
  );
}

function Stat({
  label,
  primary,
  secondary,
  good,
}: {
  label: string;
  primary: string;
  secondary: string;
  good: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div
        className={`text-2xl font-bold tabular-nums ${good ? "text-emerald-300" : "text-ink-300"}`}
      >
        {primary}
      </div>
      <div className={`text-xs mt-0.5 ${good ? "text-emerald-600" : "text-ink-500"}`}>
        {secondary}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-ink-700 p-8 text-center text-sm text-ink-400">
      <p className="mb-2 text-ink-300">No scenarios found.</p>
      <p>
        Add paired runs to{" "}
        <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded">runs/</code> named{" "}
        <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded ml-1">
          scenario-Na-workato-*
        </code>{" "}
        and{" "}
        <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded ml-1">
          scenario-Nb-vendor-*
        </code>
        .
      </p>
    </div>
  );
}
