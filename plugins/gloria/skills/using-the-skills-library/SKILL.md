---
name: using-the-skills-library
description: Use when about to author a new agent skill, when asked whether the org already has a skill for some task, or when sharing/publishing a reusable skill across the organization — drives the gloria.dev skills-library tools (search before you duplicate, get the full bundle, publish immutable versions org-wide).
---

# Using the Skills Library

## Overview

Your gloria.dev organization has a **versioned, org-wide skills library**. Before you write a new agent skill, check whether one already exists; when you build a reusable one, publish it so every project in the org can use it.

These four tools live on the **gloria** MCP server and are **deferred** — they will not appear until you load them. Run `ToolSearch` with `gloria skill` (or `select:` the exact names) before calling them.

**Core principle: search before you author. Publish to share.**

## When to Use

- You're about to write a new skill — **first** confirm the org doesn't already have one.
- Someone asks "do we have a skill for X?" / "is there an existing skill that…".
- You finished a reusable skill locally and want the whole org to use it.
- You need to update a published skill, or inspect its version history.

Not for project-only conventions (those go in `CLAUDE.md`) or one-off local skills.

## The Tools

| Tool | Use | Requires | Returns |
|------|-----|----------|---------|
| `search_skills` | Find an existing skill | `query` (optional substring) and/or `tags` (optional `string[]`) — omit both to list all | Summaries: slug, name, description, latest version, `tags`, author, updated-at |
| `get_skill` | Read a full bundle | `slug` (+ optional `version`) | SKILL.md + all supporting files (latest, or the version asked) |
| `list_skill_versions` | Inspect history | `slug` | Versions newest-first: name, description, content hash, author, timestamp |
| `publish_skill` | Create / update a skill | `files[]` (each `{path, content}`) | `{ slug, name, version, contentHash }` |

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

## Common Mistakes

- Authoring a skill without searching the library first → duplicate skills.
- Searching once with one phrase and concluding "none exists" — the substring query matches only name/description; try synonyms, filter by `tags`, or list all.
- Forgetting `tags:` frontmatter when publishing — the skill then only surfaces on a name/description substring hit, never on a tag filter.
- Expecting `publish_skill` to overwrite or let you pick a slug — it appends a version and derives the slug from the name.
- Trying to republish over a gloria.dev system skill — it returns `409` and writes nothing; choose a distinct name.
- Calling these tools without loading them first — they're deferred; `ToolSearch` for `gloria skill`.
