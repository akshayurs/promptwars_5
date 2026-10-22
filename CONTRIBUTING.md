# Contributing to EventCraft

## Setup

Requirements: Node.js 20 or newer (CI uses 22) and npm.

```bash
npm ci
# Create .env.local with your own Gemini key (never commit it):
#   GEMINI_API_KEY=<your key>
npm run dev        # http://localhost:3000
```

The server refuses to start generation without `GEMINI_API_KEY` ([lib/env.ts](lib/env.ts)).
Unit, component and e2e tests do not need a real key.

## Scripts

| Script                            | Purpose                                                         |
| --------------------------------- | --------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run lint`                    | ESLint with `--max-warnings 0`                                  |
| `npm run format` / `format:write` | Prettier check / rewrite                                        |
| `npm run typecheck`               | `tsc --noEmit`                                                  |
| `npm test` / `npm run test:watch` | Vitest with v8 coverage and thresholds / watch mode             |
| `npm run test:e2e`                | Playwright (builds and serves the app on port 3100)             |
| `npm run knip`                    | Finds unused files, exports and dependencies                    |
| `npm run check`                   | lint, format, typecheck, test, knip and build in sequence       |

Run `npm run check` before opening a pull request. CI ([.github/workflows/ci.yml](.github/workflows/ci.yml))
runs the same steps plus Playwright. See [docs/TESTING.md](docs/TESTING.md).

## Commits

Use Conventional Commits: `type(scope): subject`.

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`.
- Imperative mood, subject at most 50 characters, no trailing period.
- Add a body only when the reason for the change is not obvious.

Example: `fix(budget): clamp negative line amounts`

## Pull requests

Branch from `main` and fill in [the template](.github/pull_request_template.md). Before requesting
review:

- [ ] `npm run check` passes locally.
- [ ] `npm run test:e2e` passes if you touched UI, routes, headers or the API.
- [ ] New behaviour has tests; coverage stays at or above 95% lines, 90% branches, 95% functions
      and statements.
- [ ] UI changes pass the keyboard checklist in [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).
- [ ] Docs and ADRs are updated when limits, schema or architecture change.
- [ ] No `.env*` files or secrets are included.

## Coding standards

Enforced by [tsconfig.json](tsconfig.json), [eslint.config.mjs](eslint.config.mjs) and
[.prettierrc](.prettierrc):

- TypeScript `strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noUnusedLocals` and `noUnusedParameters`.
- `typescript-eslint` strict and stylistic type-checked rule sets; `type` aliases instead of
  `interface`; `array-simple` array style; type-only imports with `import type`.
- Explicit return types on exported functions; exhaustive `switch` statements.
- Cognitive complexity at most 10, functions at most 60 lines, at most 3 parameters (pass an
  options object instead). Test files are exempt from the function-length rule.
- No nested ternaries, no `console` (use [lib/logger.ts](lib/logger.ts)), strict equality only.
- `jsx-a11y` strict rules and `next/core-web-vitals`.
- Prettier: semicolons, double quotes, trailing commas, 100 column width. See
  [.editorconfig](.editorconfig).
- Dependencies use exact versions. Do not add a dependency that `knip` reports as unused.

## Project conventions

- Limits and model settings live in [lib/constants.ts](lib/constants.ts); do not hard-code them.
- Every external input (request bodies, model output, `localStorage`) is validated with Zod
  schemas from [lib/schema.ts](lib/schema.ts).
- Server-only code stays out of client components; client state goes through
  [lib/workspaceStore.ts](lib/workspaceStore.ts).
- Path alias `@/` maps to the repository root.
