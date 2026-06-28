---
name: using-the-skills-library
description: Use when about to author a new agent skill, when asked whether the org already has a skill for some task, when sharing/publishing a reusable skill across the organization, or when installing a skill the org subscribes to from an external marketplace (e.g. Obra Superpowers) — drives the gloria.dev skills-library tools (search before you duplicate, get the full bundle, publish immutable versions org-wide, install external skills via the host agent's native marketplace).
---

# Using the Skills Library

## Overview

Your gloria.dev organization has a **versioned, org-wide skills library**. Before you write a new agent skill, check whether one already exists; when you build a reusable one, publish it so every project in the org can use it.

Skills come from **three sources**, distinguished by the `source` field on each `search_skills` result:

- **`org`** — your organization's own published skills (mutable, versioned).
- **`gloria.dev`** — read-only system skills seeded into every org.
- **`marketplace:<id>`** — skills from an **external marketplace** your org subscribes to (e.g. Obra Superpowers). These are **metadata-only**: gloria indexes their frontmatter but never copies the content. You install them through the host coding agent's **native marketplace**, not via `get_skill`.

These tools live on the **gloria** MCP server and are **deferred** — they will not appear until you load them. Run `ToolSearch` with `gloria skill` (or `select:` the exact names) before calling them.

**Core principle: search before you author. Publish to share. Install external skills natively.**

## When to Use

- You're about to write a new skill — **first** confirm the org doesn't already have one.
- Someone asks "do we have a skill for X?" / "is there an existing skill that…".
- You finished a reusable skill locally and want the whole org to use it.
- You need to update a published skill, or inspect its version history.

Not for project-only conventions (those go in `CLAUDE.md`) or one-off local skills.

## The Tools

| Tool | Use | Requires | Returns |
|------|-----|----------|---------|
| `search_skills` | Find an existing skill (org + system + external) | `query` (optional substring) and/or `tags` (optional `string[]`) — omit both to list all | Summaries: slug, name, description, latest version, `tags`, author, updated-at, plus `source`/`marketplace`/`plugin`/`supportedAgents` on external skills |
| `get_skill` | Read a full bundle | `slug` (+ optional `version`) | SKILL.md + all supporting files. **External (marketplace) slugs return `409`** — use `install_skill` instead |
| `list_skill_versions` | Inspect history | `slug` | Versions newest-first: name, description, content hash, author, timestamp |
| `publish_skill` | Create / update a skill | `files[]` (each `{path, content}`) | `{ slug, name, version, contentHash }` |
| `list_marketplaces` | See external subscriptions | — | Each subscription: id, repo URL, `supportedAgents`, sync status |
| `install_skill` | Install an external skill | `marketplace` (id) + `agent` (`claude-code`\|`codex`) + `slug` **or** `plugin` | `{ plugin, repoUrl, commands[] }` — the host agent's native subscribe/install commands (commands only, never files) |

**Tags.** Skills are tagged from the `tags:` frontmatter key in their `SKILL.md` (a scalar `tags: a, b` or a YAML sequence; each value is slugified, deduped, and capped). `search_skills`'s `tags` filter is **AND** — a skill matches only if it carries **every** tag you pass — and combines with `query` (both must hold). There is no tool that lists the org's tags, so to discover them, `search_skills` with no args and read the `tags` on the returned summaries.

## Workflow A — Discover before duplicating

1. `search_skills` with the task keywords. The query is a **substring match on name and description only**, so it misses differently-named skills — run 2–3 synonym queries ("API key rotation", "credential rotation", "secret rotation"). Because the org ships **pre-seeded with gloria.dev system skills**, a no-args `search_skills` is also how you see the tags already in use — then narrow with the `tags` filter (AND semantics), which catches relevant skills a substring query would miss. If still unsure, call it with **no query and no tags** to list the whole library.
2. For any candidate, `get_skill` by slug to read the actual scope before judging overlap.
3. Overlaps? Reuse or extend it instead of writing a duplicate. No match → author the new skill.

## Workflow B — Publishing / updating

`publish_skill` takes a `files` array; one file must be a root **`SKILL.md` with `name` + `description` frontmatter**. On success a new **immutable** version is created.

Know these before you publish:

- **Slug is derived from the `name` frontmatter** — lowercased, every run of non-alphanumerics becomes a single hyphen, leading/trailing hyphens trimmed (`"Rotate API Keys!"` → `rotate-api-keys`). You do not pass a slug.
- **Add a `tags:` frontmatter key** so the skill is discoverable by `search_skills`'s tag filter — a scalar (`tags: secrets, security`) or a YAML sequence. Tags are slugified and deduped on publish; reuse tags you already saw in the library (Workflow A) so related skills cluster.
- **Versions are append-only and immutable.** Publishing a slug that already exists **bumps to `latest + 1`** — it never overwrites. A name that slugifies to an existing skill silently creates the next version of *that* skill. So run Workflow A first; to update intentionally, match the existing name exactly.
- **You cannot overwrite a gloria.dev system skill.** Orgs ship pre-seeded with read-only system skills (author `gloria.dev`); if your name slugifies to one, `publish_skill` returns **`409`** and creates nothing. Pick a distinct name rather than trying to shadow a seeded skill.
- **`publish_skill` requires admin (`settings:manage`)** — it returns `403` otherwise. A malformed bundle returns `422`.
- It publishes to your **active organization**. If the account spans orgs, confirm the right one first (`get_info`).

## Workflow C — Installing an external marketplace skill

When `search_skills` returns a skill whose `source` is `marketplace:<id>`, you **cannot** `get_skill` it — gloria never serves external content. Install it through the host agent's native marketplace instead:

1. **Discover & branch on source.** `search_skills` for the task. If the best match has a `source` of `marketplace:<id>`, take its `marketplace` (id), `plugin`, and `supportedAgents` from the summary. (`org`/`gloria.dev` skills use `get_skill` as usual.)
2. **Detect the host agent.** Determine whether you are running in **Claude Code** or **codex** — that is the `agent` you pass next. Confirm it's in the skill's `supportedAgents`; if not, tell the user this marketplace doesn't support their agent.
3. **Get the native commands.** Call `install_skill { marketplace, agent, slug }` (or pass `plugin` instead of `slug`). It returns `commands[]` — the exact subscribe/install steps for that agent — and the installing `plugin`. It never returns files.
4. **Run the commands in the host agent.** Execute each returned command in order (e.g. Claude Code: `/plugin marketplace add <owner>/<repo>` then `/plugin install <plugin>@<repo>`; codex: `codex plugin marketplace add <owner>/<repo>` then install via `/plugins`). Restate that this installs the **whole plugin** `<plugin>`, which may bundle more skills than the one searched.
5. **Confirm the plugin-level install.** After the agent reports success, confirm the plugin (and its skills) loaded — reload plugins if the agent requires it.

`list_marketplaces` shows which marketplaces the org subscribes to and their sync status; a marketplace still `syncing` may not list all its skills yet.

## Common Mistakes

- Authoring a skill without searching the library first → duplicate skills.
- Searching once with one phrase and concluding "none exists" — the substring query matches only name/description; try synonyms, filter by `tags`, or list all.
- Forgetting `tags:` frontmatter when publishing — the skill then only surfaces on a name/description substring hit, never on a tag filter.
- Expecting `publish_skill` to overwrite or let you pick a slug — it appends a version and derives the slug from the name.
- Trying to republish over a gloria.dev system skill — it returns `409` and writes nothing; choose a distinct name.
- Calling `get_skill` on an external (`marketplace:<id>`) skill — it returns `409`; gloria never serves external content, so use `install_skill` and run the native commands.
- Pasting an `install_skill` command into the wrong agent — the commands are per-agent; pass the `agent` you're actually running in, and only if it's in the skill's `supportedAgents`.
- Forgetting that installing an external skill installs its **whole plugin** — restate the `plugin` so the user knows what else it brings.
- Calling these tools without loading them first — they're deferred; `ToolSearch` for `gloria skill`.
