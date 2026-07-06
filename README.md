<p align="center">
  <img src="./assets/gloria-wordmark.png" alt="gloria.dev" width="360">
</p>

<p align="center">
  <strong>Tools that help your agents — and humans — build the apps and write the code you want.<br>Build fearlessly; we've got the details.</strong>
</p>

---

This is the plugin marketplace for **[gloria.dev](https://gloria.dev)**. One repo serves multiple coding agents — [Claude Code](https://docs.claude.com/en/docs/claude-code/plugins), [OpenAI Codex](https://developers.openai.com/codex/plugins), [OpenCode](https://opencode.ai), and [Cursor](https://cursor.com) — from a single published source. Install the `gloria` plugin (or, for Cursor, connect manually) and your agent gets gloria.dev's skills plus the hosted gloria.dev MCP server.

## What is gloria.dev?

gloria.dev keeps an agent-written codebase aligned with intent. Agents write the code; gloria.dev makes sure it's the code you want. Each tool is driven by a project's own source code — continuously comparing what was actually built against what you intended, and surfacing where the two have drifted apart — so the picture stays current as the code changes.

Its first shipping tool is **Canary** — dependency monitoring. Canary discovers every internal and external dependency a project relies on, turns each one into a continuous health check, and notifies you the moment a dependency goes down, starts erroring more than usual, or gets unexpectedly expensive — _before_ your users or your vendor tell you. It ships alongside a shared **skills library** (versioned, org-wide coding-agent skills), **Feature Map** (a living map between how you understand a feature and the code that implements it), and **Doc Holiday** documentation tooling. More tools are on the way: token cost tracking, coding standards, a living PRD, sub-agent management, and log debugging.

## What's in the `gloria` plugin

Installing the plugin gives your agent nine skills and wires up the hosted MCP server. (Cursor has no plugin installer — see its section below for the two-step manual install.)

| Skill                                     | What it does                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`setting-up-gloria`**                   | Wires Gloria into a repo: writes the `.gloria/USING-GLORIA.md` agent playbook, adds a Gloria section to `CLAUDE.md`/`AGENTS.md`, and offers project registration. |
| **`documenting-service-dependencies`**    | Scans a codebase and produces dependency inventories plus copy-paste health-check definitions — the discovery step behind Canary.                                 |
| **`identifying-skills-for-a-project`**    | Inventories the agent skills a project already uses and recommends the gaps worth filling.                                                                        |
| **`using-the-skills-library`**            | Drives the gloria.dev skills library: search the org library before authoring a skill, and publish reusable skills org-wide.                                      |
| **`defining-the-documentation-site-map`** | Scans the source and emits a Diátaxis-organized documentation site map plus a per-page content plan and a Mermaid hierarchy.                                      |
| **`writing-doc-holiday-prompts`**         | Turns that site map into ready-to-run `@doc.holiday` create/update prompts, plus reusable Instruction Library entries.                                            |
| **`extracting-coding-standards`**         | Derives rules and canonical snippets from a codebase's conventions and registers them with gloria's Coding Standards library.                                     |
| **`using-coding-standards`**              | Write-time discipline: finds the canonical snippet for what you're about to write, adopts or adapts it, and leaves provenance.                                    |
| **`checking-coding-standards`**           | Checks code against a project's registered Coding Standards — diff-scoped, metadata, or full-audit — and reports drift findings.                                  |

The plugin also registers the remote **gloria.dev MCP server** at `https://mcp.gloria.dev/mcp` (Streamable HTTP). The agent uses it to register discovered dependencies as health checks and query their status. The server is OAuth-protected; the first request triggers a one-time browser sign-in.

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

### OpenCode

OpenCode has no marketplace — add gloria.dev as a plugin in your `opencode.json` (global `~/.config/opencode/opencode.json` or a project-local `opencode.json`), then restart OpenCode:

```json
{ "plugin": ["gloria@git+https://github.com/sandgardenhq/gloria.git"] }
```

OpenCode installs the plugin, which registers gloria.dev's skills and the remote MCP server. The first MCP call opens a one-time browser sign-in. Pin a version with a git ref (`…/gloria.git#v0.2.0`).

### Cursor

Cursor has no plugin marketplace — the MCP server and the skills are two separate manual steps.

**MCP server** — add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{ "mcpServers": { "gloria": { "url": "https://mcp.gloria.dev/mcp" } } }
```

The first tool call opens a one-time browser sign-in.

**Skills** — Cursor discovers [Agent Skills](https://agentskills.io) from `.cursor/skills/` / `.agents/skills/` (project) or their `~/`-prefixed global equivalents. Clone this repo and copy the skills in:

```bash
git clone https://github.com/sandgardenhq/gloria.git /tmp/gloria
mkdir -p .agents/skills && cp -R /tmp/gloria/skills/. .agents/skills/
```

## Once installed

First, ask your agent to **set up gloria in this repo**. That invokes the `setting-up-gloria` skill, which — with your permission — writes `.gloria/USING-GLORIA.md` (the playbook that tells every coding agent when to use Gloria's tools and skills), adds a short Gloria section to your `CLAUDE.md`/`AGENTS.md` pointing at it, and offers to register the project with gloria.dev. Re-run it after plugin updates to refresh the playbook.

Then ask your agent to **document the project's service dependencies**. That invokes the `documenting-service-dependencies` skill, which produces the inventory and health-check definitions, then registers the resulting checks through the gloria.dev MCP server. From there, Canary runs the checks on a schedule and alerts you when a dependency drifts.

## Updating

| Agent        | Command                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Claude Code  | `/plugin marketplace update gloria` then `/reload-plugins`                                               |
| OpenAI Codex | `codex plugin marketplace upgrade gloria` (restart Codex)                                                |
| OpenCode     | `rm -rf ~/.cache/opencode/node_modules/gloria` and restart                                               |
| Cursor       | Re-clone (or `git pull`) and re-copy `skills/` into your skills directory; the MCP config rarely changes |

Third-party marketplaces have auto-update off by default in Claude Code — open `/plugin` → **Marketplaces** and enable auto-update for `gloria` to skip the manual step.

## Links

- Website — <https://gloria.dev>
- MCP server — <https://mcp.gloria.dev/mcp>

---

<p align="center"><sub>© Sandgarden, Inc. · gloria@sandgarden.com</sub></p>
