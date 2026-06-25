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

**Then sync the inventory to gloria.dev** (the monitoring product) via its MCP server so the dependencies are watched continuously — see [Syncing the inventory to gloria.dev](#syncing-the-inventory-to-gloriadev-mcp-server). This is a **required final step**, not optional: once the four Markdown docs exist, push the structured inventory (and the docs) so monitoring actually starts. The organization is taken from your authenticated gloria.dev session — you never supply or ask for an org slug. The only time you stop at the Markdown docs is when the gloria.dev MCP server isn't connected in your environment; say so explicitly.

## Classification Rule (the most important step)

This decides which file every system lands in — but first apply the **inclusion gate**: most false positives come from inventorying things the app never actually calls.

### Inclusion gate — does it count at all?

Only inventory a service the application makes a **live outbound network connection to at runtime** — an actual request the app sends (or, for infrastructure, a live connection/binding it reads or writes). Require **evidence of a call**, not merely a dependency in the manifest: a base URL that is fetched, an SDK/client that is instantiated **and invoked**, a DSN/connection that is opened.

Do **not** inventory:

- **Libraries used purely locally** — signature verification, parsing, schema/codegen, crypto, formatting. A vendor's package in `package.json` / `go.mod` is **not** evidence of an outbound connection. _Example: a webhook library like **Svix** used only to **verify** an inbound webhook's signature — the app never calls `svix.com`, so Svix is **not** a dependency. The webhook **sender** (e.g. Clerk) is, if the app calls it elsewhere._
- **Inbound-only relationships** — if a third party calls **you** (an inbound webhook/callback) and you never call **them**, they are not an outbound dependency. Note the inbound event under a sender you do call, but don't list a service you only receive from.
- **Transitive / vendored code** the app never reaches over the network itself.

When in doubt, **trace the call** to where the URL is actually requested or the client method actually invoked. No outbound call found → it does not belong in the inventory; say so rather than listing it.

### External vs. internal

- **External SaaS** = a **third-party product the app consumes as a customer**, hosted on a **different domain than the application**, with a **publicly addressable URL** (e.g. `api.github.com`, `slack.com`, `api.openai.com`).
- **Internal** = anything reached via `localhost`, a **private IP** (10./172.16./192.168.), a **link-local** address (169.254.), an **internal-only AWS endpoint** (Bedrock internal URLs, ECS task metadata), the application's **own services**, an **infrastructure component** regardless of address (**databases, caches, search engines, message queues, LLM gateways**), OR a **first-party service of the app's own hosting/cloud platform** — the provider the app deploys on and its built-in managed services for storage, secrets, config, compute, encryption, and logging.

**First-party platform services are internal even when reached over the provider's public API.** Identify the app's host platform first (Cloudflare Workers, AWS/ECS/Lambda, GCP, Azure, Vercel, Fly.io, …); its own managed services are infrastructure, not third-party SaaS, regardless of the URL they're reached at:

- **AWS app** → S3, KMS, Secrets Manager, CloudWatch, Bedrock, SQS — internal (whether via an IAM-role/in-VPC endpoint **or** the public AWS API).
- **Cloudflare app** → D1, R2, KV, Queues, **Secrets Store**, Workers AI — internal **even when called via `https://api.cloudflare.com/client/v4/...`**. That host is Cloudflare's control plane for *your own* resources; managing your own secret store there is the Cloudflare counterpart of AWS Secrets Manager (which this skill already treats as internal), not a third-party API you're a customer of.
- **GCP / Azure / Vercel / Fly.io / …** → the same: the platform's own datastore, secret, storage, and queue services are internal.

The deciding question is **ownership, not URL**: are you calling the **management/control plane of a resource that belongs to you on your own platform** (→ internal), or a **separate product you're a customer of** (→ external)? A public, different-domain URL alone does **not** make something external — `api.cloudflare.com` for *your* secret store is internal; `api.stripe.com` for Stripe's product is external. When a single managed cloud genuinely has both faces (a product you also consume independently of your own deployment), split it and note the ambiguity; otherwise classify by ownership and by _how the app reaches it in production_.

## Process

1. **Find candidates.** Search the codebase for: SDK/client imports, base-URL constants, OAuth/webhook handlers, env vars that look like endpoints or credentials (`*_URL`, `*_BASE_URL`, `*_API_KEY`, `*_TOKEN`, `*_DSN`), `docker-compose`/IaC files, and config loaders. Use parallel search agents for breadth.
2. **Apply the inclusion gate.** For each candidate, confirm the app makes a **live outbound call** to it (trace to the actual request/client invocation). Drop locally-used libraries and inbound-only senders — an import is not a call.
3. **For each surviving service, capture:** purpose (how the app uses it), the **exact URL(s)/host(s)** the app calls, the **auth mechanism** and the **env var(s)** that hold credentials and config, and whether it's runtime vs. CI/dev-only.
4. **Classify** each per the rule above.
5. **Write the two inventory docs**, then the two health-check docs (one probe per service, in the same section order as its inventory).
6. **Sync to gloria.dev** — register the project and push every dependency (and the four docs) via the MCP server, per [Syncing the inventory to gloria.dev](#syncing-the-inventory-to-gloriadev-mcp-server). Required whenever that server is connected.
7. Report what you found and any classification calls you made — including candidates you **excluded** by the inclusion gate (e.g. local-only libraries) and why, plus what you synced.

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

gloria.dev runs a remote **MCP server** that lets a coding agent push the inventory you produced into your gloria.dev organization, where the web service monitors each dependency. Syncing is the **required final step** of this skill whenever the server is connected — it complements, it does not replace, the four Markdown docs.

**Connection.** Point your MCP client at `https://mcp.gloria.dev/mcp` (Streamable HTTP). Auth is **Clerk OAuth** — the client does the handshake; you act as the already-authenticated user. **The organization is your session's active org — no tool takes an `orgSlug`, and you never ask for or guess one.** Your session role governs access (reads need `inventory:read`, writes need `inventory:write`). If the session has no active organization, the server returns an error telling you to select one — surface that to the user rather than working around it.

**Data model.** An **organization** contains **projects**; each project has a **dependency inventory**. The dependency model mirrors this skill's own classification exactly: external SaaS ↔ `kind: "external_saas"`, internal system ↔ `kind: "internal_system"`.

### Tools

All tools act on your session's active org; none take an `orgSlug`.

| Tool                 | Args                                  | Does                                                            | Perm              |
| -------------------- | ------------------------------------- | -------------------------------------------------------------- | ----------------- |
| `get_info`           | `{}`                                  | Return org `{ id, name, slug }`. Use as an access sanity check. | `inventory:read`  |
| `list_projects`      | `{}`                                  | List the org's projects.                                        | `inventory:read`  |
| `register_project`   | `{ project }`                         | Upsert a project by slug.                                       | `inventory:write` |
| `list_dependencies`  | `{ projectSlug }`                     | List a project's dependencies as summaries.                    | `inventory:read`  |
| `get_dependency`     | `{ projectSlug, slug }`               | Return one dependency's full detail.                           | `inventory:read`  |
| `put_dependency`     | `{ projectSlug, dependency }`         | Upsert one dependency by slug. Project must already exist.      | `inventory:write` |
| `delete_dependency`  | `{ projectSlug, slug }`               | Remove a dependency by slug. Idempotent (missing = success).    | `inventory:write` |
| `put_document`       | `{ projectSlug, document }`           | Upsert a Markdown doc by name. Project must already exist.      | `inventory:write` |

### Payload shapes

All `slug` fields are **kebab-case** (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

`project`:

```jsonc
{ "slug": "acme-api", "name": "Acme API", "description": "…", "repoUrl": "https://github.com/acme/api" } // repoUrl optional
```

`slug` and `name` are required; `description` and `repoUrl` are optional. `description` is **backfilled from what you learned while exploring** (a one-or-two-sentence summary of what the project is and does) when the project has none — but an existing non-empty description is **never overwritten without the user's consent**. See [Resolving the project](#resolving-the-project).

`dependency` is a discriminated union on `kind`. Shared fields plus a `kind`-specific `details`:

```jsonc
{
  "kind": "external_saas",          // or "internal_system"
  "slug": "github",
  "name": "GitHub",
  "category": "git_hosting",        // enum, see below
  "purpose": "How the app uses it.",
  "endpoints": [{ "label": "REST API", "url": "https://api.github.com" }],
  "details": { /* kind-specific, see below */ },
  "healthCheck": { /* optional probe gloria.dev runs on a schedule — pick the TYPE from how the code uses the service; see "Choosing the embedded health-check probe" */ }
}
```

- `category` ∈ `auth_identity`, `git_hosting`, `issue_tracking`, `communication`, `cloud_storage`, `llm_ai`, `observability`, `datastore`, `llm_gateway`, `aws_platform`, `app_service`, `dev_tooling`. No "other" — pick the closest. `aws_platform` is the bucket for **any** hosting platform's first-party managed services (despite the AWS-specific name) — a Cloudflare D1/R2/KV/Queues/Secrets Store or a GCP/Azure equivalent goes here too. (A platform-native datastore may instead use `datastore` when that fits better; either way it stays an `internal_system`.)
- **external_saas** `details`: `{ "webhooks": [{ "event": "push", "direction": "inbound" }], "provider"?: "github" }`. `webhooks` is **required** — send `[]` when there are none.
- **internal_system** `details`: `{ "reachability": "vpc_internal", "addressEnv"?: "DATABASE_URL" }`. `reachability` ∈ `public`, `vpc_internal`, `link_local`, `in_task_only`, `localhost_dev`.
- `healthCheck` is **optional** and is a **discriminated union on `type`**. Choose the `type` from **how the application reaches the service** — see [Choosing the embedded health-check probe](#choosing-the-embedded-health-check-probe). Defaults across every type: `enabled: true`, `timeoutMs: 5000`.

`details` is **strict** — unknown fields are rejected, not ignored. Non-HTTP probe detail you can't model in the embedded probe (TCP `nc` checks, `aws sts`/CLI auth, JSON-body `ok`-field checks, header styles the probe types below don't cover) still belongs **only** in the Markdown docs. `details` has **no slot for auth mechanism / credential env vars** (beyond an internal system's `addressEnv` name) and **no runtime-vs-CI flag** — don't try to smuggle that into `details` or into `healthCheck`.

### Choosing the embedded health-check probe

The embedded probe is **not always unauthenticated** — that was the old model. **Read how the app authenticates to the service, then pick the matching probe type.** An unauthenticated probe against a resource that requires credentials is a defect: it either can't see the real resource or returns a misleading status (a `401`/`404` reads as "up" to a probe that never sent a token), so the dependency looks healthy when your actual access is broken.

The probe types an agent can sync through MCP are:

| `type`          | Auth                | Fields (beyond the `enabled` / `timeoutMs` defaults)                                  | Use when                                                                                  |
| --------------- | ------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `"http"`        | **none**            | `url` (required); `method` (`GET`\|`HEAD`\|`POST`, default `GET`); `expectedStatus` (default `{min:200,max:299}`) | The service has a genuinely **public** liveness endpoint that returns a meaningful up/down with **no credentials** — a public `/health`, status page, or unauthenticated API root. |
| `"http-bearer"` | **Bearer token**    | same as `http`, plus `token` (a secret — see below)                                   | The endpoint the app actually uses requires a **`Authorization: Bearer …`** token (private resource, token-gated API). |

**The selection rule:** if hitting the endpoint the app relies on *without* a credential would not prove your access works, do **not** use `"http"`. Use `"http-bearer"` against an authenticated endpoint and declare the token as a secret. _Example: a **private** GitHub repo. `https://api.github.com/zen` is public, so an `http` probe there only proves GitHub-the-service is up — it says nothing about whether your token can still reach the repo. Probe `https://api.github.com/repos/OWNER/REPO` (or `/user`) with `type: "http-bearer"` so a revoked/expired token surfaces as a real failure._

**Declaring the token (and never the value).** In `http-bearer`, set `token` to a bare secret **declaration** — `{ "kind": "secret", "hint": "GitHub PAT" }` — and nothing else. The agent **never** transmits a secret value, ref, or `configured` flag; strict validation rejects a stray `value`/`ref`/`configured`. gloria.dev mints the ref server-side, the user enters the value on the project's Configure-secrets page (the tool returns a `configUrl` deep-linked to the dependency), and the runner resolves it at probe time. Until the value is entered the dependency sits in `needs_config` and is not probed — that's expected, not a failure. (You *may* instead pass a literal `{ "kind": "literal", "value": "…" }` token, but **don't** — that hard-codes a secret; always declare it.)

**When neither type fits.** Some services authenticate in a way the embedded probe can't model: an **API-key header** (`x-api-key`, `PRIVATE-TOKEN`), **HTTP Basic**, **AWS SigV4**, or a vendor **SDK** call, and non-HTTP datastores (TCP-only). For those, **omit `healthCheck`** rather than emitting a misleading unauthenticated `http` probe, keep the authenticated probe in the Markdown health-check doc, and tell the user that gloria.dev offers a **dedicated authenticated connector** they can attach in the web UI (the platform ships connectors for GitHub, GitLab, Bitbucket, OpenAI, Anthropic, Notion, Linear, Slack, Clerk, Atlassian/Jira, and AWS STS/KMS/Bedrock/CloudWatch Logs/Secrets Manager, each running a real authenticated probe). The agent-sync path emits `http`/`http-bearer`; richer connectors are a web-UI upgrade.

`document` (for `put_document`):

```jsonc
{ "name": "EXTERNAL_SAAS", "markdown": "# External SaaS\n…" } // name = file basename WITHOUT `.md`
```

`name` is a single safe path segment (alphanumeric ends, inner `.`/`_`/`-` allowed, no `/`); it becomes the R2 key `docs/<orgId>/<projectSlug>/<name>.md`, which is exactly what the project page renders. `document` is also `.strict()`. This is how the four Markdown docs (including the health-check ones) reach gloria.dev — the server **stores** them, it never **runs** the probes.

### Workflow

1. `get_info()` to confirm access and that your session has an active org (cheap sanity check). A no-active-org error here is what you surface to the user.
2. **Resolve the project** (identify → match → describe) before any `put_dependency` / `put_document`, both of which require the project to exist. See [Resolving the project](#resolving-the-project) below.
3. `put_dependency` once per dependency from both inventory docs — map external SaaS → `external_saas`, internal systems → `internal_system`. Reusing the doc's section/category for `category`, the captured URLs for `endpoints`, and the classification's reachability for internal `details`. Attach a `healthCheck` whose **`type` matches how the app reaches the service** — `http` for a genuinely public liveness endpoint, `http-bearer` (token declared as a secret) when reaching the real resource needs a Bearer token, and **no** `healthCheck` when the auth style fits neither (see [Choosing the embedded health-check probe](#choosing-the-embedded-health-check-probe)). The gloria.dev web service runs the check on a schedule. Don't disable a check — disabling is a user action in the web UI.
4. `put_document` once per Markdown doc (`EXTERNAL_SAAS`, `EXTERNAL_SAAS_HEALTHCHECKS`, `INTERNAL_SYSTEMS`, `INTERNAL_SYSTEMS_HEALTHCHECKS`) so the rendered docs show on the project page alongside the structured inventory.
5. Use `list_dependencies` / `get_dependency` to verify, `delete_dependency` to prune.

### Resolving the project

`register_project` is an **upsert keyed by slug**, so it both creates a missing project and updates an existing one. Don't call it blindly — first work out *which* project this codebase is, and never clobber a description a human may have edited. Three phases:

**1. Identify (from the git remote, with fallback).** Read `origin`'s URL.

- **Has a remote:** `repoUrl` = that URL normalized to `https://…/owner/repo` (strip a trailing `.git`); `slug` = the kebab-cased repo basename (lowercase, every non-alphanumeric run → a single `-`, trimmed — must satisfy `^[a-z0-9]+(?:-[a-z0-9]+)*$`); `name` = the humanized basename (e.g. `gloria-dev` → "Gloria Dev").
- **No remote:** derive `slug` / `name` from the working-directory name the same way; omit `repoUrl`.

**2. Match (slug first, `repoUrl` fallback).** Call `list_projects()`, then:

- A project whose `slug` equals the derived slug → **that's the project** (exists).
- Else, if the derived `repoUrl` is non-empty and some project's `repoUrl` equals it → **that's the project** (exists). The slug differs, so **keep using the existing project's slug** for every later call — don't fork a duplicate.
- Else → **create**: `register_project` with the derived `slug` / `name` / `repoUrl`, silently (it's an idempotent upsert).
- **Ambiguity:** if the slug matches one project but `repoUrl` matches a *different* one, prefer the **slug** match (it's the upsert key) and note the ambiguity in your final report — don't guess or create a third.

**3. Describe (backfill, or update only with consent).** Look at the resolved project's `description`:

- **Just created, or existing with an empty/absent description** → write a **one-or-two-sentence** description (what the project *is* and does, drawn from what you learned while exploring — README, manifests, the dependency picture you just built) and set it. Backfill silently.
- **Existing with a non-empty description** → **do not overwrite it silently.** Show the user the current description and your freshly-generated one and **ask whether to replace**; update only on consent. If you can't ask (non-interactive run), leave the existing description and note it in your report.

When setting/updating the description on a project that already has a `name` / `repoUrl`, send those alongside `description` in the `register_project` call so the upsert doesn't blank them.

`register_project`, `put_dependency`, and `put_document` are **upserts keyed by slug/name**, so re-running them after the code changes keeps the inventory current — that's the intended way to resync.

## Anti-patterns

- ❌ Executing the probes or blocking on missing credentials. Document only.
- ❌ Putting databases, caches, or LLM gateways in the external doc because they have a hostname — infrastructure is internal.
- ❌ Putting the app's **own hosting platform's first-party services** in the external doc because they're reached over a public API. _Example: a Cloudflare Workers app managing its secrets via `https://api.cloudflare.com/client/v4/accounts/.../secrets_store/...` — that's Cloudflare's control plane for **your own** Secrets Store (the Cloudflare counterpart of AWS Secrets Manager), so it's **internal**, not external SaaS. Classify platform services by **ownership**, not by whether the URL is public._
- ❌ Listing a service the app never calls outbound — a library used only locally (e.g. verifying an inbound webhook's signature, like Svix) or an inbound-only sender. Require evidence of an actual outbound request; an import or manifest entry is not enough.
- ❌ Inventing endpoints. Every URL, auth header, and env var must come from the codebase; if you can't find one, say so rather than guessing.
- ❌ Skipping the Mermaid diagrams or the cross-links between docs.
- ❌ Hard-coding secrets into samples instead of env vars.
- ❌ Treating the gloria.dev sync as optional, or skipping it when the MCP server is connected — pushing the inventory is a required final step.
- ❌ Asking for or passing an `orgSlug` — no tool takes one; the org comes from your authenticated session. If the session has no active org, surface the server's error instead of guessing.
- ❌ Calling `put_dependency` or `put_document` before `register_project` for that project, or adding fields the `details` / `document` schema doesn't define (auth keys, runtime flags) — strict validation rejects them.
- ❌ Emitting an unauthenticated `type: "http"` probe against a resource that requires credentials — a private GitHub repo, any endpoint that `401`s without a token. The probe reads `401`/`404` as "up" and the dependency looks healthy while your real access is broken. Use `type: "http-bearer"` with the token declared as a secret, or omit `healthCheck` and rely on a web-UI connector. _Match the probe type to how the code authenticates._
- ❌ Putting a secret **value**, `ref`, or `configured` flag in a `http-bearer` token — declare only `{ "kind": "secret", "hint": "…" }`; the value is entered by the user in the web UI, never transmitted by the agent.
- ❌ Overwriting an existing (possibly human-edited) project description without asking — backfill only when it's empty; otherwise get the user's consent.
- ❌ Creating a duplicate project when one already exists under a different slug but the same `repoUrl` — match on `repoUrl` and reuse the existing project's slug.
- ❌ Leaving a freshly-created or empty project with no description when your exploration yielded enough to write a one-or-two-sentence summary.
- ❌ Expecting an MCP tool that *runs* health checks — the server stores the inventory and the Markdown docs (via `put_document`), but it never executes the curl probes.

## Reference Examples

The four docs in the gloria.dev project (`EXTERNAL_SAAS.md`, `EXTERNAL_SAAS_HEALTHCHECKS.md`, `INTERNAL_SYSTEMS.md`, `INTERNAL_SYSTEMS_HEALTHCHECKS.md`) are canonical examples of the target format. The original prompts that produced them are in `gloria-prompts.example.md`.
