import type { Metadata } from "next";
import type { ReactElement } from "react";

import { EditEventDetails } from "@/components/intake/EditEventDetails";
import { PAGE_TITLES } from "@/lib/messages";

export const metadata: Metadata = {
  title: PAGE_TITLES.editDetails,
  robots: { index: false, follow: false },
};

export default function EditEventPage(): ReactElement {
  return <EditEventDetails />;
}
