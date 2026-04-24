# Souk Compass — Solr Setup

Local and remote Solr setup for the Souk Compass semantic search server.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

## Quick Start

From the `skill-forge/mcp-servers/souk-compass/` directory:

```bash
docker compose up -d
```

This starts a Solr 9.x instance on port 8983 with the `context-bazaar` collection pre-created using the bundled schema.

Verify it's running:

```bash
curl http://localhost:8983/solr/admin/cores?action=STATUS
```

## Creating Collections

Use the `compass_setup` MCP tool to create both the artifact and user document collections:

```
compass_setup { "action": "create_collections" }
```

Or create them manually via the Solr Collections API:

```bash
# Artifact collection (pre-created by docker compose)
curl "http://localhost:8983/solr/admin/cores?action=STATUS&core=context-bazaar"

# User document collection
curl "http://localhost:8983/solr/admin/cores?action=CREATE&name=context-bazaar-user-docs&configSet=_default"
```

## Stopping Solr

```bash
docker compose down
```

To remove persisted data as well:

```bash
docker compose down -v
```

## Remote Solr Deployment

For production or shared team use, point Souk Compass at a remote Solr instance by setting environment variables:

```bash
export SOUK_COMPASS_SOLR_URL=https://solr.example.com:8983
export SOUK_COMPASS_SOLR_COLLECTION=context-bazaar
export SOUK_COMPASS_USER_COLLECTION=context-bazaar-user-docs
```

Ensure the remote Solr instance has:
1. The schema from `solr/schema.xml` applied to both collections
2. Dense vector search enabled (Solr 9.x+)
3. Network access from the machine running the MCP server

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SOUK_COMPASS_SOLR_URL` | `http://localhost:8983` | Solr base URL |
| `SOUK_COMPASS_SOLR_COLLECTION` | `context-bazaar` | Artifact collection name |
| `SOUK_COMPASS_USER_COLLECTION` | `context-bazaar-user-docs` | User document collection name |
| `SOUK_COMPASS_EMBED_PROVIDER` | `local` | Embedding provider (`local`, `bedrock-titan`) |
| `SOUK_COMPASS_EMBED_DIMENSIONS` | `1024` | Embedding vector dimensions |


## Auto-Reindex Hook

Souk Compass includes a `postToolUse` hook at `hooks/auto-reindex.json` that automatically triggers `compass_reindex` after shell commands complete (e.g., `forge build`). This keeps the Solr index synchronized with the catalog without manual intervention.

### How It Works

1. After any shell tool execution completes, the hook fires an `askAgent` action.
2. The agent is prompted to run `compass_reindex`, which uses content-hash change detection to re-index only artifacts that have been added, updated, or removed.
3. Unchanged artifacts are skipped — no redundant embedding generation or Solr writes.

### Enabling / Disabling

The hook is active by default when the plugin is installed. To disable automatic re-indexing:

- Remove or rename `hooks/auto-reindex.json`
- Or set the hook's `eventType` to an unused value

### Behavior When Solr Is Unavailable

If Solr is not running when the hook fires, `compass_reindex` returns a non-fatal error message. The hook does not block subsequent operations — the build process and other tools continue to function normally. The index can be updated later by running `compass_reindex` manually once Solr is available.
