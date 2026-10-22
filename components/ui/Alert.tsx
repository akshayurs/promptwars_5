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

const TONES: Record<Tone, { box: string; icon: string }> = {
  info: { box: "border-line bg-surface-raised", icon: "ℹ" },
  success: { box: "border-success bg-success-soft text-success", icon: "✓" },
  warning: { box: "border-warning bg-warning-soft text-warning", icon: "⚠" },
  error: { box: "border-danger bg-danger-soft text-danger", icon: "✕" },
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
    className={`flex gap-3 rounded-md border px-4 py-3 text-sm ${TONES[tone].box} ${className}`}
  >
    <span aria-hidden="true" className="font-bold">
      {TONES[tone].icon}
    </span>
    <div>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  </div>
);
