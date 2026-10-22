# ADR-001: Gemini structured output validated by Zod

Status: Accepted

## Context

EventCraft needs a budget, timeline, vendor checklist and ideas as typed data that the UI can edit
(amounts, booked flags) and persist. Free-form model text would need fragile parsing and could
break rendering. Model output is also an untrusted input and must be bounded before it reaches
the client.

## Decision

- Call `gemini-2.5-flash` with `responseMimeType: "application/json"` and `responseJsonSchema`
  generated from `GeneratedPlanSchema` using `z.toJSONSchema` ([lib/gemini.ts](../lib/gemini.ts)).
  One Zod schema is both the contract sent to the model and the validator
  ([lib/schema.ts](../lib/schema.ts)).
- Re-validate every response with `GeneratedPlanSchema.safeParse`. Field lengths and array sizes
  use `LIMITS` in [lib/constants.ts](../lib/constants.ts) (for example 3-15 budget lines, 4-25
  milestones, 3-15 vendors, 3-10 ideas, at most 5 questions per vendor).
- Retry once on malformed output (empty, invalid JSON or schema mismatch). Timeouts and upstream
  errors are not retried. Failures map to `PlanGenerationError` codes `malformed`, `timeout` and
  `upstream`, returned as 502, 504 and 502 ([lib/api/planRoute.ts](../lib/api/planRoute.ts)).
- Keep ids and `booked` out of the model contract. The server adds UUIDs and `booked: false`
  ([lib/plan.ts](../lib/plan.ts)); on refinement it carries bookings over by normalised vendor
  category.
- Bound cost and latency with `maxOutputTokens: 8192`, `thinkingBudget: 512` and a 45 second
  abort ([API in lib/constants.ts](../lib/constants.ts)).
- Wrap user data in tagged blocks and instruct the model to treat them as data
  ([lib/prompts.ts](../lib/prompts.ts)).

## Consequences

- The UI can rely on a typed `Plan`; invalid output never reaches the browser, and the client
  validates the response again ([lib/client.ts](../lib/client.ts)).
- Schema changes are made in one place and automatically update the model contract. Changing
  `PlanSchema` also affects stored data; see [ADR-002](ADR-002-localstorage-persistence.md).
- Schema constraints do not guarantee quality: the model can still return budgets that exceed the
  total. The UI shows an over-budget warning rather than rejecting the plan.
- A retry can double latency in the worst case, bounded by the shared 45 second signal.
- The model name and SDK version are pinned; changing either requires re-running the test suite
  because the response shape is part of the contract.
