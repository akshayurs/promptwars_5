# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-10-29

### Added

- Edit event details after generation; the plan adapts to the new details and keeps completed milestones, booked vendors and your own budget lines.
- Import a previously exported plan (validated, size-capped, with confirmation before replacing a saved plan).
- Calendar (.ics) and budget (CSV) downloads on the summary page.
- Cancel buttons for plan generation and refinement, a reassurance message during long requests, and a confirmation before a new plan replaces a saved one.
- Vendors link to the budget line they serve; the server retries once when supplier budget lines have no vendor.
- Undo after removing a budget line; inline errors for out-of-range amounts and totals.
- A visible notice when changes cannot be saved in this browser, and a privacy notice next to the generate button.
- API hardening: `RateLimit` headers, per-client in-flight cap, IPv6 /64 rate-limit keys, full-origin cross-site checks, 405 with `Allow` for other methods, API response CSP, CSP violation reporting and rejection logging.
- Gemini safety settings, off-topic request handling, compact prompts with plain field labels, and lower temperature for refinement.
- CodeQL, dependency review, Gitleaks and Dependabot workflows; SHA-pinned actions; MIT licence; `security.txt`.

### Changed

- Timelines are always shown in date order with phases that only move forward.
- Validation messages use plain language; hidden control and bidirectional characters are removed from text input.
- Model output schemas are server-only, Zod runs jitless only in the browser, storage writes are debounced, and secondary panels load on demand.
- Serverless functions run in the Mumbai region.
- Coverage thresholds are 100% for all metrics across `lib`, `components`, `app` and `instrumentation.ts`; unit and API tests run in Node against a fixed clock in UTC.

### Fixed

- Countdown and due-soon badges use the local calendar day.
- Layout shift while the workspace loads on small screens.
- Focus is no longer moved to the page heading on a direct page load, so the skip link stays the first Tab stop.

## [1.0.0] - 2026-10-28

### Added

- Intake form with type-specific fields for weddings (couple names, ceremony style), birthdays (guest of honour, age) and community events (admission type, permit need).
- Gemini 2.5 Flash plan generation with schema-constrained JSON output, validation, one retry on malformed output, and deterministic guards for budget fit and lead times.
- Budget table with editable amounts and total, add and remove lines, and an allocated-versus-total status with an over-budget warning.
- Timeline grouped by phase with real dates, completion checkboxes, progress, "Overdue" and "Due this week" badges, and a "Next up" card.
- Vendor checklist with why-needed, questions to ask, a booked checkbox and progress.
- Personalised ideas that name the intake detail that inspired them.
- Refine panel that revises the whole plan from a free-text instruction, carries over booked vendors and completed milestones, and supports one-step undo.
- Printable summary, JSON export and start over; plans persist in the browser only.
- Accessibility improvements: busy states, error links and a high-contrast mode.
- Cross-site request rejection (403) on the API routes.
- Continuous integration with lint, format, typecheck, unit tests with coverage, knip, build and Playwright end-to-end tests with axe-core.

### Fixed

- Model text is truncated at word boundaries.
- Budget amounts stay visible on narrow screens.
- Turbopack build cache disabled to keep production builds reliable.

[Unreleased]: https://github.com/akshayurs/promptwars_5/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/akshayurs/promptwars_5/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/akshayurs/promptwars_5/releases/tag/v1.0.0
