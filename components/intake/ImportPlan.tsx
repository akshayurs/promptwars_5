"use client";

import { useId, useRef, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { DownloadIcon } from "@/components/ui/Icons";
import { CARD_PADDED, SECTION_HEADING } from "@/components/ui/styles";
import { workspaceStore } from "@/lib/workspaceStore";

import { ReplaceConfirm } from "./ReplaceConfirm";
import { useImportPlan, type ImportStore, type PlanImport } from "./useImportPlan";

const FILE_INPUT =
  "min-h-11 w-full cursor-pointer rounded-lg border border-control bg-surface-raised text-sm text-ink file:mr-3 file:min-h-11 file:cursor-pointer file:border-0 file:border-r file:border-control file:bg-surface-muted file:px-4 file:font-semibold file:text-ink aria-[invalid=true]:border-danger";

const FileField = ({ plan }: { plan: Pick<PlanImport, "error" | "choose"> }): ReactElement => {
  const [inputId, hintId, errorId] = [useId(), useId(), useId()];
  const { error } = plan;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        Import a saved plan (JSON)
      </label>
      <p id={hintId} className="text-sm text-ink-muted">
        Choose a file exported from the plan summary, then select Import plan. It replaces any plan
        saved in this browser.
      </p>
      <input
        id={inputId}
        type="file"
        accept=".json,application/json"
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={error ? true : undefined}
        className={FILE_INPUT}
        onChange={(event) => {
          plan.choose(event.currentTarget.files?.[0] ?? null);
        }}
      />
      {error ? (
        <p
          key={error.attempt}
          id={errorId}
          role="alert"
          className="text-sm font-medium text-danger"
        >
          {error.text}
        </p>
      ) : null}
    </div>
  );
};

type ImportPlanProps = { store?: ImportStore };

/** Restores a plan exported as JSON, validating it and confirming before it replaces the saved one. */
export const ImportPlan = ({ store = workspaceStore }: ImportPlanProps): ReactElement => {
  const plan = useImportPlan(store);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`${CARD_PADDED} flex flex-col gap-3`}>
      <h2 id={headingId} className={SECTION_HEADING}>
        Already have a plan?
      </h2>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void plan.submit();
        }}
      >
        <FileField plan={plan} />
        {plan.replacing ? (
          <ReplaceConfirm
            name={plan.replacing.name}
            action="Importing this file"
            confirmLabel="Replace with imported plan"
            onReplace={plan.replacing.confirm}
            onKeep={() => {
              plan.keep();
              buttonRef.current?.focus();
            }}
          />
        ) : null}
        <Button ref={buttonRef} type="submit" variant="secondary" className="self-start">
          <DownloadIcon />
          Import plan
        </Button>
      </form>
    </section>
  );
};
