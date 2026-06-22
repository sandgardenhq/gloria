---
name: documenting-service-dependencies
description: Use when you need to map and document a codebase's service dependencies — produces four Markdown docs (external SaaS inventory + health checks, internal systems inventory + health checks) each with a summary table, Mermaid diagrams, per-service detail, and copy-paste health-check commands. Triggers include "document our integrations/dependencies", "what external services does this connect to", "make a health-check doc".
---

# Documenting Service Dependencies

## Overview

Scan a codebase for every system it talks to, classify each as **external SaaS** or **internal system**, and write four Markdown documents:

| File                               | Contents                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `EXTERNAL_SAAS.md`                 | Inventory of third-party SaaS reached over the public internet                                      |
| `EXTERNAL_SAAS_HEALTHCHECKS.md`    | An up/down probe for each service in `EXTERNAL_SAAS.md`                                             |
| `INTERNAL_SYSTEMS.md`              | Inventory of internal systems (datastores, gateways, AWS platform services, the app's own services) |
| `INTERNAL_SYSTEMS_HEALTHCHECKS.md` | An up/down probe for each system in `INTERNAL_SYSTEMS.md`                                           |

Generate **all four by default**. Cross-link them (each inventory links to its health-check doc and vice versa; the two inventories link to each other).

**Document only — never execute the health-check commands.** Write them from code evidence (endpoints, auth headers, env vars). Do not run them or require live credentials.

**Optionally sync the inventory to gloria.dev** (the monitoring product) via its MCP server so the dependencies are watched continuously. This is a separate, opt-in step — see [Syncing the inventory to gloria.dev](#syncing-the-inventory-to-gloriadev-mcp-server). The four Markdown docs are still the primary deliverable; only sync when the user asks to register/push the inventory.

## Classification Rule (the most important step)

This single decision determines which file every system lands in.

- **External SaaS** = hosted on a **different domain than the application**, with a **publicly addressable URL** (e.g. `api.github.com`, `slack.com`, `api.openai.com`).
- **Internal** = anything reached via `localhost`, a **private IP** (10./172.16./192.168.), a **link-local** address (169.254.), an **internal-only AWS endpoint** (Bedrock internal URLs, ECS task metadata), the application's **own services**, OR an **infrastructure component** regardless of address — **databases, caches, search engines, message queues, LLM gateways**.

When a managed cloud has both faces, split it: a public console/API URL → external; an in-VPC or platform endpoint (S3 via IAM role, KMS, Secrets Manager, CloudWatch, Bedrock) → internal. When unsure, classify by _how the app reaches it in production_ and note the ambiguity.

## Process

1. **Find services.** Search the codebase for: SDK/client imports, base-URL constants, OAuth/webhook handlers, env vars that look like endpoints or credentials (`*_URL`, `*_BASE_URL`, `*_API_KEY`, `*_TOKEN`, `*_DSN`), `docker-compose`/IaC files, and config loaders. Use parallel search agents for breadth.
2. **For each service, capture:** purpose (how the app uses it), the **exact URL(s)/host(s)** the app calls, the **auth mechanism** and the **env var(s)** that hold credentials and config, and whether it's runtime vs. CI/dev-only.
3. **Classify** each per the rule above.
4. **Write the two inventory docs**, then the two health-check docs (one probe per service, in the same section order as its inventory).
5. Report what you found and any classification calls you made.

## Inventory Document Structure

Each inventory doc (`EXTERNAL_SAAS.md`, `INTERNAL_SYSTEMS.md`) has:

1. **Intro** — one paragraph on what the doc covers and what it deliberately excludes; link to the sibling inventory.
2. **A `> Notes` blockquote** for caveats (runtime vs CI-only, dev defaults vs prod env vars).
3. **`## Architecture`** — a short prose explanation, then a **Mermaid `flowchart`** showing the app's components and how they reach each system (group services into `subgraph`s by category; show inbound webhooks/events with dotted `-.->` edges). Add a small `sequenceDiagram` if an interaction pattern recurs.
4. **Category sections** (`## Authentication & Identity`, `## Git Hosting`, `## Data Stores`, `## LLM / AI`, `## AWS Platform Services`, etc.) — each a **table**. External tables: `| Service | Purpose | Primary URL(s) |`. Internal tables: `| System | Purpose | Address / Config | Auth |` (Address / Config names the env var and its dev default).
5. **A trailing `## Development / Test Only` or `## Local Dev Emulators`** section for non-production dependencies.

Bold service names. Put endpoints and env vars in `` `code` ``.

## Health-Check Document Structure

Each health-check doc (`EXTERNAL_SAAS_HEALTHCHECKS.md`, `INTERNAL_SYSTEMS_HEALTHCHECKS.md`) has:

1. **Intro** — state that it covers every service in the matching inventory and links to it; emphasize each probe **hits and authenticates against the real endpoint the application uses**, parameterized by env vars so it's portable.
2. **`## How to read the result`** — a status-interpretation table:

   | Result                                     | Meaning                                  |
   | ------------------------------------------ | ---------------------------------------- |
   | `2xx`                                      | **Up** — reachable and credentials valid |
   | `401` / `403`                              | Up, but credentials invalid/expired      |
   | `404`                                      | Up, but the target resource is wrong     |
   | `429` / `5xx`                              | Reachable, but rate-limited or erroring  |
   | connection refused / DNS failure / timeout | **Down / unreachable**                   |

3. **One subsection per service**, in the same category order as the inventory. Each: a one-line note on what the probe does, then a fenced code sample.

### Health-check command rules

- Default form prints the HTTP status: `curl -sS -o /dev/null -w '%{http_code}\n' ...`.
- Authenticate exactly as the app does (same header style: `Authorization: Bearer`, `x-api-key`, `PRIVATE-TOKEN`, basic auth, raw key, etc.) and hit a cheap "whoami"/list/`/models`/`/health` endpoint.
- Reference credentials and bases via env vars (`$GITHUB_TOKEN`, `${BASE_URL:-default}`), never hard-coded secrets.
- Handle special cases explicitly: APIs that always return `200` (check a JSON `ok` field with `grep`); CLI-only auth (`aws sts get-caller-identity`, `az ...`); session-token tools with no REST probe (start-and-teardown); TCP-only liveness fallback with `nc -z -w3 host port` for datastores and gateways.
- For internal targets, add a note that private-IP/link-local addresses are only reachable from inside the network/task.

## Syncing the inventory to gloria.dev (MCP server)

gloria.dev runs a remote **MCP server** that lets a coding agent push the inventory you produced into a gloria.dev organization, where the web service monitors each dependency. Use it only when the user asks to register/sync/push the inventory — it does not replace the four Markdown docs.

**Connection.** Point your MCP client at `https://mcp.gloria.dev/mcp` (Streamable HTTP). Auth is **Clerk OAuth** — the client does the handshake; you act as the already-authenticated user. Every tool takes an `orgSlug`, and you must be a member of that org (reads need `inventory:read`, writes need `inventory:write`). If the user hasn't given an org slug, ask — don't guess.

**Data model.** An **organization** contains **projects**; each project has a **dependency inventory**. The dependency model mirrors this skill's own classification exactly: external SaaS ↔ `kind: "external_saas"`, internal system ↔ `kind: "internal_system"`.

### Tools

| Tool                 | Args                                                              | Does                                                            | Perm              |
| -------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | ----------------- |
| `get_info`           | `{ orgSlug }`                                                    | Return org `{ id, name, slug }`. Use as an access sanity check. | `inventory:read`  |
| `list_projects`      | `{ orgSlug }`                                                    | List the org's projects.                                        | `inventory:read`  |
| `register_project`   | `{ orgSlug, project }`                                           | Upsert a project by slug.                                       | `inventory:write` |
| `list_dependencies`  | `{ orgSlug, projectSlug }`                                       | List a project's dependencies as summaries.                    | `inventory:read`  |
| `get_dependency`     | `{ orgSlug, projectSlug, slug }`                                 | Return one dependency's full detail.                           | `inventory:read`  |
| `put_dependency`     | `{ orgSlug, projectSlug, dependency }`                          | Upsert one dependency by slug. Project must already exist.      | `inventory:write` |
| `delete_dependency`  | `{ orgSlug, projectSlug, slug }`                                 | Remove a dependency by slug. Idempotent (missing = success).    | `inventory:write` |

### Payload shapes

All `slug` fields are **kebab-case** (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

`project`:

```jsonc
{ "slug": "acme-api", "name": "Acme API", "description": "…", "repoUrl": "https://github.com/acme/api" } // repoUrl optional
```

`dependency` is a discriminated union on `kind`. Shared fields plus a `kind`-specific `details`:

```jsonc
{
  "kind": "external_saas",          // or "internal_system"
  "slug": "github",
  "name": "GitHub",
  "category": "git_hosting",        // enum, see below
  "purpose": "How the app uses it.",
  "endpoints": [{ "label": "REST API", "url": "https://api.github.com" }],
  "details": { /* kind-specific, see below */ }
}
```

- `category` ∈ `auth_identity`, `git_hosting`, `issue_tracking`, `communication`, `cloud_storage`, `llm_ai`, `observability`, `datastore`, `llm_gateway`, `aws_platform`, `app_service`, `dev_tooling`. No "other" — pick the closest.
- **external_saas** `details`: `{ "webhooks": [{ "event": "push", "direction": "inbound" }], "provider"?: "github" }`. `webhooks` is **required** — send `[]` when there are none.
- **internal_system** `details`: `{ "reachability": "vpc_internal", "addressEnv"?: "DATABASE_URL" }`. `reachability` ∈ `public`, `vpc_internal`, `link_local`, `in_task_only`, `localhost_dev`.

`details` is **strict** — unknown fields are rejected, not ignored. The schema deliberately has **no slot for auth mechanism / credential env vars** (beyond an internal system's `addressEnv` name), **no runtime-vs-CI flag**, and **no health-check commands**. Keep that richer detail in the Markdown docs; don't try to smuggle it into `details`.

### Workflow

1. `get_info({ orgSlug })` to confirm access (optional but cheap).
2. `register_project` once for the project.
3. `put_dependency` once per dependency from both inventory docs — map external SaaS → `external_saas`, internal systems → `internal_system`. Reusing the doc's section/category for `category`, the captured URLs for `endpoints`, and the classification's reachability for internal `details`.
4. Use `list_dependencies` / `get_dependency` to verify, `delete_dependency` to prune.

`register_project` and `put_dependency` are **upserts keyed by slug**, so re-running them after the code changes keeps the inventory current — that's the intended way to resync.

## Anti-patterns

- ❌ Executing the probes or blocking on missing credentials. Document only.
- ❌ Putting databases, caches, or LLM gateways in the external doc because they have a hostname — infrastructure is internal.
- ❌ Inventing endpoints. Every URL, auth header, and env var must come from the codebase; if you can't find one, say so rather than guessing.
- ❌ Skipping the Mermaid diagrams or the cross-links between docs.
- ❌ Hard-coding secrets into samples instead of env vars.
- ❌ Syncing to gloria.dev unprompted, or inventing an `orgSlug` — it's an opt-in step and the org must be supplied.
- ❌ Calling `put_dependency` before `register_project` for that project, or adding fields the `details` schema doesn't define (auth keys, runtime flags) — strict validation rejects them.
- ❌ Expecting an MCP tool for health checks — the server syncs the inventory only; the curl probes live solely in the Markdown docs.

## Reference Examples

The four docs in the gloria.dev project (`EXTERNAL_SAAS.md`, `EXTERNAL_SAAS_HEALTHCHECKS.md`, `INTERNAL_SYSTEMS.md`, `INTERNAL_SYSTEMS_HEALTHCHECKS.md`) are canonical examples of the target format. The original prompts that produced them are in `gloria-prompts.example.md`.
