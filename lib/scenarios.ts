import { listRuns, type RunSummary } from "./runs-fs";

export interface ScenarioSide {
  run: RunSummary;
  totalTokens: number;
  durationMs: number;
}

export interface Scenario {
  id: string;
  number: number;
  title: string;
  userMessage: string;
  workato: ScenarioSide | null;
  vendor: ScenarioSide | null;
  tokenDelta: number | null;
  durationDelta: number | null;
  tokenSavingsPct: number | null;
  speedupPct: number | null;
}

const TITLES: Record<string, string> = {
  sf: "Salesforce Account Lookup",
  cross: "Cross-System Account Health",
  ns: "NetSuite Close-of-Books Prep",
  support: "Support Escalation Trail",
  handoff: "Marketing-to-Sales Handoff",
  "deal-to-cash": "Deal-to-Cash",
  signals: "Account Risk Signals",
  standup: "Sprint Standup Prep",
  "health-full": "Full Customer Health",
};

const CONFIG_RE = /^scenario-(\d+)([ab])-(workato|vendor)-(.+)$/;

function totalTokensOf(r: RunSummary): number {
  const t = r.totals;
  return t.inputTokens + t.outputTokens + t.cacheCreationTokens + t.cacheReadTokens;
}

function sideOf(r: RunSummary): ScenarioSide {
  return { run: r, totalTokens: totalTokensOf(r), durationMs: r.totals.durationMs };
}

export function listScenarios(): Scenario[] {
  const runs = listRuns();
  const buckets = new Map<string, { number: number; topic: string; workato?: RunSummary; vendor?: RunSummary; userMessage: string }>();

  for (const r of runs) {
    const m = r.meta.configName.match(CONFIG_RE);
    if (!m) continue;
    const num = Number(m[1]);
    const side = m[3] as "workato" | "vendor";
    const topic = m[4];
    const id = String(num);
    const existing = buckets.get(id) ?? { number: num, topic, userMessage: r.meta.userMessage };
    existing[side] = r;
    existing.userMessage = existing.userMessage || r.meta.userMessage;
    buckets.set(id, existing);
  }

  const scenarios: Scenario[] = [];
  for (const [id, b] of buckets) {
    const workato = b.workato ? sideOf(b.workato) : null;
    const vendor = b.vendor ? sideOf(b.vendor) : null;
    const tokenDelta = workato && vendor ? vendor.totalTokens - workato.totalTokens : null;
    const durationDelta = workato && vendor ? vendor.durationMs - workato.durationMs : null;
    const tokenSavingsPct =
      workato && vendor && vendor.totalTokens > 0
        ? ((vendor.totalTokens - workato.totalTokens) / vendor.totalTokens) * 100
        : null;
    const speedupPct =
      workato && vendor && vendor.durationMs > 0
        ? ((vendor.durationMs - workato.durationMs) / vendor.durationMs) * 100
        : null;
    scenarios.push({
      id,
      number: b.number,
      title: TITLES[b.topic] ?? b.topic,
      userMessage: b.userMessage,
      workato,
      vendor,
      tokenDelta,
      durationDelta,
      tokenSavingsPct,
      speedupPct,
    });
  }
  scenarios.sort((a, b) => a.number - b.number);
  return scenarios;
}

export function getScenario(id: string): Scenario | null {
  return listScenarios().find((s) => s.id === id) ?? null;
}
