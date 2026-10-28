import type { Metadata } from "next";
import type { ReactElement } from "react";

import { EditEventDetails } from "@/components/intake/EditEventDetails";

export const metadata: Metadata = {
  title: "Edit event details",
  robots: { index: false, follow: false },
};

export default function EditEventPage(): ReactElement {
  return <EditEventDetails />;
}
