import type { Metadata } from "next";
import type { ReactElement } from "react";

import { PlanSummary } from "@/components/PlanSummary";

export const metadata: Metadata = {
  title: "Summary",
  robots: { index: false, follow: false },
};

export default function SummaryPage(): ReactElement {
  return <PlanSummary />;
}
