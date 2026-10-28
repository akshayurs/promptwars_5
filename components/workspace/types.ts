import type { WorkspaceAction } from "@/lib/workspace";

/** Sends an action to the workspace store. */
export type Dispatch = (action: WorkspaceAction) => void;

/** Flips the done or booked state of the item with this id. */
export type Toggle = (id: string) => void;
