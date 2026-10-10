<p align="center">
  <img src="./assets/gloria-wordmark.png" alt="gloria.dev" width="360">
</p>

<p align="center">
  <strong>This repo has moved to <a href="https://github.com/sandgardenhq/plugins">sandgardenhq/plugins</a>.</strong>
</p>

---

The `gloria` plugin now ships from the **`sandgarden`** marketplace at **[sandgardenhq/plugins](https://github.com/sandgardenhq/plugins)**, together with gloria, miranda, and doc-holiday. This repo is no longer updated and will be archived.

## Install

Run each command from inside the agent unless noted.

### Claude Code

```text
/plugin marketplace add sandgardenhq/plugins
/plugin install gloria@sandgarden
```

### OpenAI Codex

```bash
codex plugin marketplace add sandgardenhq/plugins   # in your shell
```

Then, inside Codex, run `/plugins`, install `gloria`, and start a new session. Finally, complete the one-time OAuth handshake for the plugin's MCP server:

```bash
codex mcp login gloria   # in your shell
```

### OpenCode

Add the plugin to your `opencode.json`, then restart OpenCode:

```json
{ "plugin": ["@sandgarden/gloria"] }
```

### Cursor

```bash
git -C ~/.cursor/plugins/sources/sandgarden pull || git clone https://github.com/sandgardenhq/plugins.git ~/.cursor/plugins/sources/sandgarden
mkdir -p ~/.cursor/plugins/local
rm -rf ~/.cursor/plugins/local/gloria
cp -R ~/.cursor/plugins/sources/sandgarden/plugins/gloria ~/.cursor/plugins/local/gloria
```

Copy rather than symlink: Cursor does not load a symlinked local plugin (see [cursor/plugins#35](https://github.com/cursor/plugins/issues/35)). Restart Cursor or run **Developer: Reload Window**.

## Already installed from this repo? Switch over

- **Claude Code:** remove the old `gloria` marketplace, then install from `sandgarden` as above:

  ```text
  /plugin marketplace remove gloria
  ```

- **OpenAI Codex:** remove the old `gloria` marketplace, then install from `sandgarden` as above:

  ```bash
  codex plugin marketplace remove gloria   # in your shell
  ```

- **OpenCode:** in `opencode.json`, replace `gloria@git+https://github.com/sandgardenhq/gloria.git` with `@sandgarden/gloria`, clear OpenCode's plugin cache, and restart OpenCode:

  ```bash
  rm -rf ~/.cache/opencode/node_modules
  ```

- **Cursor:** delete the old symlink or copy and the old clone, then follow the [Cursor install steps](#cursor):

  ```bash
  rm -rf ~/.cursor/plugins/local/gloria ~/.cursor/plugins/sources/gloria
  ```

## Learn more

- Full install guide, for every agent and plugin: <https://github.com/sandgardenhq/plugins#readme>
- gloria.dev: <https://gloria.dev>

---

<p align="center"><sub>© Sandgarden, Inc. · gloria@sandgarden.com</sub></p>
