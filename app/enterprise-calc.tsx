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
  avgPct,
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
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [firstMsgTokens, setFirstMsgTokens] = useState(DEFAULT_FIRST_MSG_TOKENS);
  const [followupTokens, setFollowupTokens] = useState(DEFAULT_FOLLOWUP_TOKENS);
  const [savingsPct, setSavingsPct] = useState(Math.round(avgPct));

  // Cumulative context: turn k sends full history, costing firstMsgTokens + (k-1)*followupTokens
  // Total = N*firstMsgTokens + followupTokens * N*(N-1)/2
  const tokensPerConv =
    messages * firstMsgTokens +
    followupTokens * (messages * (messages - 1)) / 2;

  const totalConvs = employees * convsPerMonth;
  const totalTokensVendor = totalConvs * tokensPerConv;
  const savingsTokens = totalTokensVendor * (savingsPct / 100);
  const savingsCost = savingsTokens * COST_PER_TOKEN;

  return (
    <div className="space-y-8">
      {/* ── Primary sliders ── */}
      <div className="grid md:grid-cols-3 gap-4">
        <SliderCard
          label="Employees using AI agents"
          value={employees}
          min={10}
          max={5000}
          step={10}
          onChange={setEmployees}
          editable
        />
        <SliderCard
          label="AI conversations / employee / month"
          value={convsPerMonth}
          min={5}
          max={500}
          step={5}
          onChange={setConvsPerMonth}
          editable
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

      {/* ── Advanced settings ── */}
      <div className="rounded-lg border border-ink-800 bg-ink-800/20">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs text-ink-500 hover:text-ink-300 transition-colors"
        >
          <span className="uppercase tracking-widest">Advanced settings</span>
          <span className="text-ink-700">{showAdvanced ? "▲ Hide" : "▼ Show"}</span>
        </button>

        {showAdvanced && (
          <div className="border-t border-ink-800 px-4 py-5 grid sm:grid-cols-3 gap-5">
            <NumberInput
              label="First message tokens"
              hint="Includes tool call round-trip"
              value={firstMsgTokens}
              min={1_000}
              max={100_000}
              step={500}
              onChange={setFirstMsgTokens}
            />
            <NumberInput
              label="Additional message tokens"
              hint="Each follow-up added to context"
              value={followupTokens}
              min={250}
              max={20_000}
              step={250}
              onChange={setFollowupTokens}
            />
            <NumberInput
              label="Token savings %"
              hint={
                hasRealData
                  ? "Default from measured benchmarks"
                  : "Estimated — run benchmarks to measure"
              }
              value={savingsPct}
              min={1}
              max={99}
              step={1}
              onChange={setSavingsPct}
              suffix="%"
            />
          </div>
        )}
      </div>

      {/* ── Token model summary ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600 px-1">
        <span>
          {commas(tokensPerConv)} tokens / conversation
        </span>
        <span className="text-ink-800">·</span>
        <span>{commas(totalConvs)} conversations / month</span>
        <span className="text-ink-800">·</span>
        <span>{savingsPct}% savings assumed</span>
      </div>

      {/* ── Result cards ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <ResultCard
          label="Cost savings / month"
          value={costFmt(savingsCost)}
          sub="claude-sonnet-4-6 · $5/MTok blended rate"
          variant="orange"
        />
        <ResultCard
          label="Cost savings / year"
          value={costFmt(savingsCost * 12)}
          sub={`${costFmt(savingsCost)} × 12 months`}
          variant="orange"
        />
      </div>

      <p className="text-[11px] text-ink-700 leading-relaxed">
        Token model: each conversation turn re-sends the full accumulated context —
        turn 1 costs {commas(firstMsgTokens)} tokens, turn 2 costs {commas(firstMsgTokens + followupTokens)},
        and so on. Total per conversation grows quadratically with message count.
        {" "}Cost estimate uses a $5/MTok blended rate (claude-sonnet-4-6). Actual results vary by workflow and model.
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
  editable = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  editable?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/30 p-5">
      <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-2">{label}</div>

      {editable ? (
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!isNaN(n) && n >= min && n <= max) onChange(n);
          }}
          className="w-full bg-transparent text-4xl font-bold text-ink-100 tabular-nums mb-4 outline-none border-b border-ink-800 focus:border-orange-500/60 pb-1 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <div className="text-4xl font-bold text-ink-100 tabular-nums mb-4">
          {value.toLocaleString()}
        </div>
      )}

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
  hint,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-ink-500 block mb-1">
        {label}
      </label>
      {hint && (
        <div className="text-[10px] text-ink-700 mb-2">{hint}</div>
      )}
      <div className="relative">
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
          className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm text-ink-200 tabular-nums focus:outline-none focus:border-orange-500/60 transition-colors pr-8"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
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
