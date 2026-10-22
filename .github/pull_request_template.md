## What

<!-- One or two sentences describing the change. -->

## Why

<!-- The problem or requirement this addresses. Link the issue or ticket. -->

## How tested

- [ ] `npm run check` passes (lint, format, typecheck, unit tests with coverage, knip, build)
- [ ] `npm run test:e2e` passes (required for UI, routing, header or API changes)
- [ ] Manual keyboard pass done for UI changes (see `docs/ACCESSIBILITY.md`)

## Checklist

- [ ] Title follows Conventional Commits, for example `feat(plan): add vendor notes`
- [ ] Tests added or updated, and coverage thresholds still met
- [ ] No `.env*` files, secrets or generated output (`coverage/`, `playwright-report/`) committed
- [ ] Docs updated if behaviour, limits or architecture changed
- [ ] New dependencies are pinned to exact versions and justified in the description
