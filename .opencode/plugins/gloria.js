import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The bundled skills live at the repo root /skills, two levels up from this
// plugin file — in both the monorepo (dev) and the published package.
const skillsDir = path.resolve(__dirname, "../../skills")

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
export const gloria = async () => ({
  config: async (config) => {
    applyGloriaConfig(config)
  },
})

export default gloria
