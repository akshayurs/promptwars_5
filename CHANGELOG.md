# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/akshayurs/promptwars_5/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/akshayurs/promptwars_5/releases/tag/v1.0.0
