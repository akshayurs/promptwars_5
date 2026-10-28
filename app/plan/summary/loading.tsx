import type { ReactElement } from "react";

import { LoadingNotice } from "@/components/WorkspaceStates";
import { PAGE_TITLES } from "@/lib/messages";

export default function SummaryLoading(): ReactElement {
  return <LoadingNotice title={PAGE_TITLES.summary} />;
}
