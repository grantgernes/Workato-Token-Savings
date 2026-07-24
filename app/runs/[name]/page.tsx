import Link from "next/link";
import { notFound } from "next/navigation";
import { readRunTranscript } from "@/lib/runs-fs";
import { prettyScenarioName } from "@/lib/format";
import RunViewer from "@/components/RunViewer";

export const dynamic = "force-dynamic";

function parentScenarioId(configName: string): string | null {
  const m = configName.match(/^scenario-(\d+)[ab]-/);
  return m ? m[1] : null;
}

export default async function RunPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const runId = decodeURIComponent(name);
  const data = readRunTranscript(runId);
  if (!data) return notFound();
  const { meta, parsed } = data;
  const scenarioId = parentScenarioId(meta.configName);
  const side = /-workato-/.test(meta.configName) ? "Workato MCP" : /-vendor-/.test(meta.configName) ? "Vendor MCP" : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-4">
      <header>
        {scenarioId ? (
          <Link href={`/scenarios/${scenarioId}`} className="text-xs text-ink-400 hover:text-ink-200">
            ← Back to scenario comparison
          </Link>
        ) : (
          <Link href="/" className="text-xs text-ink-400 hover:text-ink-200">← Home</Link>
        )}
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-xl font-semibold">{prettyScenarioName(meta.configName)}</h1>
          {side && (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                side === "Workato MCP"
                  ? "bg-orange-500/20 text-orange-200 border-orange-500/40"
                  : "bg-slate-500/20 text-slate-200 border-slate-500/40"
              }`}
            >
              {side}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-400 mt-1">{runId}</p>
      </header>
      <RunViewer meta={meta} parsed={parsed} />
    </main>
  );
}
