import type { ExportFile } from "@/lib/export";

/** Saves a file through a temporary Blob URL that is revoked once the download has started. */
export const downloadFile = ({ content, fileName, type }: ExportFile): void => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};
