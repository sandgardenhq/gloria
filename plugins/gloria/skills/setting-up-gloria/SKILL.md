---
name: setting-up-gloria
description: For a project that's already set up (has, or intentionally has no, its own CLAUDE.md/AGENTS.md) and just needs Gloria wired in — not for a brand-new project with no CLAUDE.md yet (use `setting-up-a-project` for that, which chains into this skill automatically at the end). Use when installing Gloria into a repo ("set up gloria", "install gloria in this project"), when a repo is missing .gloria/USING-GLORIA.md or the gloria section in CLAUDE.md/AGENTS.md, or after a gloria plugin update to refresh a stale doc — copies the canonical USING-GLORIA.md agent doc into the repo, wires an evergreen Gloria section into the agent instruction files (with the user's permission), and offers to register the project with gloria.dev. Idempotent; safe to re-run.
---

# Setting Up Gloria

## Overview

Wire Gloria into the current repo so every coding agent that works here knows
what Gloria is and when to use it. Two files carry that:

1. **`.gloria/USING-GLORIA.md`** — the agent playbook, copied verbatim from
   the `USING-GLORIA.md` that sits next to this SKILL.md (the skill's base
   directory). Committed to the repo.
2. **A marked section in the repo's agent instruction files** (`CLAUDE.md`
   and/or `AGENTS.md`) that points unconditionally at the doc. The section is
   evergreen — it names no features, so it never changes across Gloria
   releases; only the doc does.

Never modify the user's files without showing them exactly what will change
and getting a yes first.

This skill assumes the repo is already set up (or deliberately has no
CLAUDE.md of its own) — it only ever inserts/updates the marked Gloria
section inside existing instruction files, or creates a bare `AGENTS.md`
holding just that section. For a brand-new, empty repo that needs a full
CLAUDE.md authored from scratch, use `setting-up-a-project` instead — it
runs the full interview and, as its last step, offers to run this skill
automatically.

## The instruction-file section

Insert this text exactly, markers included. The markers are how re-runs find
and replace the section instead of duplicating it.

```markdown
<!-- gloria:start -->

## Gloria

This project uses [Gloria](https://gloria.dev) to keep agent-written code
aligned with intent — dependency monitoring, shared skills, and more. Gloria's
tools and skills apply to everyday coding tasks, not just Gloria-specific
requests.

Before starting work in this repo, read `.gloria/USING-GLORIA.md`. It explains
which Gloria tools and skills to use, and when. When it names a trigger that
matches your current task, using the corresponding tool/skill is required, not
optional.

<!-- gloria:end -->
```

## Workflow

### 1. Detect state

- Find the repo root (`git rev-parse --show-toplevel`; fall back to the
  working directory if not a git repo).
- Locate the shipped doc: the `USING-GLORIA.md` in this skill's base
  directory. If it is missing, stop and tell the user the plugin install
  looks broken — do not synthesize the doc from memory.
- Check what already exists at the repo root:
  - `.gloria/USING-GLORIA.md` — present? Compare its `gloria-doc-version`
    stamp (first line) with the shipped copy's.
  - `CLAUDE.md`, `AGENTS.md` — which exist, and does each already contain a
    `<!-- gloria:start -->` ... `<!-- gloria:end -->` block?

### 2. Propose and ask permission — once

Tell the user precisely what will happen, in one message, and ask a single
yes/no. Cover only the actions actually needed, e.g.:

- create (or replace, if the stamp differs) `.gloria/USING-GLORIA.md`;
- insert the Gloria section into `CLAUDE.md` and `AGENTS.md` (or "replace the
  existing Gloria section in ...");
- create `AGENTS.md` containing the section, when neither instruction file
  exists.

If everything is already current, say so and skip to step 5. If the user
declines the file edits, stop — do not partially apply.

### 3. Write the doc

Copy the shipped `USING-GLORIA.md` to `.gloria/USING-GLORIA.md` **verbatim**
(create the `.gloria/` directory if needed). Do not edit, reformat, or
"improve" the content — refreshes must stay a pure file copy.

### 4. Wire the instruction files

For each of `CLAUDE.md` and `AGENTS.md` that exists at the repo root:

- If it contains a marker block, replace everything from
  `<!-- gloria:start -->` through `<!-- gloria:end -->` (inclusive) with the
  section above.
- Otherwise append the section at the end of the file, preceded by one blank
  line.

If neither file exists, create `AGENTS.md` containing only the section
(AGENTS.md is the cross-agent standard; Claude Code reads it too).

### 5. Offer project registration

- Call the `gloria` MCP tool `get_info`.
  - If the call fails (not authenticated / server unreachable), tell the user
    the files are wired but registration needs an MCP login, mention the
    login step for their agent, and finish. Setup is still a success.
- Call `list_projects` and look for a project matching this repo (by name or
  repo URL). If none matches, offer to run `register_project`. Registration
  is optional — a "no" still completes setup.

### 6. Offer token-usage tracking setup (optional)

The gloria plugin ships hooks (Claude Code, Codex, OpenCode) that transmit
**token usage only** (model names, token counts, timestamps, session ids, and
a locally-minted random machine UUID — never message content, prompts, or
code) to gloria.dev's cost tracking. Cursor's hooks are wired too but are
currently a no-op — see the Cursor note below. They are inert until
`~/.gloria/config.json` exists, so offer to set it up — a "no" still completes
setup.

If the user says yes:

1. Call the `gloria` MCP tool **`enable_usage_tracking`** (optionally passing
   `machineLabel`, e.g. the machine's hostname, if the user consents to
   naming the key). It mints a write-only, org-scoped Clerk API key and
   returns `{ apiBaseUrl, ingestToken }` plus write instructions.
2. Write `~/.gloria/config.json` (per-machine, not per-repo) directly from
   the tool result — merge with any existing keys in the file:

   ```json
   {
     "apiBaseUrl": "<apiBaseUrl from the tool result>",
     "ingestToken": "<ingestToken from the tool result>"
   }
   ```

   **Never echo the `ingestToken` into the conversation, logs, or any other
   file** — write it straight to the config file. The secret is shown exactly
   once; a compromised or lost key is revoked from the Clerk organization
   settings, and re-running the tool mints a fresh one.

   An optional `"projectId"` attributes the machine's usage to one gloria
   project. The collector needs no runtime install: the plugin's first hook
   fire downloads a compiled, checksum-verified collector binary for this
   platform (~50 MB, once per collector release) and caches it under
   `~/.gloria/bin/`.

   **Manual fallback (MCP not connected on this machine):** any org member
   can mint the key from a machine that _does_ have the gloria MCP server
   connected (the credential is per-machine, so mint one per machine), or an
   org admin can create an API key with scope `usage:ingest` for the
   organization in Clerk and supply it the same way. Have the user write the
   file themselves — never ask them to paste the secret into the chat.

From the next Claude Code session on, the plugin's hooks report usage
automatically — and the session-start sweep also collects **Codex and
OpenCode** usage from this machine's local session stores, so no further
wiring is needed when Claude Code runs here regularly.

**Codex:** the Codex plugin manifest (`.codex-plugin/plugin.json`) declares
the same `Stop`/`SessionStart` hooks Claude Code uses, pointing at the same
collector. This should auto-wire usage collection the moment the gloria
plugin is installed through Codex's plugin marketplace — but it has not been
empirically confirmed against a live Codex install, so treat it as
expected-but-unverified rather than a guarantee. As a manual fallback (or on
a Codex-only machine that hasn't installed the plugin), point `notify` in
`~/.codex/config.toml` at the collector download stub directly:

```toml
notify = ["node", "/path/to/plugins/gloria/collector/stub.mjs", "hook-session-start"]
```

(The collector accepts and ignores Codex's JSON argv payload.)

**OpenCode:** the gloria OpenCode plugin (`.opencode/plugins/gloria.js`) wires
`session.created` and `session.idle` to trigger the same collector sweep —
this ships automatically with the plugin, no manual step needed.

**Cursor:** the Cursor plugin wires `stop`/`sessionStart`/`sessionEnd` hooks
too, but they call the collector's `hook-cursor` entrypoint, which is a
**deliberate no-op**. Cursor hook payloads carry no token usage or cost data,
and Cursor's own local session storage is unreliable for it (missing cache
tokens, mostly-zeroed counts on current versions) — the accurate source is
the Team/Enterprise Admin API, which has no collector adapter yet. Be honest
about this status: Cursor sessions do not contribute usage data today, even
though the hooks are wired.

### 7. Report

Summarize what changed (files created/updated, section inserted where,
registration outcome, usage tracking configured or declined) and suggest
committing the changes, e.g.
`chore: wire gloria agent doc into instruction files`.

## Idempotency rules

- Re-running with identical content is a no-op; say "already current".
- A stale `.gloria/USING-GLORIA.md` (older stamp) is overwritten wholesale.
- Marker blocks are always replaced in place, never duplicated. If a file
  somehow contains multiple marker blocks, replace the first and remove the
  rest, and mention it.
- Never touch anything outside the marker block in an instruction file, and
  never edit any other file.

## When to suggest this skill proactively

- A Gloria MCP tool's `get_info` response carries a `latestAgentDocVersion`
  newer than the repo's `.gloria/USING-GLORIA.md` stamp → offer a refresh.
- The user just installed or updated the Gloria plugin in a repo with no
  `.gloria/USING-GLORIA.md` → offer initial setup.
