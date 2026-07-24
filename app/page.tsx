import Link from "next/link";
import { listRuns } from "@/lib/runs-fs";
import { prettyScenarioName } from "@/lib/format";

export const dynamic = "force-dynamic";

function fmtNumber(n: number): string {
  return n.toLocaleString();
}

function fmtCost(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function Home() {
  const runs = listRuns();
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">MCP Token Lab</h1>
          <p className="text-sm text-ink-400 mt-1">
            Per-turn token usage across MCP server + skill configurations. Click any scenario to
            see the full chat, tool calls, and per-turn token breakdown.
          </p>
        </div>
        <div className="text-xs text-ink-400">{runs.length} run{runs.length === 1 ? "" : "s"}</div>
      </header>

      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-lg border border-ink-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/60 text-ink-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2">When</th>
                <th className="text-left px-4 py-2">Scenario</th>
                <th className="text-left px-4 py-2">Servers · tools</th>
                <th className="text-right px-4 py-2">Turns</th>
                <th className="text-right px-4 py-2">Input</th>
                <th className="text-right px-4 py-2">Output</th>
                <th className="text-right px-4 py-2">Cache R/W</th>
                <th className="text-right px-4 py-2">Cost</th>
                <th className="text-right px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.runId}
                  className="border-t border-ink-700 hover:bg-ink-800/40 transition-colors"
                >
                  <td className="px-4 py-2 text-ink-300">{fmtTime(r.fileMtime)}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/runs/${encodeURIComponent(r.runId)}`}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {prettyScenarioName(r.meta.configName)}
                    </Link>
                    {r.isError && (
                      <span className="ml-2 text-xs text-red-400 uppercase tracking-wider">error</span>
                    )}
                    {r.meta.promptFile && (
                      <div className="text-[10px] text-ink-500 mt-0.5">skill: {r.meta.promptFile.replace(/^prompts\//, "")}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-300 text-xs">
                    {Object.entries(r.meta.allowedTools ?? {})
                      .map(([srv, tools]) => `${srv}(${tools.length})`)
                      .join(" + ") || "—"}
                  </td>
                  <td className="px-4 py-2 text-right">{r.turnCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(r.totals.inputTokens)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtNumber(r.totals.outputTokens)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs text-ink-400">
                    {fmtNumber(r.totals.cacheReadTokens)} / {fmtNumber(r.totals.cacheCreationTokens)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtCost(r.estimatedCostUsd)}</td>
                  <td className="px-4 py-2 text-right text-ink-400 text-xs">{fmtDuration(r.totals.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-ink-700 p-8 text-center text-sm text-ink-400">
      <p className="mb-2 text-ink-300">No runs yet.</p>
      <p>
        Add <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded">runs/&lt;runId&gt;.meta.json</code> and <code className="text-ink-200 bg-ink-800 px-2 py-1 rounded">runs/&lt;runId&gt;.jsonl</code> to populate the list.
      </p>
    </div>
  );
}
