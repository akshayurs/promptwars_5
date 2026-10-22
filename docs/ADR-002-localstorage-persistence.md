# ADR-002: Browser localStorage persistence with an external store

Status: Accepted

## Context

A plan must survive page reloads and navigation between the intake, workspace and summary pages.
The product has no accounts, and plans contain personal event details. A server database would
add authentication, retention and privacy obligations that the product does not need.

## Decision

- Persist one `StoredWorkspace` (`version`, `intake`, `plan`, `previousPlan`, `savedAt`) under the
  key `eventcraft.plan.v1` in `localStorage` ([lib/storage.ts](../lib/storage.ts),
  [lib/constants.ts](../lib/constants.ts)).
- Validate on read with `StoredWorkspaceSchema`. Corrupt JSON or schema mismatches are removed and
  treated as an empty workspace. Writes that throw (quota, private mode) return `false` and the
  in-memory state still works.
- Hold state in a module-level store ([lib/workspaceStore.ts](../lib/workspaceStore.ts)) driven by
  a pure reducer ([lib/workspace.ts](../lib/workspace.ts)), exposed to React with
  `useSyncExternalStore` ([components/useWorkspace.ts](../components/useWorkspace.ts)). The server
  snapshot is `{ status: "loading" }`, so server and first client render match.
- Keep a single `previousPlan` to support one-level undo after a refinement.
- The summary page can export the workspace as JSON as a user-controlled backup.

## Consequences

- No server-side user data exists to leak, retain or delete. The footer states that plans are
  stored only in this browser.
- Data is per browser and per device, is cleared when the user clears site data, and is readable
  by anyone with access to the profile. It is unencrypted.
- `useSyncExternalStore` avoids effect-based hydration and keeps renders consistent across tabs
  of components that subscribe, but changes made in another browser tab are not observed live.
- The `v1` key and `version: 1` literal allow a future migration: a new schema version would use a
  new key or an explicit upgrade step; until then an incompatible stored value is discarded.
- The refine request sends the full plan to the server on each call, bounded by the 32,768 byte
  request limit.
