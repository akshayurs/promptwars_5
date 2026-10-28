import { LIMITS } from "@/lib/constants";
import { StoredWorkspaceSchema, type StoredWorkspace } from "@/lib/schema";

export type ImportResult =
  { ok: true; workspace: StoredWorkspace } | { ok: false; message: string };

const BYTES_PER_KB = 1_024;

export const IMPORT_MESSAGES = {
  tooLarge: `Choose a file smaller than ${LIMITS.importFileBytes / BYTES_PER_KB} KB.`,
  unreadable: "This file could not be read. Try choosing it again.",
  notJson: "This file is not valid JSON. Choose a plan you exported from EventCraft.",
  wrongShape:
    "This file is not an EventCraft plan, or it was exported by an older version of the app.",
} as const;

const failure = (message: string): ImportResult => ({ ok: false, message });

const parseJson = (text: string): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};

/** Validates the text of an exported plan file against the stored workspace shape. */
export const parseWorkspaceImport = (text: string): ImportResult => {
  const json = parseJson(text);
  if (!json.ok) return failure(IMPORT_MESSAGES.notJson);
  const parsed = StoredWorkspaceSchema.safeParse(json.value);
  return parsed.success
    ? { ok: true, workspace: parsed.data }
    : failure(IMPORT_MESSAGES.wrongShape);
};

/** Reads and validates a plan file, rejecting oversized files before reading them. */
export const readWorkspaceImport = async (
  file: Pick<Blob, "size" | "text">,
): Promise<ImportResult> => {
  if (file.size > LIMITS.importFileBytes) return failure(IMPORT_MESSAGES.tooLarge);
  const text = await file.text().catch(() => null);
  return text === null ? failure(IMPORT_MESSAGES.unreadable) : parseWorkspaceImport(text);
};
