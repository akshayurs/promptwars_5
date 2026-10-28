import type { ReactElement } from "react";

import { ResetControl } from "@/components/summary/ResetControl";
import { downloadJson } from "@/components/summary/downloadJson";
import { Button } from "@/components/ui/Button";
import { DownloadIcon, PrinterIcon } from "@/components/ui/Icons";
import type { StoredWorkspace } from "@/lib/schema";

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
    <Button
      variant="secondary"
      onClick={() => {
        downloadJson(workspace);
      }}
    >
      <DownloadIcon />
      Export JSON
    </Button>
    <ResetControl onReset={onReset} />
  </div>
);
