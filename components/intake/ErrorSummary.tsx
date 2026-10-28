"use client";

import { useId, type MouseEvent, type ReactElement, type RefObject } from "react";

import { Alert } from "@/components/ui/Alert";
import type { FieldIssues } from "@/lib/types";

import { FIELD_LABELS, fieldId } from "./fieldLabels";

const FIELD_ENTRIES = Object.entries(FIELD_LABELS);

// Each link targets its field by id (the href fragment), so the field is looked up by that id.
const focusField =
  (id: string) =>
  (event: MouseEvent<HTMLAnchorElement>): void => {
    const field = document.getElementById(id);
    if (!field) {
      return;
    }
    event.preventDefault();
    field.focus();
  };

/** Links each invalid field so keyboard and screen reader users can jump straight to it. */
const ErrorLinks = ({ issues }: { issues: FieldIssues }): ReactElement | null => {
  const invalid = FIELD_ENTRIES.filter(([key]) => issues[key]);
  if (invalid.length === 0) {
    return null;
  }
  return (
    <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
      {invalid.map(([key, label]) => (
        <li key={key}>
          <a
            href={`#${fieldId(key)}`}
            onClick={focusField(fieldId(key))}
            className="inline-flex min-h-6 items-center font-medium underline underline-offset-4"
          >
            {label}: {issues[key]}
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

/** Focusable, labelled summary shown at the top of the form after a failed submit. */
export const ErrorSummary = ({
  message,
  issues,
  summaryRef,
}: ErrorSummaryProps): ReactElement | null => {
  const titleId = useId();
  if (!message) {
    return null;
  }
  return (
    <div ref={summaryRef} tabIndex={-1} role="group" aria-labelledby={titleId}>
      <Alert tone="error" live={false}>
        <p id={titleId} className="font-semibold">
          There is a problem
        </p>
        <p>{message}</p>
        <ErrorLinks issues={issues} />
      </Alert>
    </div>
  );
};
