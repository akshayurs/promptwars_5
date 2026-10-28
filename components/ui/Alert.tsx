import type { ReactElement, ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error";

export type AlertProps = {
  tone: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Set false when nested inside another live region or focused container. */
  live?: boolean;
};

const TONES: Record<Tone, { box: string; icon: string; glyph: string }> = {
  info: {
    box: "border-brand/35 bg-brand-soft text-ink",
    icon: "bg-brand text-on-brand",
    glyph: "i",
  },
  success: {
    box: "border-success/35 bg-success-soft text-success",
    icon: "bg-success text-success-soft",
    glyph: "✓",
  },
  warning: {
    box: "border-warning/35 bg-warning-soft text-warning",
    icon: "bg-warning text-warning-soft",
    glyph: "\u26A0\uFE0E",
  },
  error: {
    box: "border-danger/35 bg-danger-soft text-danger",
    icon: "bg-danger text-danger-soft",
    glyph: "✕",
  },
};

const liveRole = (tone: Tone): "alert" | "status" => (tone === "error" ? "alert" : "status");

export const Alert = ({
  tone,
  title,
  children,
  className = "",
  live = true,
}: AlertProps): ReactElement => (
  <div
    role={live ? liveRole(tone) : undefined}
    className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed ${TONES[tone].box} ${className}`}
  >
    <span
      aria-hidden="true"
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs leading-none font-bold ${TONES[tone].icon}`}
    >
      {TONES[tone].glyph}
    </span>
    <div className="flex min-w-0 flex-col gap-0.5 wrap-anywhere">
      {title ? <p className="font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  </div>
);
