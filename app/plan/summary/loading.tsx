import type { ReactElement } from "react";

import { LoadingNotice } from "@/components/WorkspaceStates";

export default function SummaryLoading(): ReactElement {
  return <LoadingNotice title="Summary" />;
}
