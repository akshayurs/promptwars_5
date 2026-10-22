import type { Metadata } from "next";
import type { ReactElement } from "react";

import { PlanWorkspace } from "@/components/PlanWorkspace";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default function PlanPage(): ReactElement {
  return <PlanWorkspace />;
}
