// Parse Claude Code stream-json JSONL into structured turns.
// A "turn" here == one assistant response (which may include multiple content
// blocks: text, tool_use). Tool results from the next user event get attached
// to the tool_use they resolve.

export interface UsageBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
  serverName?: string;
  toolName?: string;
  result?: ToolResultBlock;
}

export interface ToolResultBlock {
  type: "tool_result";
  toolUseId: string;
  content: unknown;
  isError: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock;

export interface Turn {
  index: number;
  role: "assistant";
  blocks: ContentBlock[];
  usage: UsageBreakdown;
  model: string;
  stopReason: string | null;
  uuid: string;
}

export interface ParsedTranscript {
  sessionId: string | null;
  model: string | null;
  cwd: string | null;
  mcpServers: string[];
  turns: Turn[];
  totals: UsageBreakdown & { totalCostUsd: number; durationMs: number; numTurns: number };
  isError: boolean;
  finalText: string | null;
  rawEventCount: number;
}

const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  // per million tokens
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4-5": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-opus-4-7": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-opus-4-6": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

export function priceOf(model: string, u: UsageBreakdown): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-6"];
  return (
    (u.inputTokens * p.input +
      u.outputTokens * p.output +
      u.cacheCreationTokens * p.cacheWrite +
      u.cacheReadTokens * p.cacheRead) /
    1_000_000
  );
}

interface RawUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

function normalizeUsage(u: RawUsage | undefined): UsageBreakdown {
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    cacheCreationTokens: u?.cache_creation_input_tokens ?? 0,
    cacheReadTokens: u?.cache_read_input_tokens ?? 0,
  };
}

function splitToolName(name: string): { serverName?: string; toolName?: string } {
  // MCP tools come through as mcp__<server>__<tool>
  const m = name.match(/^mcp__([^_]+(?:_[^_]+)*?)__(.+)$/);
  if (!m) return { toolName: name };
  return { serverName: m[1], toolName: m[2] };
}

export function parseTranscript(jsonl: string): ParsedTranscript {
  const lines = jsonl.split("\n").filter((l) => l.trim().length > 0);
  const turns: Turn[] = [];
  const toolUseIndex = new Map<string, ToolUseBlock>();

  let sessionId: string | null = null;
  let model: string | null = null;
  let cwd: string | null = null;
  let mcpServers: string[] = [];
  let totals: UsageBreakdown & { totalCostUsd: number; durationMs: number; numTurns: number } = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalCostUsd: 0,
    durationMs: 0,
    numTurns: 0,
  };
  let isError = false;
  let finalText: string | null = null;

  for (const line of lines) {
    let event: {
      type?: string;
      subtype?: string;
      session_id?: string;
      cwd?: string;
      model?: string;
      mcp_servers?: Array<{ name?: string } | string>;
      message?: {
        content?: Array<Record<string, unknown>>;
        usage?: RawUsage;
        model?: string;
        stop_reason?: string | null;
      };
      uuid?: string;
      total_cost_usd?: number;
      duration_ms?: number;
      num_turns?: number;
      usage?: RawUsage;
      is_error?: boolean;
      result?: string;
      error?: string;
    };
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "system" && event.subtype === "init") {
      sessionId = event.session_id ?? null;
      cwd = event.cwd ?? null;
      model = event.model ?? null;
      mcpServers = (event.mcp_servers ?? [])
        .map((s) => (typeof s === "string" ? s : s?.name ?? ""))
        .filter(Boolean);
      continue;
    }
    if (event.type === "assistant" && event.message) {
      const blocks: ContentBlock[] = [];
      for (const b of event.message.content ?? []) {
        if (b.type === "text") {
          blocks.push({ type: "text", text: String(b.text ?? "") });
        } else if (b.type === "tool_use") {
          const rawName = String(b.name ?? "");
          const { serverName, toolName } = splitToolName(rawName);
          const block: ToolUseBlock = {
            type: "tool_use",
            id: String(b.id ?? ""),
            name: rawName,
            input: b.input,
            serverName,
            toolName,
          };
          blocks.push(block);
          if (block.id) toolUseIndex.set(block.id, block);
        }
      }
      turns.push({
        index: turns.length,
        role: "assistant",
        blocks,
        usage: normalizeUsage(event.message.usage),
        model: event.message.model ?? model ?? "unknown",
        stopReason: event.message.stop_reason ?? null,
        uuid: event.uuid ?? "",
      });
      continue;
    }
    if (event.type === "user" && event.message) {
      // Tool results come back as user messages containing tool_result blocks
      for (const b of event.message.content ?? []) {
        if (b.type === "tool_result") {
          const id = String(b.tool_use_id ?? "");
          const target = toolUseIndex.get(id);
          if (target) {
            target.result = {
              type: "tool_result",
              toolUseId: id,
              content: b.content,
              isError: Boolean(b.is_error),
            };
          }
        }
      }
      continue;
    }
    if (event.type === "result") {
      totals = {
        inputTokens: event.usage?.input_tokens ?? 0,
        outputTokens: event.usage?.output_tokens ?? 0,
        cacheCreationTokens: event.usage?.cache_creation_input_tokens ?? 0,
        cacheReadTokens: event.usage?.cache_read_input_tokens ?? 0,
        totalCostUsd: event.total_cost_usd ?? 0,
        durationMs: event.duration_ms ?? 0,
        numTurns: event.num_turns ?? turns.length,
      };
      isError = Boolean(event.is_error);
      finalText = event.result ?? event.error ?? null;
    }
  }

  return {
    sessionId,
    model,
    cwd,
    mcpServers,
    turns,
    totals,
    isError,
    finalText,
    rawEventCount: lines.length,
  };
}

export function toolResultToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        c && typeof c === "object" && (c as { type?: unknown }).type === "text"
          ? String((c as { text?: unknown }).text ?? "")
          : JSON.stringify(c),
      )
      .join("\n");
  }
  return JSON.stringify(content, null, 2);
}
