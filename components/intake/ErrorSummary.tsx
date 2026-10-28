import type { MouseEvent, ReactElement, RefObject } from "react";

import { Alert } from "@/components/ui/Alert";
import type { FieldIssues } from "@/lib/types";

import { FIELD_LABELS, fieldId, type FieldKey } from "./fieldLabels";

const FIELD_KEYS = Object.keys(FIELD_LABELS) as FieldKey[];

const focusField =
  (id: string) =>
  (event: MouseEvent<HTMLAnchorElement>): void => {
    const field = document.getElementById(id);
    if (!field) return;
    event.preventDefault();
    field.focus();
  };

/** Links each invalid field so keyboard and screen reader users can jump straight to it. */
const ErrorLinks = ({ issues }: { issues: FieldIssues }): ReactElement | null => {
  const invalid = FIELD_KEYS.filter((key) => issues[key]);
  if (invalid.length === 0) return null;
  return (
    <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
      {invalid.map((key) => (
        <li key={key}>
          <a
            href={`#${fieldId(key)}`}
            onClick={focusField(fieldId(key))}
            className="inline-flex min-h-6 items-center font-medium underline underline-offset-4"
          >
            {FIELD_LABELS[key]}: {issues[key]}
          </a>
        </li>
      ))}
    </ul>
  );
};

type ErrorSummaryProps = {
  message: string | null;
  issues: FieldIssues;
  summaryRef: RefObject<HTMLDivElement | null>;
};

/** Focusable summary shown at the top of the form after a failed submit. */
export const ErrorSummary = ({
  message,
  issues,
  summaryRef,
}: ErrorSummaryProps): ReactElement | null =>
  message ? (
    <div ref={summaryRef} tabIndex={-1}>
      <Alert tone="error" title="There is a problem" live={false}>
        <p>{message}</p>
        <ErrorLinks issues={issues} />
      </Alert>
    </div>
  ) : null;
