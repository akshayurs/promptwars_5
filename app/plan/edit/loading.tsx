import type { ReactElement } from "react";

import { LoadingNotice } from "@/components/WorkspaceStates";

export default function EditLoading(): ReactElement {
  return <LoadingNotice title="Edit event details" />;
}
