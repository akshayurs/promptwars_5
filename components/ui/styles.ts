/** Shared class recipes so cards, badges and checkboxes look the same everywhere. */
export const CARD = "rounded-2xl border border-line bg-surface-raised shadow-card";

export const CARD_PADDED = `${CARD} p-5 sm:p-6`;

export const PAGE_TITLE =
  "text-3xl font-semibold tracking-tight text-balance focus:outline-none sm:text-4xl";

export const SECTION_HEADING = "text-lg font-semibold tracking-tight";

export const EYEBROW = "text-xs font-semibold uppercase tracking-wider text-ink-muted";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-muted text-ink",
  brand: "border-brand bg-brand-soft text-brand",
  success: "border-success bg-success-soft text-success",
  warning: "border-warning bg-warning-soft text-warning",
  danger: "border-danger bg-danger-soft text-danger",
};

export const badgeClass = (tone: BadgeTone): string =>
  `inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`;

export const CHECKBOX =
  "mt-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-control bg-surface-raised text-on-brand transition-colors hover:border-brand data-[state=checked]:border-brand data-[state=checked]:bg-brand";

export const TEXT_LINK =
  "font-medium text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand";
