<p align="center">
  <img src="./assets/gloria-wordmark.png" alt="gloria.dev" width="360">
</p>

<p align="center">
  <strong>Tools that help your agents — and humans — build the apps and write the code you want.<br>Build fearlessly; we've got the details.</strong>
</p>

---

This is the plugin marketplace for **[gloria.dev](https://gloria.dev)**. One repo serves multiple coding agents — [Claude Code](https://docs.claude.com/en/docs/claude-code/plugins), [OpenAI Codex](https://developers.openai.com/codex/plugins), [OpenCode](https://opencode.ai), and [Cursor](https://cursor.com) — from a single published source. Install the `gloria` plugin and your agent gets gloria.dev's skills plus the hosted gloria.dev MCP server.

**[Get started using Gloria →](#install)**

## What is gloria.dev?

gloria.dev keeps an agent-written codebase aligned with intent. Agents write the code; gloria.dev makes sure it's the code you want. Each tool is driven by a project's own source code — continuously comparing what was actually built against what you intended, and surfacing where the two have drifted apart — so the picture stays current as the code changes.

Its first shipping tool is **Canary** — dependency monitoring. Canary discovers every internal and external dependency a project relies on, turns each one into a continuous health check, and notifies you the moment a dependency goes down, starts erroring more than usual, or gets unexpectedly expensive — _before_ your users or your vendor tell you. It ships alongside a shared **skills library** (versioned, org-wide coding-agent skills), **Feature Map** (a living map between how you understand a feature and the code that implements it), and **Doc Holiday** documentation tooling. More tools are on the way: token cost tracking, coding standards, a living PRD, sub-agent management, and log debugging.

## What's in the `gloria` plugin

Installing the plugin gives your agent nine skills and wires up the hosted MCP server. (Cursor's marketplace has no individual-user self-service install command yet — see its section below for the working-today local-plugin install.)

| Skill                                    | What it does                                                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`setting-up-gloria`**                  | Wires Gloria into a repo: writes the `.gloria/USING-GLORIA.md` agent playbook, adds a Gloria section to `CLAUDE.md`/`AGENTS.md`, and offers project registration. |
| **`documenting-service-dependencies`**   | Scans a codebase and produces dependency inventories plus copy-paste health-check definitions — the discovery step behind Canary.                                 |
| **`identifying-skills-for-a-project`**   | Inventories the agent skills a project already uses and recommends the gaps worth filling.                                                                        |
| **`using-the-skills-library`**           | Drives the gloria.dev skills library: search the org library before authoring a skill, and publish reusable skills org-wide.                                      |
| **`extracting-coding-standards`**        | Derives rules and canonical snippets from a codebase's conventions and registers them with gloria's Coding Standards library.                                     |
| **`using-coding-standards`**             | Write-time discipline: finds the canonical snippet for what you're about to write, adopts or adapts it, and leaves provenance.                                    |
| **`checking-coding-standards`**          | Checks code against a project's registered Coding Standards — diff-scoped, metadata, or full-audit — and reports drift findings.                                  |
| **`debugging-production-errors`**        | Investigates production errors through gloria's log tools: find the spike, group the errors, correlate with the deploy, map the stack trace to source.            |
| **`investigating-production-incidents`** | Wraps `debugging-production-errors` with a durable investigation folder — evidence saved to `evidence/`, findings written to `INVESTIGATION.md`.                  |

The plugin also registers the remote **gloria.dev MCP server** at `https://mcp.gloria.dev/mcp` (Streamable HTTP). The agent uses it to register discovered dependencies as health checks and query their status. The server is OAuth-protected; the first request triggers a one-time browser sign-in.

### Token-usage tracking hooks (Claude Code)

The plugin ships Claude Code hooks that feed gloria.dev's token cost tracking. On `Stop`/`SessionEnd` the collector syncs the session's own transcript; on `SessionStart` it sweeps this machine's local session stores (Claude Code, Codex, and OpenCode) for anything recorded since the last sweep.

There is nothing to install: the first hook fire downloads a compiled collector binary for your platform (~50 MB, once per collector release) from this repo's GitHub Releases, verifies it against SHA-256 checksums pinned into the plugin at publish time, and caches it under `~/.gloria/bin/`. If the download can't complete (offline, unsupported platform), the hook exits silently and retries on a later session.

**Privacy:** the collector transmits **token usage only** — model names, token counts, timestamps, session/request identifiers, a random per-machine identifier (a UUID minted locally, not your hostname), and the optional project id from your config. To extract those numbers it reads your local session files (which contain conversation content), but it never transmits message content, prompts, code, or file paths.

**The hooks are inert until you configure them.** With no config present they exit 0 immediately (never interrupting your session) and log a one-line setup hint to `~/.gloria/collector.log`. Nothing is collected or sent.

One-time setup:

1. With the gloria MCP server connected, call the `enable_usage_tracking` tool (or run the `setting-up-gloria` skill, which drives it for you). It mints a write-only usage-ingest API key for your org — the secret appears once, in the tool result. Don't echo it into the chat.
2. Create `~/.gloria/config.json` from that result:

   ```json
   {
     "apiBaseUrl": "https://gloria.dev",
     "ingestToken": "<ingestToken from the tool result>"
   }
   ```

   An optional `"projectId"` attributes this machine's usage to one gloria project.

From the next session on, the hooks report usage automatically. If the machine is offline, batches queue under `~/.gloria/` and drain on a later hook run.

> **Looking for Doc Holiday?** The `writing-doc-holiday-prompts`, `defining-the-documentation-site-map`, and `capturing-documentation-screenshots` skills moved to their own marketplace, [`sandgardenhq/doc-holiday`](https://github.com/sandgardenhq/doc-holiday). Install it with `/plugin marketplace add sandgardenhq/doc-holiday` (Claude Code) — see that repo's README for every agent.

## Install

Pick your agent. Each command below is run from inside that agent unless noted.

### Claude Code

```bash
/plugin marketplace add sandgardenhq/gloria
/plugin install gloria@gloria
```

The first command registers this marketplace; the second installs the `gloria` plugin (its skills plus the gloria.dev MCP server). Restart Claude Code if prompted. The first MCP call opens a one-time browser sign-in.

### OpenAI Codex

```bash
codex plugin marketplace add sandgardenhq/gloria   # in your shell
```

Then, inside Codex, run `/plugins` and install **gloria**. Finally, complete the one-time OAuth handshake with the remote MCP server:

```bash
codex mcp login gloria                             # in your shell
```

Codex also ships a `SessionStart` hook that nudges you when a newer gloria plugin version is available — run `/hooks` inside Codex once after installing and trust it, or the nudge never fires.

### OpenCode

OpenCode has no marketplace — add gloria.dev as a plugin in your `opencode.json` (global `~/.config/opencode/opencode.json` or a project-local `opencode.json`), then restart OpenCode:

```json
{ "plugin": ["gloria@git+https://github.com/sandgardenhq/gloria.git"] }
```

OpenCode installs the plugin, which registers gloria.dev's skills and the remote MCP server. The first MCP call opens a one-time browser sign-in. Pin a version with a git ref (`…/gloria.git#v0.2.1`).

### Cursor

Cursor shipped its own plugin marketplace in February 2026 (Cursor 2.5), and this repo ships a real Cursor plugin (`.cursor-plugin/`) bundling the same skills and MCP server as the Claude/Codex plugin. Cursor has no individual-user self-service "add a marketplace repo" command yet, so clone this repo and symlink the plugin into Cursor's local plugins directory — Cursor auto-loads the bundled MCP server and skills from one manifest:

```bash
git -C ~/.cursor/plugins/sources/gloria pull || git clone https://github.com/sandgardenhq/gloria.git ~/.cursor/plugins/sources/gloria
mkdir -p ~/.cursor/plugins/local
ln -sf ~/.cursor/plugins/sources/gloria/plugins/gloria ~/.cursor/plugins/local/gloria
```

Open Cursor's Customize sidebar → Plugins and enable **gloria** if it isn't already on. The first MCP call opens a one-time browser sign-in. The clone lives under `~/.cursor/plugins/sources/` (not `/tmp`) so the symlink survives reboots, and the command above is safe to re-run any time.

If your org is on a Cursor Team or Enterprise plan, an admin can instead import this repo once for everyone: Dashboard → Settings → Plugins → Team Marketplaces → Import → `sandgardenhq/gloria`.

## Once installed

First, ask your agent to **set up gloria in this repo**. That invokes the `setting-up-gloria` skill, which — with your permission — writes `.gloria/USING-GLORIA.md` (the playbook that tells every coding agent when to use Gloria's tools and skills), adds a short Gloria section to your `CLAUDE.md`/`AGENTS.md` pointing at it, and offers to register the project with gloria.dev. Re-run it after plugin updates to refresh the playbook.

Then ask your agent to **document the project's service dependencies**. That invokes the `documenting-service-dependencies` skill, which produces the inventory and health-check definitions, then registers the resulting checks through the gloria.dev MCP server. From there, Canary runs the checks on a schedule and alerts you when a dependency drifts.

## Updating

| Agent        | Command                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Claude Code  | `/plugin marketplace update gloria` then `/reload-plugins`                                                               |
| OpenAI Codex | `codex plugin marketplace upgrade gloria` (restart Codex)                                                                |
| OpenCode     | `rm -rf ~/.cache/opencode/node_modules/gloria` and restart                                                               |
| Cursor       | `git -C ~/.cursor/plugins/sources/gloria pull` — the symlink and Cursor's plugin loader pick up the change automatically |

Third-party marketplaces have auto-update off by default in Claude Code — open `/plugin` → **Marketplaces** and enable auto-update for `gloria` to skip the manual step.

## Links

- Website — <https://gloria.dev>
- MCP server — <https://mcp.gloria.dev/mcp>

---

<p align="center"><sub>© Sandgarden, Inc. · gloria@sandgarden.com</sub></p>
