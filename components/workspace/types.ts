import type { WorkspaceAction } from "@/lib/workspace";

/** Sends an action to the workspace store. */
export type Dispatch = (action: WorkspaceAction) => void;
