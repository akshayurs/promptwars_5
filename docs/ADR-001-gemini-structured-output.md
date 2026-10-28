# ADR-001: Gemini structured output validated by Zod

Status: Accepted

## Context

EventCraft needs a budget, timeline, vendor checklist and ideas as typed data that the UI can edit
(amounts, booked flags) and persist. Free-form model text would need fragile parsing and could
break rendering. Model output is also an untrusted input and must be bounded before it reaches
the client.

## Decision

- Call `gemini-2.5-flash` with `responseMimeType: "application/json"` and `responseJsonSchema`
  generated from `GeneratedPlanSchema` with `z.toJSONSchema`
  ([lib/gemini.ts](../lib/gemini.ts), [lib/generatedPlanSchema.ts](../lib/generatedPlanSchema.ts)).
  Gemini rejects schemas with many constraints, so [lib/geminiSchema.ts](../lib/geminiSchema.ts)
  strips `minLength`, `maxLength`, `minimum`, `maximum`, `minItems`, `maxItems` and `$schema`
  first; the limits reach the model as `description` text instead.
- Parse every response with `LenientGeneratedPlanSchema` (server-only, same file). It enforces the
  minimums, but truncates over-long text at a word boundary and drops list items beyond the
  maximum instead of rejecting the plan. Field lengths and array sizes use `LIMITS` in
  [lib/constants.ts](../lib/constants.ts) (3-15 budget lines, 4-25 milestones, 3-15 vendors,
  3-10 ideas, at most 5 questions per vendor). The strict `PlanSchema` in
  [lib/schema.ts](../lib/schema.ts) still validates the finished plan on the client and in storage.
- Retry once on malformed output (empty, invalid JSON or schema mismatch) or when supplier budget
  lines have no vendor (each vendor names its line in `budgetCategory`); the retry budget is
  shared, and the first valid plan is kept if the retry fails or covers fewer lines. Timeouts and
  upstream errors are not retried, and a blocked prompt or a response whose finish reason is not
  `STOP` is an upstream failure ([lib/geminiResponse.ts](../lib/geminiResponse.ts)).
  Failures map to `PlanGenerationError` codes `malformed` (502), `upstream` (502), `timeout` (504)
  and `busy` (503, when Gemini answers 429 or 503; sent with `Retry-After`)
  ([lib/api/planRoute.ts](../lib/api/planRoute.ts)).
- Keep ids, `done` and `booked` out of the model contract. The server adds UUIDs, `done: false`
  and `booked: false` ([lib/plan.ts](../lib/plan.ts)); on refinement it carries bookings over by
  normalised vendor category, completion by normalised milestone title and the `addedByUser`
  flag by budget category. It also scales the
  budget down to the total and clamps lead times to the days remaining (`fitPlanToIntake`).
- Request `BLOCK_MEDIUM_AND_ABOVE` safety settings for the four adjustable harm categories, and
  tell the model in the system prompt to ignore text that is not about planning the event.
- Bound cost and latency with `maxOutputTokens: 16384`, `thinkingBudget: 512`, temperature 0.7
  for generation and 0.3 for refinement, and a 45 second abort (`API` in
  [lib/constants.ts](../lib/constants.ts)).
- Wrap user data in tagged blocks (`<intake>`, `<current_plan>`, `<keep>`, `<request>`),
  escape `<` inside them and instruct the model to treat them as data
  ([lib/prompts.ts](../lib/prompts.ts), [lib/promptBlocks.ts](../lib/promptBlocks.ts)).

## Consequences

- The UI can rely on a typed `Plan`; invalid output never reaches the browser, and the client
  validates the response again ([lib/client.ts](../lib/client.ts)).
- Schema changes are made in one place and automatically update the model contract. Changing
  `PlanSchema` also affects stored data; see [ADR-002](ADR-002-localstorage-persistence.md).
- Schema constraints do not guarantee quality: the model can still return budgets that exceed the
  total. The server scales the amounts down to fit, and the UI shows an over-budget warning if the
  planner later raises them.
- A retry can double latency in the worst case, bounded by the shared 45 second signal.
- The model name and SDK version are pinned; changing either requires re-running the test suite
  because the response shape is part of the contract.
