"use client";

import type { ComponentType, ReactElement } from "react";

import { downloadFile } from "@/components/summary/downloadFile";
import { ResetControl } from "@/components/summary/ResetControl";
import { Button } from "@/components/ui/Button";
import { CalendarIcon, DownloadIcon, PrinterIcon, WalletIcon } from "@/components/ui/Icons";
import { budgetCsvFile, calendarFile, planJsonFile, type ExportFile } from "@/lib/export";
import type { StoredWorkspace } from "@/lib/schema";

const EXPORTS = [
  { label: "Export JSON", Icon: DownloadIcon, build: planJsonFile },
  { label: "Download calendar (.ics)", Icon: CalendarIcon, build: calendarFile },
  { label: "Download budget (CSV)", Icon: WalletIcon, build: budgetCsvFile },
] as const satisfies ReadonlyArray<{
  label: string;
  Icon: ComponentType;
  build: (workspace: StoredWorkspace) => ExportFile;
}>;

export const SummaryActions = ({
  workspace,
  onReset,
}: {
  workspace: StoredWorkspace;
  onReset: () => void;
}): ReactElement => (
  <div className="print-hidden flex flex-wrap items-center gap-3 border-t border-line pt-4">
    <Button
      variant="secondary"
      onClick={() => {
        window.print();
      }}
    >
      <PrinterIcon />
      Print
    </Button>
    {EXPORTS.map(({ label, Icon, build }) => (
      <Button
        key={label}
        variant="secondary"
        onClick={() => {
          downloadFile(build(workspace));
        }}
      >
        <Icon />
        {label}
      </Button>
    ))}
    <ResetControl onReset={onReset} />
  </div>
);
