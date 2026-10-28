# ADR-002: Browser localStorage persistence with an external store

Status: Accepted

## Context

A plan must survive page reloads and navigation between the intake, workspace and summary pages.
The product has no accounts, and plans contain personal event details. A server database would
add authentication, retention and privacy obligations that the product does not need.

## Decision

- Persist one `StoredWorkspace` (`version`, `intake`, `plan`, `previousPlan`, `savedAt`) under the
  key `eventcraft.plan.v2` (`STORAGE_KEY`, derived from `WORKSPACE_VERSION`) in `localStorage` ([lib/storage.ts](../lib/storage.ts),
  [lib/constants.ts](../lib/constants.ts)).
- Validate on read with `StoredWorkspaceSchema`. Corrupt JSON or schema mismatches are removed and
  treated as an empty workspace. Writes that throw (quota, private mode) return `false`, the
  in-memory state still works, and the store sets `saveFailed` so the workspace shows an alert.
- Hold state in a module-level store ([lib/workspaceStore.ts](../lib/workspaceStore.ts)) driven by
  a pure reducer ([lib/workspace.ts](../lib/workspace.ts)), exposed to React with
  `useSyncExternalStore` ([components/useWorkspace.ts](../components/useWorkspace.ts)). The server
  snapshot is `{ status: "loading" }`, so server and first client render match.
- Writes for per-keystroke edits (`setAmount`, `setTotalBudget`) are debounced by
  `PERSIST_DEBOUNCE_MS` and flushed when the page is hidden or unloaded; all other changes are
  written immediately ([lib/workspaceStore.ts](../lib/workspaceStore.ts), [lib/workspacePersistence.ts](../lib/workspacePersistence.ts)).
- Keep a single `previousPlan` to support one-level undo after a refinement.
- The summary page can export the workspace as JSON as a user-controlled backup (it also offers a
  calendar and a budget CSV, which are not read back). The intake page
  can import such a file; it is size-capped and validated with `StoredWorkspaceSchema` before it
  replaces the saved workspace ([lib/importWorkspace.ts](../lib/importWorkspace.ts)).

## Consequences

- No server-side user data exists to leak, retain or delete. The footer states that plans are
  stored only in this browser.
- Data is per browser and per device, is cleared when the user clears site data, and is readable
  by anyone with access to the profile. It is unencrypted.
- `useSyncExternalStore` avoids effect-based hydration. The store listens for `storage` events, so
  a plan written or cleared in another tab is reloaded on the next read.
- The `v2` key and `version: 2` literal allow a future migration: a new schema version would use a
  new key or an explicit upgrade step; until then an incompatible stored value is discarded.
- The refine request sends the full plan to the server on each call, bounded by the 131,072 byte
  request limit (`LIMITS.requestBodyBytes`).
