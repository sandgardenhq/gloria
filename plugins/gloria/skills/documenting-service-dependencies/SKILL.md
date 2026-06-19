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

## Anti-patterns

- ❌ Executing the probes or blocking on missing credentials. Document only.
- ❌ Putting databases, caches, or LLM gateways in the external doc because they have a hostname — infrastructure is internal.
- ❌ Inventing endpoints. Every URL, auth header, and env var must come from the codebase; if you can't find one, say so rather than guessing.
- ❌ Skipping the Mermaid diagrams or the cross-links between docs.
- ❌ Hard-coding secrets into samples instead of env vars.

## Reference Examples

The four docs in the gloria.dev project (`EXTERNAL_SAAS.md`, `EXTERNAL_SAAS_HEALTHCHECKS.md`, `INTERNAL_SYSTEMS.md`, `INTERNAL_SYSTEMS_HEALTHCHECKS.md`) are canonical examples of the target format. The original prompts that produced them are in `gloria-prompts.example.md`.
