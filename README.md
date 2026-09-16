# Enfocus Switch MCP server

A TypeScript MCP server exposing **all 46 operations** in the supplied Enfocus Switch Web Services 24 and 24.1 documentation: 35 Web Services REST operations, the dashboard GraphQL endpoint, and 10 Switch Helper operations. Each operation has its own discoverable tool, validated arguments, and an explicit HTTP mapping.

Runs locally over MCP **stdio** using the official TypeScript SDK. Requires **Node.js 22 or newer**. A running Switch installation with Web Services enabled and an authorized Switch account is required to use the tools. Helper tools require Switch Helper on the machine addressed by `SWITCH_HELPER_URL`; selecting or editing jobs can display native UI there.

## Install and run

```sh
npm ci
npm run build
npm test
```

Configure a generic MCP client to launch the compiled server:

```json
{
  "mcpServers": {
    "enfocus-switch": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/enfocus-switch-mcp/dist/index.js"],
      "env": {
        "SWITCH_BASE_URL": "http://127.0.0.1:51088",
        "SWITCH_USERNAME": "your-switch-user",
        "SWITCH_PASSWORD": "your-switch-password",
        "SWITCH_UPLOAD_ROOTS": "/absolute/path/to/jobs"
      }
    }
  }
}
```

Use your MCP host's secret-management facilities when available. Configuration above is an example; the server does not modify client settings or install itself. Alternatively configure `SWITCH_TOKEN` with an existing bearer token. The server does not read `.env` files automatically; environment variables must be provided by the launching process.

Run directly for manual MCP protocol interaction with `node dist/index.js`. It waits for JSON-RPC messages on stdin. No startup banners are written to stdout.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `SWITCH_BASE_URL` | `http://127.0.0.1:51088` | Switch Web Services base URL; use HTTPS when available |
| `SWITCH_HELPER_URL` | `http://127.0.0.1:55150` | Separate Helper service URL |
| `SWITCH_TOKEN` | unset | Initial session token; preferred over automatic login |
| `SWITCH_USERNAME` | unset | Username for lazy login |
| `SWITCH_PASSWORD` | unset | Plaintext password encrypted locally before login |
| `SWITCH_UPLOAD_ROOTS` | unset | Allowlisted local directories, separated by `:` on Unix or `;` on Windows; unset disables local-file uploads |
| `SWITCH_TIMEOUT_MS` | `120000` | Per-HTTP-request timeout; configure your MCP client's timeout accordingly |
| `SWITCH_MAX_UPLOAD_BYTES` | `268435456` | Combined unencoded file-content limit per upload |
| `SWITCH_MAX_RESPONSE_BYTES` | `16777216` | Maximum upstream response size |

TLS verification stays enabled. Configure trust for your organization's CA using Node's normal TLS configuration when needed. Login encryption follows Switch's required 1024-bit RSA/PKCS#1 v1.5 format; it does not replace transport encryption. URLs may include a reverse-proxy path prefix, but not credentials, query strings, or fragments.

## Tools and common workflows

See [the complete tool reference](docs/TOOLS.md) and [machine-readable coverage manifest](docs/coverage.json). `switch://api/operations` is also exposed as an MCP resource with every tool's schema and routing metadata.

Tool arguments retain the API's field names. Supply filter JSON as an ordinary, **unescaped string**. Query parameters are encoded once by the client. Comma-separated fields and IDs stay strings; message filters such as `module` also accept arrays to produce repeated query keys.

### Authentication and discovery

Authentication occurs lazily on the first authenticated call. `switch_login_query` can explicitly log in using environment credentials (`{}`) or a supplied `username` and plaintext `password`. Tokens remain in process memory and are redacted from tool output. `switch_logout_query` ends the session. A later authenticated call can log in again if environment credentials are configured.

Typical discovery tools:

- `switch_get_flows`: `{"fields":"id,name,status"}`
- `switch_get_submitpoints`: `{}` or `{"id":"4-2"}`
- `switch_get_jobs`: `{"limit":20,"sort":"-updated"}`
- `switch_get_job_metadata`: `{"ids":"job-id","readonly":false}`

### Submit a file or folder

Call `switch_post_job`:

```json
{
  "flowId": "4",
  "objectId": "2",
  "jobName": "invoice.pdf",
  "files": [{"localPath": "/absolute/path/to/jobs/invoice.pdf"}],
  "metadata": [{"id": "spMF_1", "name": "Customer", "value": "Example"}]
}
```

`localPath` is a path on the **MCP server machine**, within `SWITCH_UPLOAD_ROOTS`. Real paths are checked, including symlink targets. Individual files are accepted; directories are not recursively uploaded. For a folder job, enumerate its files and give each a `relativePath`, such as `order/cover.pdf` and `order/content/pages.pdf`. Duplicate paths and traversal are rejected. File names must be simple names without separators.

For inline data, use `{"filename":"hello.txt","base64":"SGVsbG8="}` instead of `localPath`. Exactly one source is required. `mimeType` and `filename` overrides are optional for local files. Canonical padded base64 is required; an empty string represents an empty file. Large jobs should use local files rather than passing base64 through the model.

Uploads use native `FormData` with `file[index][path]` and `file[index][file]` parts, and JSON-serialized metadata. Files are buffered under the configured byte limit; very large production jobs should use Helper submission or a suitably sized limit and memory budget.

### Replace and route

`switch_replace_job` accepts `id`, `files`, optional `updated`, `lang`, and optional `httpMethod` (`PUT` by default; documented `POST` alias also supported). The upload filename controls a replacement file's extension.

`switch_route_job` example:

```json
{
  "id": "job-id",
  "connections": ["5"],
  "updated": "2026-09-16T10:00:00",
  "metadata": [{"id":"cpMF_1", "name":"Approved", "value":"Yes"}]
}
```

Use the actual job's `updated` value to detect concurrent changes. Omitting it disables that upstream check. `switch_lock_job` and `switch_unlock_job` expose Switch locking. `check:true` on unlock checks permission without unlocking.

### Download links, thumbnails, and GraphQL

`switch_job_download` and `switch_job_report_download` return the documented session-bound download URLs. They do not fetch or save file bytes. Use the links before logging out or expiring the session. Treat those URLs as sensitive. Thumbnail responses are preserved as supplied by Switch.

`switch_dashboard_graphql` accepts a GraphQL `query`, optional `variables`, and `operationName`, allowing the full upstream schema to be queried:

```json
{"query":"{ jobs { count jobs { processingId name state } } }"}
```

Reporting/history fields depend on your Switch licenses and permissions. In live testing, the `jobs` query was denied until Boards access was enabled (login then reported `jobFinderAccess:true` and `viewBoardsAccess:true`); administrator access was not required for the tested queries. GraphQL errors, including responses with partial data, are returned as MCP errors with the upstream details. Schema introspection can be requested through the same tool if enabled by Switch; the server does not hard-code a subset of GraphQL fields.

### Helper and destructive operations

Helper edit, replace, and submit calls default their body `swsUrl` and `token` to the configured Switch service and current session. Both can be overridden explicitly. Helper calls never receive the Switch bearer header. The native picker can take longer than the default timeout.

Omitting `ids` from `switch_delete_job_filter` or `switch_delete_message_filter` deletes **all filters for the current user**. Omitting `annotId` from `switch_remove_annotations` removes **all annotations in the flow**. `switch_post_clear_messages` clears the message log. MCP mutation hints describe these operations but are not an access-control layer; Switch permissions and the MCP host's tool controls govern access.

## Design and behavior

- `src/catalog.json`: declarative, generated tool schemas and HTTP mappings. The same catalog supplies discovery and runtime validation.
- `src/client.ts`: Switch-specific encryption, session lifecycle, URI construction, JSON/multipart encoding, constrained file loading, response limits, error mapping, and redaction.
- `src/server.ts`: official MCP SDK protocol adapter; tool results provide both text content and structured `{status,data}` output.
- `src/config.ts`: environment validation and defaults.
- `src/index.ts`: stdio entry point and shutdown handling.

Each process owns one Switch session. Calls are serialized to keep authentication changes and job mutations ordered. The adapter never retries an upstream call automatically, follows no redirects, and honors MCP cancellation. A `401` clears the cached token; a subsequent explicit tool call can reauthenticate using configured credentials. Timeouts and connection failures may leave a write's completion uncertain; inspect state before retrying.

HTTP errors, Switch failure envelopes, GraphQL errors, validation failures, and transport failures become `isError:true` tool results. Status codes and sanitized upstream details are retained where available. Successful payloads keep their upstream structure, except credentials are redacted. There is no automatic pagination or silent truncation: use upstream filters, fields, limits, ranges, and timestamps. Response limit errors explicitly ask for a narrower request.

This is a local stdio server, not an HTTP MCP service. It does not add browser CORS handling or expose a shared network listener.

## Documentation reconciliation

The supplied 24 and 24.1 catalogs contain identical operation and parameter definitions. This implementation follows their endpoint definitions and request examples, with these explicit adjustments:

1. `PostJob`/`ReplaceJob` documentation's `filePath` and `fileContent` represent multipart part families, not literal request keys. The MCP `files` array maps them to the documented indexed parts. The bundled PHP sample uses older single-file multipart names; the implementation follows the newer endpoint specification.
2. Add-annotation JSON is an object or array itself; edit-annotation JSON is the patch object itself. Neither uses an enclosing `annotations`/`annotation` key on the wire.
3. Helper `cancelEditJob` and `jobInEdit` omit parameters in their tables, but show bare job IDs in sample URLs. Their tools require `jobId` and encode that sample format. `defaultApp` similarly uses a bare extension.
4. `EditJobFilter.visibility` is labeled `Object` in the type column, but its description and example specify a boolean; the schema uses boolean.
5. `UnlockJob.check` and Helper selection deletion parameters are sent in the query string. Live testing confirmed that `check=true` leaves the job locked and `check=false` unlocks it. Helper selection deletion remains unverified live.
6. Helper `jobInEdit` can use a false status as the boolean answer; that response is preserved rather than treated as a failed operation (HTTP errors and explicit error messages still fail).
7. The messages documentation mentions an optional timezone header without specifying its name. No speculative header is invented; responses use the server's default timestamps.
8. The GraphQL header table specifies `application/graphql`, while the bundled GraphiQL client sends an `application/json` query envelope. The implementation follows that bundled client; live tests verified the JSON envelope, variables, and `operationName`.

## Validation and maintenance

`npm test` compiles the project and runs local HTTP mock tests covering all 46 route/method/body combinations, authentication and secret redaction, uploads, optional paths, repeated query parameters, validation, error handling, limits, timeouts, cancellation, and redirects. A separate test launches a real child process and exercises MCP initialization, tools, resources, successful calls, and errors using the official SDK client.

Live validation against a local Switch service on 2026-09-16 passed RSA login/logout, session ping, discovery, jobs, metadata, thumbnails, messages, and filter reads. A single file and a nested two-file folder submitted through the designated test flow successfully moved downstream. The official MCP SDK client also exercised the compiled server against that live service. See [the validation record](docs/VALIDATION.md).

A subsequent live checkpoint test passed metadata-bearing submissions, file/folder downloads with byte verification, lock/unlock semantics, replacement and re-download, and both Approve/Reject routes with required checkpoint metadata and `updated` timestamps. Both jobs completed in their selected output folders. Checkpoint access must be explicitly granted to the API user; without it, jobs disappear from the job list on arrival and download can return HTTP 404.

GraphQL jobs access succeeded after Boards access was enabled for the account. Live tests verified a named query with variables returning all four completed test jobs, schema introspection, and a historical-statistics query (zero rows for the requested range). Administrator access remained disabled. A subsequent administrator-account test verified stopping and restarting the designated test flow, with independent state reads confirming running → stopped → running. Report downloads, other administrative changes, and Helper interactions remain unverified live. Live validation covers these specific operations and does not establish compatibility for every installed-version feature.

### Repeat live checks

Supply `SWITCH_USERNAME`, `SWITCH_PASSWORD`, and optionally `SWITCH_BASE_URL` through your shell or secret manager, then run `npm run test:live`. The live script uses an actual MCP stdio child process and performs login, reads, session refresh, and logout. It never prints credentials or download URLs. `SWITCH_LIVE_REPORT` optionally specifies an output JSON report path.

Optional settings:

- `SWITCH_TEST_FLOW`: restrict job/message reads to a named test flow.
- `SWITCH_TEST_JOB_IDS`: comma-separated known test jobs to inspect for metadata, thumbnails, and download links.
- `SWITCH_LIVE_SUBMIT=1`: explicitly enable one test-file submission; also requires `SWITCH_TEST_FLOW` and `SWITCH_TEST_SUBMIT_POINT`. The target must already be running.
- `SWITCH_TEST_METADATA`: JSON array of submit metadata entries with string `id`, `name`, and `value`, including all required editable fields. Discover their IDs with `switch_get_submitpoints`.
- `SWITCH_TEST_FILE`: use an existing local file for submission instead of generated inline text; configure `SWITCH_UPLOAD_ROOTS` to include it.

The script leaves a submitted test job in its flow, reports its ID, and never removes production jobs or clears logs. Optional GraphQL/download probes report denied or unavailable outcomes without aborting the remaining checks.

To audit coverage against a downloaded `api_data.json`:

```sh
npm run check:coverage -- /path/to/api_data.json
```

To regenerate the catalog after reviewing documentation changes:

```sh
python3 scripts/generate-catalog.py /path/to/api_data.json
npm test
```

The generator is deterministic and retains explicit protocol corrections. Tests have an independent table of expected wire requests; expanding coverage requires updating that table and reviewing schema/location decisions. The manifest records the input file's SHA-256. Original vendor prose and sample source are not redistributed in this package.

## Sources

- [Enfocus Web Services 24 documentation](https://cdn.enfocus.com/manuals/DeveloperGuide/WebServices/24/index.html)
- [Enfocus Web Services 24.1 documentation and PHP sample archive](https://cdn-www.enfocus.com/manuals/DeveloperGuide/WebServices/24.1-zip/SwitchWebServicesRESTAPIDocumentation.zip)
- [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
