import type { Metadata } from "next";
import type { ReactElement } from "react";

import { PlanWorkspace } from "@/components/PlanWorkspace";
import { PAGE_TITLES } from "@/lib/messages";

export const metadata: Metadata = {
  title: PAGE_TITLES.workspace,
  robots: { index: false, follow: false },
};

export default function PlanPage(): ReactElement {
  return <PlanWorkspace />;
}
