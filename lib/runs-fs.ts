import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseTranscript, priceOf, type ParsedTranscript } from "./parse-transcript";

export interface RunMeta {
  runId: string;
  configName: string;
  configFile?: string;
  promptFile?: string | null;
  userMessage: string;
  allowedTools: Record<string, string[]>;
  model: string;
  startedAt: string;
  transcript: string;
}

export interface RunSummary {
  runId: string;
  meta: RunMeta;
  totals: ParsedTranscript["totals"];
  isError: boolean;
  turnCount: number;
  estimatedCostUsd: number;
  fileMtime: string;
}

const RUNS_DIR = "runs";

export function listRuns(): RunSummary[] {
  const dir = join(process.cwd(), RUNS_DIR);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".meta.json"));
  const summaries: RunSummary[] = [];
  for (const f of files) {
    const runId = f.replace(/\.meta\.json$/, "");
    try {
      const summary = summarizeRun(runId);
      if (summary) summaries.push(summary);
    } catch {
      // skip malformed
    }
  }
  summaries.sort((a, b) => (a.runId < b.runId ? 1 : -1));
  return summaries;
}

export function summarizeRun(runId: string): RunSummary | null {
  const dir = join(process.cwd(), RUNS_DIR);
  const metaPath = join(dir, `${runId}.meta.json`);
  const transcriptPath = join(dir, `${runId}.jsonl`);
  if (!existsSync(metaPath)) return null;
  const meta: RunMeta = JSON.parse(readFileSync(metaPath, "utf8"));
  let parsed: ParsedTranscript | null = null;
  if (existsSync(transcriptPath)) {
    parsed = parseTranscript(readFileSync(transcriptPath, "utf8"));
  }
  const totals = parsed?.totals ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalCostUsd: 0,
    durationMs: 0,
    numTurns: 0,
  };
  const estimatedCostUsd = totals.totalCostUsd || priceOf(meta.model, totals);
  const mtime = existsSync(transcriptPath)
    ? statSync(transcriptPath).mtime.toISOString()
    : statSync(metaPath).mtime.toISOString();
  return {
    runId,
    meta,
    totals,
    isError: parsed?.isError ?? false,
    turnCount: parsed?.turns.length ?? 0,
    estimatedCostUsd,
    fileMtime: mtime,
  };
}

export function readRunTranscript(runId: string): { meta: RunMeta; parsed: ParsedTranscript } | null {
  const dir = join(process.cwd(), RUNS_DIR);
  const metaPath = join(dir, `${runId}.meta.json`);
  const transcriptPath = join(dir, `${runId}.jsonl`);
  if (!existsSync(metaPath) || !existsSync(transcriptPath)) return null;
  const meta: RunMeta = JSON.parse(readFileSync(metaPath, "utf8"));
  const parsed = parseTranscript(readFileSync(transcriptPath, "utf8"));
  return { meta, parsed };
}
