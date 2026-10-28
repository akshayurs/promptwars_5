import type { Metadata } from "next";
import type { ReactElement } from "react";

import { PlanSummary } from "@/components/PlanSummary";
import { PAGE_TITLES } from "@/lib/messages";

export const metadata: Metadata = {
  title: PAGE_TITLES.summary,
  robots: { index: false, follow: false },
};

export default function SummaryPage(): ReactElement {
  return <PlanSummary />;
}
