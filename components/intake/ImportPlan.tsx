"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ChangeEvent, type ReactElement } from "react";

import { CARD_PADDED, SECTION_HEADING } from "@/components/ui/styles";
import { readWorkspaceImport } from "@/lib/importWorkspace";
import { workspaceStore, type WorkspaceStore } from "@/lib/workspaceStore";

const FILE_INPUT =
  "min-h-11 w-full cursor-pointer rounded-lg border border-control bg-surface-raised text-sm text-ink file:mr-3 file:min-h-11 file:cursor-pointer file:border-0 file:border-r file:border-control file:bg-surface-muted file:px-4 file:font-semibold file:text-ink aria-[invalid=true]:border-danger";

type ImportPlanProps = { store?: Pick<WorkspaceStore, "dispatch"> };

/** Restores a plan exported as JSON, validating it before it replaces the saved one. */
export const ImportPlan = ({ store = workspaceStore }: ImportPlanProps): ReactElement => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [headingId, inputId, hintId, errorId] = [useId(), useId(), useId(), useId()];

  const onFile = async (input: HTMLInputElement): Promise<void> => {
    const file = input.files?.[0];
    if (!file) return;
    const result = await readWorkspaceImport(file);
    if (!result.ok) {
      setError(result.message);
      input.value = "";
      return;
    }
    setError(null);
    store.dispatch({ type: "replace", workspace: result.workspace });
    router.push("/plan");
  };

  return (
    <section aria-labelledby={headingId} className={`${CARD_PADDED} flex flex-col gap-3`}>
      <h2 id={headingId} className={SECTION_HEADING}>
        Already have a plan?
      </h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          Import a saved plan (JSON)
        </label>
        <p id={hintId} className="text-sm text-ink-muted">
          Choose a file exported from the plan summary. It replaces any plan saved in this browser.
        </p>
        <input
          id={inputId}
          type="file"
          accept=".json,application/json"
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          aria-invalid={error ? true : undefined}
          className={FILE_INPUT}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            void onFile(event.currentTarget);
          }}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
};
