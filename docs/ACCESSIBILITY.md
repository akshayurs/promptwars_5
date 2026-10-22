# Accessibility

Target: WCAG 2.2 level AA. Automated checks run axe-core with the tags `wcag2a`, `wcag2aa`,
`wcag21aa`, `wcag22aa` and `best-practice` ([tests/e2e/accessibility.spec.ts](../tests/e2e/accessibility.spec.ts)).
Automated tools find only part of the issues, so the manual checklist below is required for UI
changes.

## Techniques in use

| WCAG criterion                 | Technique                                                                                                                                             | Where                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text content         | Decorative glyphs (status icons, check marks) are `aria-hidden`; meaning is also given in text                                                        | [Alert.tsx](../components/ui/Alert.tsx), [VendorChecklist.tsx](../components/VendorChecklist.tsx)                                                                          |
| 1.3.1 Info and relationships   | Real `<table>` with `<caption>`, `scope="col"` and `scope="row"`; `<ol>` for the timeline; `<time dateTime>`; labelled `<section>` regions            | [BudgetTable.tsx](../components/BudgetTable.tsx), [Timeline.tsx](../components/Timeline.tsx)                                                                               |
| 1.3.1 / 3.3.2 Labels           | Every input has a `<label>`; hints and errors linked with `aria-describedby`; `aria-invalid` on failure                                               | [Field.tsx](../components/ui/Field.tsx)                                                                                                                                    |
| 1.3.5 Input purpose            | `autoComplete="address-level2"` on location; `inputMode` numeric/decimal on number fields                                                             | [IntakeForm.tsx](../components/IntakeForm.tsx)                                                                                                                             |
| 1.4.1 Use of color             | Alert tone is conveyed by icon and title as well as color; booked vendors get an `sr-only` "(booked)" suffix                                          | [Alert.tsx](../components/ui/Alert.tsx), [VendorChecklist.tsx](../components/VendorChecklist.tsx)                                                                          |
| 1.4.3 / 1.4.11 Contrast        | Color tokens defined for light and dark schemes; error, success and warning text use dedicated darker/lighter tokens; controls use `--control` border | [app/globals.css](../app/globals.css)                                                                                                                                      |
| 1.4.4 / 1.4.10 Resize, reflow  | Responsive layout, `width=device-width`, no fixed-width containers; checked at the Pixel 7 viewport in e2e                                            | [app/layout.tsx](../app/layout.tsx), [playwright.config.ts](../playwright.config.ts)                                                                                       |
| 2.1.1 Keyboard                 | Native controls plus Radix Tabs and Checkbox (arrow-key tabs, space toggles); no keyboard traps                                                       | [PlanWorkspace.tsx](../components/PlanWorkspace.tsx), [VendorChecklist.tsx](../components/VendorChecklist.tsx)                                                             |
| 2.3.3 / motion                 | `prefers-reduced-motion: reduce` collapses animation and transition durations                                                                         | [app/globals.css](../app/globals.css)                                                                                                                                      |
| 2.4.1 Bypass blocks            | "Skip to main content" link is the first focusable element; `<main id="main" tabIndex={-1}>` receives focus                                           | [app/layout.tsx](../app/layout.tsx)                                                                                                                                        |
| 2.4.2 / 2.4.6 Titles, headings | Per-page `metadata.title` with template; exactly one `<h1>` per page (tested)                                                                         | [app/page.tsx](../app/page.tsx), [app/plan/page.tsx](../app/plan/page.tsx)                                                                                                 |
| 2.4.3 Focus order, 3.2.2       | Workspace heading receives focus on mount; focus moves to the error alert after a failed submit and to the status region after a refine               | [PlanWorkspace.tsx](../components/PlanWorkspace.tsx) (`useHeadingFocus`), [IntakeForm.tsx](../components/IntakeForm.tsx), [RefinePanel.tsx](../components/RefinePanel.tsx) |
| 2.4.7 / 2.4.11 Focus visible   | Global `:focus-visible` 3px outline with 2px offset                                                                                                   | [app/globals.css](../app/globals.css)                                                                                                                                      |
| 2.5.8 Target size (minimum)    | Buttons and tab triggers use `min-h-11` (44px); checkbox is 24px (`size-6`)                                                                           | [Button.tsx](../components/ui/Button.tsx), [PlanWorkspace.tsx](../components/PlanWorkspace.tsx)                                                                            |
| 3.1.1 Language                 | `<html lang="en">`                                                                                                                                    | [app/layout.tsx](../app/layout.tsx)                                                                                                                                        |
| 3.3.1 / 3.3.3 Error handling   | `noValidate` forms with custom, field-level messages; failures summarised in an `role="alert"` region                                                 | [IntakeForm.tsx](../components/IntakeForm.tsx), [RefinePanel.tsx](../components/RefinePanel.tsx), [Alert.tsx](../components/ui/Alert.tsx)                                  |
| 4.1.2 Name, role, value        | `aria-current="page"` on active nav link; `aria-label` on nav and tab list; busy buttons use `aria-busy` and `aria-disabled` so they stay focusable   | [NavLink.tsx](../components/NavLink.tsx), [Button.tsx](../components/ui/Button.tsx)                                                                                        |
| 4.1.3 Status messages          | `role="status"` / `aria-live="polite"` for vendor progress, budget status and refine results                                                          | [VendorChecklist.tsx](../components/VendorChecklist.tsx), [BudgetTable.tsx](../components/BudgetTable.tsx), [RefinePanel.tsx](../components/RefinePanel.tsx)               |

Additional: `jsx-a11y` strict rules run in ESLint ([eslint.config.mjs](../eslint.config.mjs)); the
summary page has print styles and hides interactive chrome with `.print-hidden`.

## Manual keyboard checklist

Run on `/`, `/plan` and `/plan/summary`, in light and dark mode, at desktop width and at 320px.

- [ ] First `Tab` reveals "Skip to main content"; `Enter` moves focus to the main region.
- [ ] Every interactive element is reachable by `Tab` in a logical order; focus is always visible.
- [ ] No keyboard trap anywhere, including inside tabs and the refine form.
- [ ] Intake: submit with empty fields; focus lands on the error alert; each invalid field names
      its error; correcting a field and resubmitting works.
- [ ] Plan tabs: arrow keys move between tab triggers; `Tab` enters the active panel.
- [ ] Budget: amount inputs can be edited by keyboard; over-budget warning is announced.
- [ ] Vendors: `Space` toggles the checkbox; progress text updates; "Questions to ask" opens with
      `Enter` or `Space`.
- [ ] Refine: submit with a screen reader running; the result is announced; Undo is reachable.
- [ ] Summary: "Start over" asks for confirmation, focus moves to the safe "keep" button, and
      cancelling returns focus to "Start over".
- [ ] Zoom to 200% and reflow at 320px width: no horizontal scrolling or clipped content.
- [ ] With "reduce motion" enabled, no animation plays.
- [ ] Screen reader (VoiceOver or NVDA): headings, landmarks, table headers and form labels read
      correctly.
