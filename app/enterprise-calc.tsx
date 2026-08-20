"use client";

import { useState } from "react";

const DEFAULT_FIRST_MSG_TOKENS = 10_000;
const DEFAULT_FOLLOWUP_TOKENS = 2_500;
// claude-sonnet-4-6: ~85% input @ $3/MTok + ~15% output @ $15/MTok ≈ $4.80/MTok
const COST_PER_TOKEN = 5 / 1_000_000;

function commas(n: number) {
  return Math.round(n).toLocaleString();
}

function costFmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `$${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function EnterpriseCalc({
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
  const [employees, setEmployees] = useState(500);
  const [convsPerMonth, setConvsPerMonth] = useState(50);
  const [messages, setMessages] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [firstMsgTokens, setFirstMsgTokens] = useState(DEFAULT_FIRST_MSG_TOKENS);
  const [followupTokens, setFollowupTokens] = useState(DEFAULT_FOLLOWUP_TOKENS);

  const tokensPerConv = firstMsgTokens + Math.max(0, messages - 1) * followupTokens;
  const totalConvs = employees * convsPerMonth;
  const totalTokensVendor = totalConvs * tokensPerConv;

  const savingsMinTokens = totalTokensVendor * (minPct / 100);
  const savingsAvgTokens = totalTokensVendor * (avgPct / 100);
  const savingsMaxTokens = totalTokensVendor * (maxPct / 100);

  const costMin = savingsMinTokens * COST_PER_TOKEN;
  const costAvg = savingsAvgTokens * COST_PER_TOKEN;
  const costMax = savingsMaxTokens * COST_PER_TOKEN;

  return (
    <div className="space-y-8">
      {/* ── Sliders ── */}
      <div className="grid md:grid-cols-3 gap-4">
        <SliderCard
          label="Employees using AI agents"
          value={employees}
          min={10}
          max={5000}
          step={10}
          onChange={setEmployees}
        />
        <SliderCard
          label="AI conversations / employee / month"
          value={convsPerMonth}
          min={5}
          max={500}
          step={5}
          onChange={setConvsPerMonth}
        />
        <SliderCard
          label="Messages per conversation"
          value={messages}
          min={1}
          max={20}
          step={1}
          onChange={setMessages}
        />
      </div>

      {/* ── Token model note + advanced toggle ── */}
      <div className="rounded-lg border border-ink-800 bg-ink-800/20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs px-4 py-2.5">
          <span className="text-ink-600">Token model:</span>
          <span className="text-ink-500">1st msg = {commas(firstMsgTokens)} tokens</span>
          <span className="text-ink-700">·</span>
          <span className="text-ink-500">follow-ups = {commas(followupTokens)} tokens</span>
          <span className="text-ink-700">·</span>
          <span className="text-ink-300 font-medium">{commas(tokensPerConv)} tokens / conversation</span>
          <span className="text-ink-700">·</span>
          <span className="text-ink-500">{commas(totalConvs)} conversations / month</span>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="ml-auto text-[11px] text-ink-600 hover:text-ink-400 transition-colors"
          >
            {showAdvanced ? "Hide advanced" : "Show advanced settings"}
          </button>
        </div>

        {showAdvanced && (
          <div className="border-t border-ink-800 px-4 py-4 grid sm:grid-cols-2 gap-4">
            <NumberInput
              label="Tokens — first message (tool call)"
              value={firstMsgTokens}
              min={1000}
              max={100_000}
              step={500}
              onChange={setFirstMsgTokens}
            />
            <NumberInput
              label="Tokens — follow-up messages"
              value={followupTokens}
              min={500}
              max={20_000}
              step={250}
              onChange={setFollowupTokens}
            />
          </div>
        )}
      </div>

      {!hasRealData && (
        <div className="text-xs text-amber-400/80 bg-amber-900/10 border border-amber-700/30 rounded-lg px-4 py-2.5">
          Using estimated savings range ({Math.round(minPct)}%–{Math.round(maxPct)}%). Run the 9 benchmark scenarios to replace with live measurements.
        </div>
      )}

      {/* ── Results ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard
          label="Vendor tokens / month"
          value={commas(totalTokensVendor)}
          sub={`${commas(totalConvs)} conversations · ${commas(tokensPerConv)} tokens each`}
          variant="dim"
        />
        <ResultCard
          label="Token savings / month"
          value={`${commas(savingsMinTokens)} – ${commas(savingsMaxTokens)}`}
          sub={`${Math.round(minPct)}%–${Math.round(maxPct)}% reduction · avg ${commas(savingsAvgTokens)}`}
          variant="emerald"
        />
        <ResultCard
          label="Cost savings / month"
          value={`${costFmt(costMin)} – ${costFmt(costMax)}`}
          sub={`avg ${costFmt(costAvg)} · claude-sonnet-4-6 blended rate`}
          variant="orange"
        />
        <ResultCard
          label="Cost savings / year"
          value={`${costFmt(costMin * 12)} – ${costFmt(costMax * 12)}`}
          sub={`avg ${costFmt(costAvg * 12)} annually`}
          variant="orange"
        />
      </div>

      <p className="text-[11px] text-ink-700 leading-relaxed">
        {hasRealData
          ? `Savings range (${Math.round(minPct)}%–${Math.round(maxPct)}%) is measured across 9 enterprise benchmark scenarios using claude-sonnet-4-6.`
          : `Savings range is estimated — run benchmarks to replace with measured data.`}{" "}
        Cost estimate uses a $5/MTok blended rate. Token model assumes the first message in each conversation triggers a tool call (~{commas(firstMsgTokens)} tokens); subsequent messages are conversational (~{commas(followupTokens)} tokens each). Actual results vary by workflow complexity and model.
      </p>
    </div>
  );
}

function SliderCard({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/30 p-5">
      <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-2">{label}</div>
      <div className="text-4xl font-bold text-ink-100 tabular-nums mb-5">
        {value.toLocaleString()}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-orange-500 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-ink-700 mt-1.5">
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-ink-600 block mb-1.5">
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm text-ink-200 tabular-nums focus:outline-none focus:border-orange-500/60 transition-colors"
      />
    </div>
  );
}

function ResultCard({
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
      wrap: "border-ink-700 bg-ink-800/20",
      label: "text-ink-500",
      value: "text-ink-200",
    },
    orange: {
      wrap: "border-orange-500/25 bg-orange-950/15",
      label: "text-orange-400",
      value: "text-orange-300",
    },
    emerald: {
      wrap: "border-emerald-500/25 bg-emerald-900/15",
      label: "text-emerald-400",
      value: "text-emerald-300",
    },
  }[variant];

  return (
    <div className={`rounded-xl border p-5 ${styles.wrap}`}>
      <div className={`text-[10px] uppercase tracking-widest mb-2 ${styles.label}`}>{label}</div>
      <div className={`text-xl font-bold tabular-nums leading-tight ${styles.value}`}>{value}</div>
      <div className="text-[11px] text-ink-600 mt-1.5 leading-snug">{sub}</div>
    </div>
  );
}
