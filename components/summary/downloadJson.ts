import type { StoredWorkspace } from "@/lib/schema";

const exportFileName = (eventName: string): string =>
  `${
    eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "event"
  }-plan.json`;

export const downloadJson = (workspace: StoredWorkspace): void => {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFileName(workspace.intake.eventName);
  anchor.click();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};
