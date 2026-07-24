import Link from "next/link";
import { notFound } from "next/navigation";
import { readRunTranscript } from "@/lib/runs-fs";
import { prettyScenarioName } from "@/lib/format";
import RunViewer from "@/components/RunViewer";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const runId = decodeURIComponent(name);
  const data = readRunTranscript(runId);
  if (!data) return notFound();
  const { meta, parsed } = data;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-4">
      <header>
        <Link href="/" className="text-xs text-ink-400 hover:text-ink-200">← All scenarios</Link>
        <h1 className="text-xl font-semibold mt-1">{prettyScenarioName(meta.configName)}</h1>
        <p className="text-xs text-ink-400 mt-1">{runId}</p>
      </header>
      <RunViewer meta={meta} parsed={parsed} />
    </main>
  );
}
