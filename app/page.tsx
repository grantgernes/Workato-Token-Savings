import Link from "next/link";
import { listScenarios } from "@/lib/scenarios";

export const dynamic = "force-dynamic";

function fmtNumber(n: number): string {
  return n.toLocaleString();
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "" : "";
  return `${sign}${n.toFixed(0)}%`;
}

export default function Home() {
  const scenarios = listScenarios();
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Workato MCP vs Vendor MCP — Token Savings</h1>
        <p className="text-sm text-ink-400 mt-1 max-w-3xl">
          Nine identical asks, each run twice: once with a single Workato MCP tool, once
          against the direct vendor MCP servers. Numbers below are how many fewer tokens and
          how much faster Workato was. Click any scenario to compare the two runs side by side.
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

function ScenarioCard({ scenario }: { scenario: ReturnType<typeof listScenarios>[number] }) {
  const bothSides = scenario.workato && scenario.vendor;
  const tokenGood = (scenario.tokenDelta ?? 0) > 0;
  const timeGood = (scenario.durationDelta ?? 0) > 0;

  return (
    <Link
      href={`/scenarios/${scenario.id}`}
      className="block rounded-lg border border-ink-700 hover:border-emerald-600/60 hover:bg-ink-800/40 transition-colors p-4 space-y-3"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-500">Scenario {scenario.number}</div>
        <div className="font-semibold text-ink-100 mt-0.5">{scenario.title}</div>
        <p className="text-xs text-ink-400 mt-1 line-clamp-3">{scenario.userMessage}</p>
      </div>

      {bothSides ? (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink-800">
          <Stat
            label="Tokens saved"
            primary={fmtNumber(Math.max(0, scenario.tokenDelta ?? 0))}
            secondary={scenario.tokenSavingsPct !== null ? `${fmtPct(scenario.tokenSavingsPct)} less` : ""}
            good={tokenGood}
          />
          <Stat
            label="Time saved"
            primary={fmtDuration(Math.max(0, scenario.durationDelta ?? 0))}
            secondary={scenario.speedupPct !== null ? `${fmtPct(scenario.speedupPct)} faster` : ""}
            good={timeGood}
          />
        </div>
      ) : (
        <div className="pt-2 border-t border-ink-800 text-xs text-ink-500">
          Only {scenario.workato ? "Workato" : "vendor"} side recorded.
        </div>
      )}

      <div className="text-xs text-emerald-400 pt-1">Compare →</div>
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
      <div className={`text-lg font-semibold tabular-nums ${good ? "text-emerald-300" : "text-ink-300"}`}>{primary}</div>
      <div className={`text-[11px] ${good ? "text-emerald-500" : "text-ink-500"}`}>{secondary}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-ink-700 p-8 text-center text-sm text-ink-400">
      <p className="mb-2 text-ink-300">No scenarios found.</p>
      <p>
        Add paired runs to <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded">runs/</code> named
        <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded ml-1">scenario-Na-workato-*</code> and
        <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded ml-1">scenario-Nb-vendor-*</code>.
      </p>
    </div>
  );
}
