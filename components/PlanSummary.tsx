"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactElement } from "react";

import { BudgetTable } from "@/components/BudgetTable";
import { IdeasList } from "@/components/IdeasList";
import {
  EmptyWorkspace,
  EventFacts,
  LoadingNotice,
  useHeadingFocus,
} from "@/components/PlanWorkspace";
import { Timeline } from "@/components/Timeline";
import { useWorkspace } from "@/components/useWorkspace";
import { VendorChecklist } from "@/components/VendorChecklist";
import { Button } from "@/components/ui/Button";
import type { StoredWorkspace } from "@/lib/schema";

const exportFileName = (eventName: string): string =>
  `${
    eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "event"
  }-plan.json`;

const downloadJson = (workspace: StoredWorkspace): void => {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFileName(workspace.intake.eventName);
  anchor.click();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};

/** Opens every <details> for printing and restores their state afterwards. */
const usePrintExpandedDetails = (): void => {
  useEffect(() => {
    let closed: HTMLDetailsElement[] = [];
    const expand = (): void => {
      closed = [...document.querySelectorAll("details")].filter((details) => !details.open);
      closed.forEach((details) => {
        details.open = true;
      });
    };
    const restore = (): void => {
      closed.forEach((details) => {
        details.open = false;
      });
      closed = [];
    };
    window.addEventListener("beforeprint", expand);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", expand);
      window.removeEventListener("afterprint", restore);
    };
  }, []);
};

const ResetControl = ({ onReset }: { onReset: () => void }): ReactElement => {
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const startOverRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
    else if (wasConfirming.current) startOverRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  if (!confirming) {
    return (
      <Button
        ref={startOverRef}
        variant="danger"
        onClick={() => {
          setConfirming(true);
        }}
      >
        Start over
      </Button>
    );
  }
  return (
    <span role="group" aria-label="Confirm start over" className="flex items-center gap-2 text-sm">
      Delete this plan from the browser?
      <Button variant="danger" onClick={onReset}>
        Yes, delete
      </Button>
      <Button
        ref={keepRef}
        variant="secondary"
        onClick={() => {
          setConfirming(false);
        }}
      >
        Keep it
      </Button>
    </span>
  );
};

const SummaryActions = ({
  workspace,
  onReset,
}: {
  workspace: StoredWorkspace;
  onReset: () => void;
}): ReactElement => (
  <div className="print-hidden flex flex-wrap items-center gap-3">
    <Button
      variant="secondary"
      onClick={() => {
        window.print();
      }}
    >
      Print
    </Button>
    <Button
      variant="secondary"
      onClick={() => {
        downloadJson(workspace);
      }}
    >
      Export JSON
    </Button>
    <ResetControl onReset={onReset} />
  </div>
);

const LoadedSummary = ({
  workspace,
  onReset,
}: {
  workspace: StoredWorkspace;
  onReset: () => void;
}): ReactElement => {
  const headingRef = useHeadingFocus();
  usePrintExpandedDetails();
  const { intake, plan } = workspace;
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold">
          {intake.eventName}
        </h1>
        <p>{plan.summary}</p>
        <EventFacts workspace={workspace} />
        <SummaryActions workspace={workspace} onReset={onReset} />
      </header>
      <BudgetTable
        lines={plan.budget}
        totalBudget={intake.totalBudget}
        currency={intake.currency}
      />
      <Timeline timeline={plan.timeline} eventDate={intake.eventDate} />
      <VendorChecklist vendors={plan.vendors} />
      <IdeasList ideas={plan.ideas} />
    </article>
  );
};

export const PlanSummary = (): ReactElement => {
  const router = useRouter();
  const { workspace, status, dispatch } = useWorkspace();
  if (status === "loading") return <LoadingNotice title="Summary" />;
  if (!workspace) return <EmptyWorkspace title="Summary" />;
  return (
    <LoadedSummary
      workspace={workspace}
      onReset={() => {
        dispatch({ type: "replace", workspace: null });
        router.push("/");
      }}
    />
  );
};
