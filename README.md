# context-bazaar

A typed, discoverable knowledge bazaar for AI coding assistants. Write skills, powers, workflows, prompts, and agents once — compile them to every major harness from a single source.

## What is this?

AI coding assistants (Claude Code, Kiro, Copilot, Cursor, Windsurf, Cline, Q Developer) each use a different format for configuration, rules, and context files. context-bazaar solves the fragmentation problem: you author a **knowledge artifact** once, and the **Skill Forge** CLI compiles it into the native format for every supported harness.

The repository contains both the **forge tool** and a growing catalog of **ready-to-use artifacts** organized into themed **collections**.

## Key Concepts

| Concept | Description |
|---|---|
| **Knowledge artifact** | A single unit of guidance — a skill, prompt, workflow, power, agent, rule, template, or reference pack. Lives in `skill-forge/knowledge/<name>/`. |
| **Harness** | An AI coding assistant target. Each harness has its own file format, conventions, and capabilities. |
| **Collection** | A themed group of artifacts. Membership is declared in each artifact's frontmatter, not in the collection manifest. |
| **Catalog** | A machine-readable index (`catalog.json`) of all artifacts, used by the browse UI and the MCP bridge. |
| **Skill Forge** | The CLI tool that validates, builds, catalogs, imports, and publishes artifacts. |

## Supported Harnesses

| Harness | Compiled output |
|---|---|
| **Kiro** | Steering files, hooks, powers |
| **Claude Code** | CLAUDE.md, settings.json, MCP |
| **GitHub Copilot** | Instructions, path-scoped rules, AGENTS.md |
| **Cursor** | Rules, MCP |
| **Windsurf** | Rules, workflows, MCP |
| **Cline** | Toggleable rules, hook scripts, MCP |
| **Amazon Q Developer** | Rules, agents, MCP |

## Repository Structure

```
context-bazaar/
├── skill-forge/             ← the forge CLI tool (TypeScript, Bun)
│   ├── src/                 ← CLI and core modules
│   │   └── adapters/        ← per-harness compiler adapters
│   ├── knowledge/           ← canonical knowledge artifacts
│   ├── collections/         ← collection manifests (metadata only)
│   ├── templates/           ← Nunjucks templates for harness output
│   ├── bridge/              ← compiled MCP server (bridge/mcp-server.cjs)
│   ├── dist/                ← compiled harness output (generated)
│   ├── catalog.json         ← machine-readable artifact index (generated)
│   ├── docs/adr/            ← architecture decision records
│   ├── changes/             ← towncrier-style changelog fragments
│   └── evals/               ← cross-artifact eval configs
├── .claude-plugin/          ← Claude Code plugin manifests
├── .mcp.json                ← MCP server config
├── CONTRIBUTING.md          ← how to add artifacts and contribute
├── PLUGIN_USAGE.md          ← Claude Code plugin install & usage
└── CODE_OF_CONDUCT.md
```

## Collections

### Neon Caravan
Craft-focused developer workflow artifacts.

| Artifact | Type | Description |
|---|---|---|
| `commit-craft` | prompt | Write commit messages that explain why, not just what |
| `debug-journal` | workflow | Three-phase debugging methodology: articulate → isolate → fix |
| `review-ritual` | skill | Code review as craft — reading order, comment taxonomy, approval |
| `type-guardian` | skill | TypeScript type discipline — strictness, `unknown` vs `any`, discriminated unions |

### Byron Powers
Literary and publishing workflow powers.

| Artifact | Type | Description |
|---|---|---|
| `book-agent-publicist` | power | Finding agents, deals, contracts, publicity, career strategy |
| `novelist` | power | Complete novel-writing companion across creative and professional tracks |
| `technical-author` | power | Technical book writing in the O'Reilly/Pragmatic/Manning style |
| `proofreader-review-checklist` | power | Structured checklists for manuscripts, proposals, queries, and synopses |

## Quick Start

### Use as a Claude Code plugin

See [Plugin Usage](PLUGIN_USAGE.md) for installation instructions. No build step required.

### Develop locally

```bash
cd skill-forge
bun install

# Build all artifacts for all harnesses
bun run dev build

# Validate artifacts
bun run dev validate

# Browse the catalog
bun run dev catalog browse

# Scaffold a new artifact
bun run dev new my-artifact --type skill
```

## How It Works

The core pipeline is: **source** → **parse** → **adapt** → **write**.

1. Each artifact in `knowledge/<name>/` contains a `knowledge.md` file (YAML frontmatter + Markdown body), with optional `hooks.yaml`, `mcp-servers.yaml`, and `workflows/` phase files.
2. The forge CLI parses the frontmatter and body, validates against Zod schemas, and passes the result to per-harness **adapters**.
3. Each adapter is a pure function that uses Nunjucks templates to produce the harness-native output files in `dist/<harness>/<artifact>/`.

Artifact types: `skill` · `power` · `rule` · `workflow` · `agent` · `prompt` · `template` · `reference-pack`

## Documentation

| Document | Description |
|---|---|
| [Plugin Usage](PLUGIN_USAGE.md) | Claude Code plugin installation and MCP tools |
| [Contributing](CONTRIBUTING.md) | How to add artifacts, run tests, and submit PRs |
| [Skill Forge README](skill-forge/README.md) | CLI usage, project structure, supported harnesses |
| [Architecture Decision Records](skill-forge/docs/adr/README.md) | Design rationale and key technical choices |
| [Changelog](skill-forge/CHANGELOG.md) | Release history |

## License

[Boost Software License 1.0](LICENSE)
