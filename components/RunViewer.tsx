"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  toolResultToString,
  priceOf,
  type Turn,
  type ToolUseBlock,
  type ParsedTranscript,
} from "@/lib/parse-transcript";

interface Meta {
  runId: string;
  configName: string;
  promptFile?: string | null;
  userMessage: string;
  allowedTools: Record<string, string[]>;
  model: string;
  startedAt: string;
}

export default function RunViewer({ meta, parsed }: { meta: Meta; parsed: ParsedTranscript }) {
  const [mode, setMode] = useState<"chat" | "token">("chat");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-400">
          {parsed.turns.length} assistant turn{parsed.turns.length === 1 ? "" : "s"} · model {meta.model}
          {parsed.isError && <span className="ml-2 text-red-400">· error</span>}
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      {mode === "chat" ? (
        <ChatView meta={meta} parsed={parsed} />
      ) : (
        <TokenView meta={meta} parsed={parsed} />
      )}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: "chat" | "token"; onChange: (m: "chat" | "token") => void }) {
  return (
    <div className="inline-flex rounded-full border border-ink-700 p-0.5 text-xs">
      <button
        onClick={() => onChange("chat")}
        className={`px-3 py-1 rounded-full transition-colors ${
          mode === "chat" ? "bg-emerald-700 text-white" : "text-ink-300 hover:text-ink-100"
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => onChange("token")}
        className={`px-3 py-1 rounded-full transition-colors ${
          mode === "token" ? "bg-emerald-700 text-white" : "text-ink-300 hover:text-ink-100"
        }`}
      >
        Token
      </button>
    </div>
  );
}

// ---------- Chat view ----------

function ChatView({ meta, parsed }: { meta: Meta; parsed: ParsedTranscript }) {
  const totalCost = parsed.totals.totalCostUsd || priceOf(meta.model, parsed.totals);
  return (
    <section className="space-y-4">
      <PoweredByWorkato />
      <UserBubble text={meta.userMessage} />
      {parsed.turns.map((t) => (
        <AssistantTurn key={t.uuid || t.index} turn={t} />
      ))}
      <div className="pt-2 text-xs text-ink-500 text-center">
        {parsed.totals.numTurns} API turn{parsed.totals.numTurns === 1 ? "" : "s"} · ~$
        {totalCost < 0.01 ? totalCost.toFixed(4) : totalCost.toFixed(3)} total
      </div>
    </section>
  );
}

function PoweredByWorkato() {
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-orange-300">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
        Powered by Workato
      </span>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 text-right">User</div>
        <div className="rounded-lg bg-emerald-800/40 border border-emerald-700/40 px-3 py-2 text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    </div>
  );
}

function AssistantTurn({ turn }: { turn: Turn }) {
  const textBlocks = turn.blocks.filter((b) => b.type === "text") as { type: "text"; text: string }[];
  const toolBlocks = turn.blocks.filter((b): b is ToolUseBlock => b.type === "tool_use");
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-ink-500">Assistant</div>
        {textBlocks.map((b, i) => (
          <div
            key={`t-${i}`}
            className="rounded-lg bg-ink-800 border border-ink-700 px-3 py-2 text-sm"
          >
            <Markdown text={b.text} />
          </div>
        ))}
        {toolBlocks.map((b, i) => (
          <ChatToolBlock key={`u-${i}`} block={b} />
        ))}
      </div>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="chat-md text-sm text-ink-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-semibold mt-3 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0 text-ink-200">{children}</h3>,
          h4: ({ children }) => <h4 className="text-xs font-semibold uppercase tracking-wider mt-2 mb-1 first:mt-0 text-ink-300">{children}</h4>,
          p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-ink-50">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, className }) => {
            const inline = !className;
            if (inline) {
              return <code className="rounded bg-ink-900/70 px-1 py-0.5 text-[12px] font-mono text-amber-200">{children}</code>;
            }
            return <code className={className}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="my-2 rounded bg-ink-900/70 p-2 text-[12px] font-mono overflow-x-auto">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-ink-600 pl-3 italic text-ink-300 my-2">{children}</blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2">{children}</a>
          ),
          hr: () => <hr className="border-ink-700 my-3" />,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-xs border border-ink-700 border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-ink-900/60 text-ink-300">{children}</thead>,
          th: ({ children }) => <th className="border border-ink-700 px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-ink-700 px-2 py-1 align-top">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ChatToolBlock({ block }: { block: ToolUseBlock }) {
  const label = block.serverName ? `${block.serverName} · ${block.toolName}` : block.name;
  return (
    <details className="rounded-lg border border-blue-700/40 bg-blue-900/10">
      <summary className="cursor-pointer text-xs px-3 py-2 text-blue-200 flex items-center gap-2">
        <span>🔧</span>
        <span className="font-medium">{label}</span>
        {block.result?.isError && <span className="text-red-300 text-[10px] uppercase tracking-wider">error</span>}
      </summary>
      <div className="px-3 pb-3 space-y-2 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">Input</div>
          <pre className="text-blue-100 whitespace-pre-wrap break-words bg-ink-900/60 rounded p-2">
            {JSON.stringify(block.input, null, 2)}
          </pre>
        </div>
        {block.result && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">
              Result{block.result.isError ? " (error)" : ""}
            </div>
            <pre className="text-amber-100 whitespace-pre-wrap break-words bg-ink-900/60 rounded p-2 max-h-72 overflow-y-auto">
              {toolResultToString(block.result.content)}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

// ---------- Token view ----------

function fmtNumber(n: number): string {
  return n.toLocaleString();
}
function fmtCost(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
}

function TokenView({ meta, parsed }: { meta: Meta; parsed: ParsedTranscript }) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-ink-700 p-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <MetaCell label="Prompt file" value={meta.promptFile ?? "<none>"} />
        <MetaCell label="Started" value={new Date(meta.startedAt).toLocaleString()} />
        <MetaCell
          label="Tools exposed"
          value={
            Object.entries(meta.allowedTools ?? {})
              .flatMap(([srv, tools]) => tools.map((t) => `${srv}.${t}`))
              .join(", ") || "<none>"
          }
        />
        <MetaCell label="Servers" value={parsed.mcpServers.join(", ") || "<none>"} />
      </div>

      <div className="rounded-lg border border-ink-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-800/60 text-ink-300 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 w-10">#</th>
              <th className="text-left px-3 py-2">Response</th>
              <th className="text-right px-3 py-2 w-24">Input</th>
              <th className="text-right px-3 py-2 w-24">Output</th>
              <th className="text-right px-3 py-2 w-28">Cache R / W</th>
              <th className="text-right px-3 py-2 w-24">Est cost</th>
            </tr>
          </thead>
          <tbody>
            {parsed.turns.map((t) => (
              <TokenTurnRow key={t.uuid || t.index} turn={t} model={meta.model} />
            ))}
          </tbody>
          <tfoot className="bg-ink-800/60 text-ink-200 font-medium">
            <tr>
              <td className="px-3 py-2" colSpan={2}>
                Totals ({parsed.totals.numTurns} turns · {(parsed.totals.durationMs / 1000).toFixed(1)}s)
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(parsed.totals.inputTokens)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(parsed.totals.outputTokens)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-xs">
                {fmtNumber(parsed.totals.cacheReadTokens)} / {fmtNumber(parsed.totals.cacheCreationTokens)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {fmtCost(parsed.totals.totalCostUsd || priceOf(meta.model, parsed.totals))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {parsed.finalText && (
        <section className="rounded-lg border border-ink-700 p-4">
          <div className="text-xs uppercase tracking-wider text-ink-400 mb-2">Final result</div>
          <Markdown text={parsed.finalText} />
        </section>
      )}
    </section>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-ink-200">{value}</div>
    </div>
  );
}

function TokenTurnRow({ turn, model }: { turn: Turn; model: string }) {
  const cost = priceOf(model, turn.usage);
  const textBlocks = turn.blocks.filter((b) => b.type === "text") as { type: "text"; text: string }[];
  const toolBlocks = turn.blocks.filter((b): b is ToolUseBlock => b.type === "tool_use");
  return (
    <tr className="border-t border-ink-700 align-top">
      <td className="px-3 py-2 text-ink-400">{turn.index + 1}</td>
      <td className="px-3 py-2 space-y-2">
        {textBlocks.map((b, i) => (
          <Markdown key={`t-${i}`} text={b.text} />
        ))}
        {toolBlocks.map((b, i) => (
          <TokenToolBlock key={`u-${i}`} block={b} />
        ))}
        {turn.stopReason && (
          <div className="text-[10px] uppercase tracking-wider text-ink-500 pt-1">
            stop: {turn.stopReason}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(turn.usage.inputTokens)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(turn.usage.outputTokens)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs text-ink-400">
        {fmtNumber(turn.usage.cacheReadTokens)} / {fmtNumber(turn.usage.cacheCreationTokens)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-ink-300">{fmtCost(cost)}</td>
    </tr>
  );
}

function TokenToolBlock({ block }: { block: ToolUseBlock }) {
  const label = block.serverName ? `${block.serverName} · ${block.toolName}` : block.name;
  return (
    <details className="rounded border border-blue-700/40 bg-blue-900/10">
      <summary className="cursor-pointer text-xs px-2 py-1 text-blue-200">
        🔧 {label}
        {block.result?.isError && <span className="ml-2 text-red-300">(error)</span>}
      </summary>
      <div className="px-2 py-2 space-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">Input</div>
          <pre className="text-[11px] text-blue-100 whitespace-pre-wrap break-words">
            {JSON.stringify(block.input, null, 2)}
          </pre>
        </div>
        {block.result && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">
              Result{block.result.isError ? " (error)" : ""}
            </div>
            <pre className="text-[11px] text-amber-100 whitespace-pre-wrap break-words max-h-64 overflow-y-auto bg-ink-900/60 p-2 rounded">
              {toolResultToString(block.result.content)}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}
