# State of MCP Security — 2026-07-20

A snapshot audit of 8 official Model Context Protocol reference servers, run with [mcpaudit](https://github.com/Hari9885/mcpaudit) — an open-source security/conformance/quality linter for MCP servers. Every target is a maintained reference implementation (npm `@modelcontextprotocol/*` or the matching PyPI `mcp-server-*` packages) that needs no API key, so the scan is fully reproducible offline-of-secrets with `node scripts/state-of-mcp-security.mjs`.

**Sample size caveat:** this is 8 officially-maintained reference servers, not the full public MCP ecosystem — there is no canonical registry to crawl yet. Reference servers are written by protocol maintainers, so treat these scores as a *best case* floor, not a representative average of third-party servers in the wild.

## Summary

- Servers scanned: **8** (8 scored, 0 failed to audit)
- Mean score: **83/100** · Median: **88/100** · Range: 65–100
- Grade distribution: A=3 B=2 C=1 D=2 F=0

## Per-server results

| Server | Runtime | Score | Grade | Findings | Tools |
|---|---|---|---|---|---|
| mcp-server-fetch | pypi | 100/100 | A | 0 | 1 |
| mcp-server-time | pypi | 100/100 | A | 0 | 2 |
| @modelcontextprotocol/server-sequential-thinking | npm | 95/100 | A | 1 | 1 |
| @modelcontextprotocol/server-everything | npm | 88/100 | B | 3 | 13 |
| mcp-server-sqlite | pypi | 80/100 | B | 4 | 6 |
| @modelcontextprotocol/server-memory | npm | 70/100 | C | 6 | 9 |
| @modelcontextprotocol/server-filesystem | npm | 65/100 | D | 17 | 14 |
| mcp-server-git | pypi | 65/100 | D | 18 | 12 |

## Most common findings across the sample

| Rule | Category | Sev | Check | Servers affected | Total occurrences |
|---|---|---|---|---|---|
| sec-04 | sec | warn | State-changing tools carry a destructiveHint | 5/8 | 9 |
| conf-03 | conf | warn | Required parameters have descriptions | 3/8 | 37 |
| qual-04 | qual | info | Responses aren't slow (>5s) (probe) | 1/8 | 1 |
| qual-02 | qual | warn | Descriptions aren't bloated (>600 chars) | 1/8 | 1 |
| sec-03 | sec | warn | Read-named tools don't secretly write/delete | 1/8 | 1 |

## Per-server detail

## mcpaudit: mcp-servers/everything — 88/100 (B)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| sec-04 | warn | toggle-subscriber-updates | Tool appears to modify state but lacks a destructiveHint annotation. |
| sec-04 | warn | simulate-research-query | Tool appears to modify state but lacks a destructiveHint annotation. |
| qual-04 | info | trigger-long-running-operation | Tool responded in 10000ms (>5s). |

## mcpaudit: secure-filesystem-server — 65/100 (D)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| conf-03 | warn | read_file | Required parameter "path" has no description. |
| conf-03 | warn | read_text_file | Required parameter "path" has no description. |
| conf-03 | warn | read_media_file | Required parameter "path" has no description. |
| conf-03 | warn | write_file | Required parameter "path" has no description. |
| conf-03 | warn | write_file | Required parameter "content" has no description. |
| conf-03 | warn | edit_file | Required parameter "path" has no description. |
| conf-03 | warn | edit_file | Required parameter "edits" has no description. |
| conf-03 | warn | create_directory | Required parameter "path" has no description. |
| sec-04 | warn | create_directory | Tool appears to modify state but lacks a destructiveHint annotation. |
| conf-03 | warn | list_directory | Required parameter "path" has no description. |
| conf-03 | warn | list_directory_with_sizes | Required parameter "path" has no description. |
| conf-03 | warn | directory_tree | Required parameter "path" has no description. |
| conf-03 | warn | move_file | Required parameter "source" has no description. |
| conf-03 | warn | move_file | Required parameter "destination" has no description. |
| conf-03 | warn | search_files | Required parameter "path" has no description. |
| conf-03 | warn | search_files | Required parameter "pattern" has no description. |
| conf-03 | warn | get_file_info | Required parameter "path" has no description. |

## mcpaudit: memory-server — 70/100 (C)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| conf-03 | warn | create_entities | Required parameter "entities" has no description. |
| sec-04 | warn | create_entities | Tool appears to modify state but lacks a destructiveHint annotation. |
| conf-03 | warn | create_relations | Required parameter "relations" has no description. |
| sec-04 | warn | create_relations | Tool appears to modify state but lacks a destructiveHint annotation. |
| conf-03 | warn | add_observations | Required parameter "observations" has no description. |
| conf-03 | warn | delete_observations | Required parameter "deletions" has no description. |

## mcpaudit: sequential-thinking-server — 95/100 (A)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| qual-02 | warn | sequentialthinking | Tool description is 2781 chars (>600); bloats agent context. |

## mcpaudit: mcp-fetch — 100/100 (A)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| — | — | — | No findings ✓ |

## mcpaudit: mcp-time — 100/100 (A)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| — | — | — | No findings ✓ |

## mcpaudit: mcp-git — 65/100 (D)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| conf-03 | warn | git_status | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_diff_unstaged | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_diff_staged | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_diff | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_diff | Required parameter "target" has no description. |
| conf-03 | warn | git_commit | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_commit | Required parameter "message" has no description. |
| conf-03 | warn | git_add | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_add | Required parameter "files" has no description. |
| conf-03 | warn | git_reset | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_log | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_create_branch | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_create_branch | Required parameter "branch_name" has no description. |
| sec-04 | warn | git_create_branch | Tool appears to modify state but lacks a destructiveHint annotation. |
| conf-03 | warn | git_checkout | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_checkout | Required parameter "branch_name" has no description. |
| conf-03 | warn | git_show | Required parameter "repo_path" has no description. |
| conf-03 | warn | git_show | Required parameter "revision" has no description. |

## mcpaudit: sqlite — 80/100 (B)

Pattern pack v0.1.0 (2026-07-19)

| Rule | Sev | Target | Message |
|---|---|---|---|
| sec-03 | warn | read_query | Tool name implies read-only but description mentions write/delete/send. |
| sec-04 | warn | read_query | Tool appears to modify state but lacks a destructiveHint annotation. |
| sec-04 | warn | write_query | Tool appears to modify state but lacks a destructiveHint annotation. |
| sec-04 | warn | create_table | Tool appears to modify state but lacks a destructiveHint annotation. |

---

Generated with mcpaudit `8`-target scan on 2026-07-20. Run your own server through it: `npx @hari9885/mcpaudit --stdio "<your server command>"`.