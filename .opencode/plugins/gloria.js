import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The bundled skills live at the repo root /skills, two levels up from this
// plugin file — in both the monorepo (dev) and the published package.
const skillsDir = path.resolve(__dirname, "../../skills")

// Stamped at publish time by .github/workflows/publish-marketplace.yml — the
// source tree always reads "DEV", exactly like check-plugin-version's hook.
const INSTALLED_VERSION = "0.2.1"
const LATEST_VERSION_URL = "https://gloria.dev/api/plugin-version"

// Local, dependency-free comparison for this repo's simple `x.y.z` versions
// (no npm semver package is used anywhere in this repo). The unstamped "DEV"
// placeholder (the source-tree value before publish-time stamping) always
// compares as lower than any real version, so it always nudges.
function compareVersions(a, b) {
  if (a === "DEV" && b === "DEV") return 0
  if (a === "DEV") return -1
  if (b === "DEV") return 1

  const partsA = a.split(".").map(Number)
  const partsB = b.split(".").map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  return 0
}

export function formatVersionNudge(installedVersion, latestVersion) {
  if (compareVersions(installedVersion, latestVersion) >= 0) return null
  return `The gloria.dev plugin is out of date (installed ${installedVersion}, latest ${latestVersion}). Update it, then start a new session.`
}

/**
 * Mutate an OpenCode config object to wire up gloria.dev: register the bundled
 * skills directory and the remote gloria.dev MCP server. Idempotent and
 * non-clobbering — a user-defined gloria MCP entry wins.
 */
export function applyGloriaConfig(config, dir = skillsDir) {
  config.skills = config.skills || {}
  config.skills.paths = config.skills.paths || []
  if (!config.skills.paths.includes(dir)) config.skills.paths.push(dir)
  config.mcp = config.mcp || {}
  config.mcp.gloria = config.mcp.gloria || {
    type: "remote",
    url: "https://mcp.gloria.dev/mcp",
    enabled: true,
  }
  return config
}

// OpenCode plugin entry. The `config` hook receives OpenCode's config singleton;
// mutations here are visible when skills and MCP servers are resolved later.
// The `client` param is OpenCode's plugin client, used by the session.created
// hook to surface a version nudge (see formatVersionNudge above).
export const gloria = async ({ client } = {}) => ({
  config: async (config) => {
    applyGloriaConfig(config)
  },
  "session.created": async () => {
    try {
      const res = await fetch(LATEST_VERSION_URL)
      if (!res.ok) return
      const { latest } = await res.json()
      const message = formatVersionNudge(INSTALLED_VERSION, latest)
      if (message) await client?.app?.log({ service: "gloria", level: "warn", message })
    } catch {
      // Network hiccups must never block session start.
    }
  },
})

export default gloria
