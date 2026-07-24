# MCP Token Lab — Web Viewer

A minimal Next.js app that presents recorded scenario runs (per-turn token usage, chat, and tool calls). Reads run pairs from `runs/`:

- `runs/<runId>.meta.json` — scenario metadata (name, prompt, allowed tools, model)
- `runs/<runId>.jsonl` — Claude Code stream-json transcript

## Local dev

```bash
npm install
npm run dev
```

Then open <http://localhost:3030>.

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project**, import the repo.
3. Framework preset: **Next.js** (auto-detected). No env vars needed.
4. Deploy.

New runs? Drop the `.meta.json` + `.jsonl` pair into `runs/`, commit, push — Vercel redeploys.
