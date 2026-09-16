# Validation record

Initial validation on 2026-09-16 used Node.js 24.19.0 and npm 10.9.8; the project subsequently migrated to pnpm (see below).

- Clean `npm ci`: passed; dependency audit reported zero vulnerabilities at validation time.
- TypeScript strict compilation: passed.
- Test suite: 13 tests passed, zero failures.
- Independent wire-request table: all 46 documented operations exercised against local HTTP mocks.
- Coverage audit: passed against both Enfocus Web Services 24 `api_data.json` and the 24.1 archive's catalog, including operation names, methods, paths, and top-level documented parameters.
- Actual stdio child process: MCP initialize, tools/list, resources/list, resources/read, tools/call success, validation failures, upstream errors, unknown tools, and unknown resources verified with the official MCP SDK client.
- Protocol-specific checks: RSA format, bearer lifecycle, multipart indexed fields, binary payloads and content length, bare Helper queries, unwrapped annotations, repeated query parameters, optional path segments, and replacement POST alias.
- Failure and boundary checks: unauthorized writes without replay, invalid login, response and upload limits, cancellation, timeout, redirects, GraphQL errors, local upload roots and symlink escapes, canonical base64, and credential redaction.

## Live Switch validation

Live testing on 2026-09-16 against the user-provided local service at port 51088, with a non-administrator test account:

| Operation | Result |
|---|---|
| RSA login and logout | HTTP 200; credentials/tokens not written to deliverables |
| Ping with session refresh | HTTP 200; session active |
| Flow and submit-point discovery | HTTP 200; matched the designated running flow and point |
| Groups, job filters, message filters | HTTP 200 |
| Message listing, including repeated job query parameters | HTTP 200; downstream movement confirmed |
| Single-file multipart submission | HTTP 200; job ID returned |
| Nested two-file folder submission | HTTP 200; job ID returned; two files reported |
| Filtered job listing | HTTP 200; both submitted jobs visible |
| Metadata and thumbnails for submitted jobs | HTTP 200 |
| Dashboard GraphQL | HTTP 200 with a permission-denied GraphQL error; correctly returned as an MCP error |
| Job download links | HTTP 404 for both jobs; download availability/access remains unverified |
| Actual MCP stdio transport against live service | 46 tools discovered; authentication, reads, error propagation, and logout passed |

Test target: flow **API Submit test** (`25`), submit point **Test API submit** (`2`).

Submitted fixtures:

| Job | ID | Observed outcome |
|---|---|---|
| `mcp-live-test-20260916-single.txt` | `6aaabed215fc005dd2eb27df` | 1 file, 27 bytes; moved to Folder 1 |
| `mcp-live-test-20260916-folder` | `6aaabed215fc005dd2eb27e0` | 2 files, 39 bytes; moved to Folder 1 |

The folder fixture included `mcp-test/readme.txt` and `mcp-test/nested/second.txt`. The job-list response confirmed its folder classification and file count. File contents and final nested paths were not downloaded for independent verification because download requests returned 404.

No implementation incompatibility was found in the exercised endpoints. Both test sessions were logged out. The submitted fixtures remain in the designated flow/output. No other flows were started or stopped, and no job deletion or log clearing was performed.

The initial test did not cover checkpoint locking/replacement/routing or downloadable content; the follow-up below verifies those operations. Annotation mutations, filter mutations, administrative controls, Helper interactions, successful GraphQL data access, and report downloads remain unverified live. All 46 documented operations retain mock wire-format coverage. The supplied docs do not resolve every installed-version detail; see README.md for remaining protocol ambiguities.

A credential-free live summary is in `docs/live-results.json`. Repeatable live checks are provided by `scripts/live-smoke.mjs` (`pnpm run test:live`).

The machine's default Volta configuration selects Node 10. Validation used the available Node 24 executable explicitly. The package requires Node 22 or newer and does not change the machine's global Node configuration.


## Checkpoint, metadata, downloads, and routing follow-up

Performed on 2026-09-16 through an actual MCP stdio client against the same live Switch service.

Target: flow **API Submit test** (`25`), submit point **Test API submit** (`2`), checkpoint **Test API checkpoint** (`15`). The user granted checkpoint access to the API account after an initial access check showed jobs missing from the list and downloads returning HTTP 404. Once granted, the same session could see both jobs; no server implementation change was needed.

Two new jobs were submitted with all five required metadata fields: text, date, numeric string, Yes/No, and dropdown selection. Submission values were `MCP checkpoint live test`, `2026-09-16`, `42`, `Yes`, and `choice 2` respectively. The API accepted both submissions. Checkpoint metadata definitions were fetched separately; submit field IDs (`spMF_*`) and checkpoint IDs (`cpMF_*`) are distinct.

| Verification | Result |
|---|---|
| Single-file download | HTTP 200; 27 bytes, exactly matching the original upload |
| Folder download | HTTP 200; valid ZIP with exactly two files; relative `readme.txt` and `nested/second.txt` paths and both file contents verified |
| Lock | HTTP 200; job-list response showed `locked:true`, owned by `mcp_user` |
| Unlock `check:true` | HTTP 200; subsequent read confirmed the job remained locked |
| Unlock `check:false` | HTTP 200; subsequent read confirmed `locked:false` |
| File replacement | HTTP 200 using the current `updated` timestamp |
| Re-download after replacement | HTTP 200; 37 bytes exactly matching replacement content |
| Approve route | HTTP 200 with connection `18`, current `updated`, and all five required checkpoint metadata entries |
| Reject route | HTTP 200 with connection `20`, current `updated`, and all five required checkpoint metadata entries |
| Routing outcome | Both jobs reported `completed`, with empty checkpoint IDs; Switch messages explicitly recorded movement into the selected Approve and Reject folders |
| Logout | HTTP 200 |

| Job | ID | Final destination |
|---|---|---|
| `mcp-checkpoint-20260916-approve.txt` | `6aaac50415fc005dd2eb28c6` | Approve (`18`); contains replacement test text |
| `mcp-checkpoint-20260916-reject-folder` | `6aaac50415fc005dd2eb28c7` | Reject (`20`); original two-file folder |

The approve route supplied checkpoint values `MCP approve route test`, `2026-09-16`, `101`, `Yes`, and `choice 1`. The reject route supplied `MCP reject route test`, `2026-09-16`, `202`, `No`, and `choice 2`. These required metadata entries were accepted as part of routing; persistence in downstream external metadata datasets was not independently inspected.

The downloaded ZIP uses a Switch-prefixed job-folder root (`_000G9_mcp-checkpoint-20260916-reject-folder/`). The original upload's nested structure and bytes are preserved beneath that root. Original and replacement SHA-256 values and structured results are recorded in `docs/checkpoint-live-results.json`.

Report downloading was not exercised because these jobs advertise `allowReportViewing:false` and no associated report was configured. No production job was modified, no other flow was started or stopped, and no logs were cleared. The two new test jobs remain at their selected outputs.


## Flow-control permission check

Start/stop tools were invoked on **API Submit test** (`25`) after checkpoint routing had completed. Both `switch_stop_flow` and `switch_start_flow` returned HTTP 403 with an explicit permission-denied message for the test account. Flow reads before and after each attempt confirmed that it remained `running`. The MCP adapter correctly surfaced both denials as tool errors.

The initial stop/start cycle was blocked pending an account permission change; the administrator retest below resolves that block. No other flow was targeted.


## GraphQL follow-up after enabling Boards access

On 2026-09-16 the user enabled Boards access for the test account. A fresh login reported `jobFinderAccess:true`, `viewBoardsAccess:true`, `reportingAccess:true`, `webservicesAccess:true`, and `administratorAccess:false`.

All of the following passed through the compiled MCP stdio server:

- The previously denied `jobs` query, filtered to API Submit test, returned successfully (zero currently processing jobs).
- Schema introspection exposed the root fields `monitoring`, `sessions`, `flows`, `jobs`, and `jobs_hist`.
- A named `McpLive` operation using a `$filter: String` variable and `finished:1` returned all four test jobs (`000G8`, `000G7`, `000GA`, `000G9`). This also verifies the JSON GraphQL request envelope and `operationName` support.
- A `jobs_hist` query grouped by flow for 2026-09-16 UTC completed without permission or schema errors. It returned zero rows, so nonempty historical data has not been validated.
- Logout succeeded.

Enabling Boards access resolved the tested jobs-query denial without administrator privileges. This does not establish whether read-only Boards access alone would suffice, or the permissions needed for the untested `monitoring` and `sessions` fields. The earlier flow start/stop HTTP 403 block was subsequently resolved by the administrator retest below.

Structured results: `docs/graphql-live-results.json`. No production code changes were needed.


## Flow-control retest with administrator access

On 2026-09-16 the user added the test account to the Administrators group. A fresh login confirmed `administratorAccess:true`. Through the compiled MCP stdio server, only **API Submit test** (`25`) was targeted:

1. `switch_get_flows` confirmed the initial state was `running`.
2. `switch_stop_flow` succeeded with `status:true`.
3. A separate `switch_get_flows` call verified `stopped`.
4. `switch_start_flow` succeeded with `status:true` and `flowStatus:running`.
5. A separate `switch_get_flows` call verified `running`.
6. Logout succeeded.

The complete stop/start cycle is now live-verified. The test flow was left running and no other flows were modified. No implementation changes were required. See `docs/flow-control-live-results.json` for structured results.


## pnpm migration

The project now pins pnpm 11.19.0 and requires Node.js 22.13 or newer. The existing dependency lock was imported into `pnpm-lock.yaml`; all 95 unique dependency name/version pairs were preserved. The npm lockfile was removed from the project. Setup instructions and CI now use pnpm, with CI testing Node 22 and 24.

Validation under Node.js 24.19.0 and pnpm 11.19.0:

- Fresh `pnpm install --frozen-lockfile` with no existing node_modules: passed.
- `pnpm test`: compilation and all 13 tests passed, including the MCP stdio child-process test.
- `pnpm run check:coverage`: all 46 documented operations passed.

Earlier npm references in this validation record describe historical runs, not the current installation workflow.
