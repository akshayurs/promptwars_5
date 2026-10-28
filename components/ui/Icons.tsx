import type { ReactElement, ReactNode } from "react";

type IconProps = { className?: string | undefined };

const STROKE_WIDTH = 1.75;

const Svg = ({
  className = "size-4",
  children,
}: IconProps & { children: ReactNode }): ReactElement => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
  >
    {children}
  </svg>
);

export const LogoMark = ({ className = "size-7" }: IconProps): ReactElement => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" className={`shrink-0 ${className}`}>
    <rect width="32" height="32" rx="9" className="fill-brand" />
    <path
      d="M16 7.5l2.1 5.6 5.9.4-4.6 3.7 1.5 5.8-4.9-3.3-4.9 3.3 1.5-5.8L8 13.5l5.9-.4z"
      className="fill-on-brand"
    />
  </svg>
);

export const SparklesIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </Svg>
);

export const WalletIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4" />
    <path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V9H6.5A2.5 2.5 0 0 1 4 7.5z" />
    <path d="M16 14.5h.01" />
  </Svg>
);

export const CalendarIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Svg>
);

export const ChecklistIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6.5h9M11 12.5h9M11 18.5h9" />
  </Svg>
);

export const BulbIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </Svg>
);

export const UsersIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6" />
  </Svg>
);

export const MapPinIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const HeartIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
  </Svg>
);

export const CakeIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M4 20h16v-6.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 13.5zM4 15.5c2 1.3 4 1.3 5.3 0 1.4 1.3 4 1.3 5.4 0 1.3 1.3 3.3 1.3 5.3 0M12 11V8M12 5.5v-.01" />
  </Svg>
);

export const CheckIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const ChevronDownIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const PrinterIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M7 9V3.5h10V9M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    <path d="M7 14h10v6.5H7z" />
  </Svg>
);

export const DownloadIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15" />
  </Svg>
);

export const ArrowRightIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const TrashIcon = ({ className }: IconProps): ReactElement => (
  <Svg className={className}>
    <path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9.5 7V4.5h5V7" />
  </Svg>
);
