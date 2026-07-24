import Link from "next/link";
import { notFound } from "next/navigation";
import { getScenario, type ScenarioSide } from "@/lib/scenarios";

export const dynamic = "force-dynamic";

function fmtNumber(n: number): string {
  return n.toLocaleString();
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtCost(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) return notFound();

  const workatoWins = (scenario.tokenDelta ?? 0) > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <header>
        <Link href="/" className="text-xs text-ink-400 hover:text-ink-200">← All scenarios</Link>
        <div className="text-[10px] uppercase tracking-wider text-ink-500 mt-3">Scenario {scenario.number}</div>
        <h1 className="text-2xl font-semibold mt-0.5">{scenario.title}</h1>
        <p className="text-sm text-ink-300 mt-2 max-w-3xl italic">&ldquo;{scenario.userMessage}&rdquo;</p>
      </header>

      {scenario.workato && scenario.vendor && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-4">
          <div className="text-xs uppercase tracking-wider text-emerald-300/80 mb-2">Headline</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Headline
              label="Tokens saved with Workato"
              primary={fmtNumber(Math.max(0, scenario.tokenDelta ?? 0))}
              secondary={scenario.tokenSavingsPct !== null ? `${fmtPct(scenario.tokenSavingsPct)} less than direct vendor MCPs` : ""}
              good={workatoWins}
            />
            <Headline
              label="Time saved"
              primary={fmtDuration(Math.max(0, scenario.durationDelta ?? 0))}
              secondary={scenario.speedupPct !== null ? `${fmtPct(scenario.speedupPct)} faster than direct vendor MCPs` : ""}
              good={(scenario.durationDelta ?? 0) > 0}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SideCard
          label="Workato MCP"
          badgeClass="bg-orange-500/20 text-orange-200 border-orange-500/40"
          accentBorder="border-orange-500/40"
          side={scenario.workato}
        />
        <SideCard
          label="Vendor MCP"
          badgeClass="bg-slate-500/20 text-slate-200 border-slate-500/40"
          accentBorder="border-slate-500/40"
          side={scenario.vendor}
        />
      </div>
    </main>
  );
}

function Headline({ label, primary, secondary, good }: { label: string; primary: string; secondary: string; good: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className={`text-3xl font-semibold tabular-nums mt-1 ${good ? "text-emerald-300" : "text-ink-300"}`}>{primary}</div>
      <div className={`text-xs mt-0.5 ${good ? "text-emerald-500" : "text-ink-500"}`}>{secondary}</div>
    </div>
  );
}

function SideCard({
  label,
  badgeClass,
  accentBorder,
  side,
}: {
  label: string;
  badgeClass: string;
  accentBorder: string;
  side: ScenarioSide | null;
}) {
  if (!side) {
    return (
      <div className={`rounded-lg border ${accentBorder} p-4 opacity-60`}>
        <Badge className={badgeClass}>{label}</Badge>
        <div className="text-sm text-ink-400 mt-3">No run recorded for this side.</div>
      </div>
    );
  }
  const t = side.run.totals;
  const servers = Object.entries(side.run.meta.allowedTools ?? {})
    .map(([srv, tools]) => `${srv} (${tools.length} tool${tools.length === 1 ? "" : "s"})`)
    .join(", ");
  return (
    <div className={`rounded-lg border ${accentBorder} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <Badge className={badgeClass}>{label}</Badge>
        <span className="text-[10px] uppercase tracking-wider text-ink-500">{side.run.meta.model}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Row label="Total tokens" value={fmtNumber(side.totalTokens)} bold />
        <Row label="Duration" value={fmtDuration(side.durationMs)} bold />
        <Row label="Input" value={fmtNumber(t.inputTokens)} />
        <Row label="Output" value={fmtNumber(t.outputTokens)} />
        <Row label="Cache read" value={fmtNumber(t.cacheReadTokens)} />
        <Row label="Cache write" value={fmtNumber(t.cacheCreationTokens)} />
        <Row label="API turns" value={String(t.numTurns)} />
        <Row label="Est. cost" value={fmtCost(side.run.estimatedCostUsd)} />
      </dl>

      <div className="text-[11px] text-ink-500 pt-1 border-t border-ink-800">
        Servers: {servers || "—"}
      </div>

      <Link
        href={`/runs/${encodeURIComponent(side.run.runId)}?scenario=${encodeURIComponent(side.run.meta.configName.match(/^scenario-(\d+)/)?.[1] ?? "")}`}
        className="inline-block text-xs text-emerald-400 hover:text-emerald-300 mt-1"
      >
        View full chat + per-turn tokens →
      </Link>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${className}`}>
      {children}
    </span>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <>
      <dt className="text-ink-500 text-xs">{label}</dt>
      <dd className={`text-right tabular-nums ${bold ? "text-ink-100 font-semibold" : "text-ink-300"}`}>{value}</dd>
    </>
  );
}
