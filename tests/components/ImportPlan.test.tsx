import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ImportPlan } from "@/components/intake/ImportPlan";
import { LIMITS } from "@/lib/constants";
import type { StoredWorkspace } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { makeIntake, makeWorkspace } from "./fixtures";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const jsonFile = (text: string, name = "party-plan.json"): File =>
  new File([text], name, { type: "application/json" });

const NO_FILE_MESSAGE = "Choose a plan file (JSON) to import.";
const IMPORT_MESSAGES = {
  tooLarge: "Choose a file smaller than 256 KB.",
  notJson: "This file is not valid JSON. Choose a plan you exported from EventCraft.",
  wrongShape:
    "This file is not an EventCraft plan, or it was exported by an older version of the app.",
};

const input = (): HTMLInputElement => screen.getByLabelText("Import a saved plan (JSON)");
const importButton = (): HTMLElement => screen.getByRole("button", { name: "Import plan" });

const memoryStore = (saved: StoredWorkspace | null = null) => ({
  dispatch: vi.fn(),
  getSnapshot: () => ({ status: "ready" as const, workspace: saved, saveFailed: false }),
});

describe("ImportPlan", () => {
  beforeEach(() => {
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });

  it("renders a labelled JSON file input and an explicit import action", () => {
    render(<ImportPlan />);
    expect(screen.getByRole("heading", { level: 2, name: "Already have a plan?" })).toBeVisible();
    expect(input()).toHaveAttribute("type", "file");
    expect(input()).toHaveAttribute("accept", ".json,application/json");
    expect(input()).toHaveAccessibleDescription(/replaces any plan saved in this browser/);
    expect(input()).not.toHaveAttribute("aria-invalid");
    expect(importButton()).toHaveAttribute("type", "submit");
  });

  it("does nothing until Import plan is selected, then stores the plan and opens the workspace", async () => {
    const user = userEvent.setup({ delay: null });
    const workspace = makeWorkspace();
    render(<ImportPlan />);
    await user.upload(input(), jsonFile(JSON.stringify(workspace, null, 2)));
    expect(router.push).not.toHaveBeenCalled();
    expect(workspaceStore.getSnapshot().workspace).toBeNull();

    await user.click(importButton());
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledExactlyOnceWith("/plan");
    });
    expect(workspaceStore.getSnapshot().workspace).toEqual(workspace);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks for a file when Import plan is selected without one", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportPlan />);
    await user.click(importButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(NO_FILE_MESSAGE);
    expect(input()).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    ["malformed JSON", jsonFile("{ not json"), IMPORT_MESSAGES.notJson],
    ["the wrong shape", jsonFile(JSON.stringify({ plan: {} })), IMPORT_MESSAGES.wrongShape],
    [
      "a file over the size cap",
      jsonFile(" ".repeat(LIMITS.importFileBytes + 1)),
      IMPORT_MESSAGES.tooLarge,
    ],
  ])("reports %s accessibly without storing anything", async (_label, file, message) => {
    const user = userEvent.setup({ delay: null });
    render(<ImportPlan />);
    await user.upload(input(), file);
    await user.click(importButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(input()).toHaveAccessibleDescription(
      new RegExp(`${message.replace(/[.()]/g, "\\$&")}$`),
    );
    expect(workspaceStore.getSnapshot().workspace).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("re-inserts the alert when the same error happens again, so it is announced again", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportPlan />);
    await user.upload(input(), jsonFile("{ not json"));
    await user.click(importButton());
    const first = await screen.findByRole("alert");
    await user.click(importButton());
    await vi.waitFor(() => {
      expect(screen.getByRole("alert")).not.toBe(first);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(IMPORT_MESSAGES.notJson);
  });

  it("clears the error once another file is chosen and imports it", async () => {
    const user = userEvent.setup({ delay: null });
    const store = memoryStore();
    render(<ImportPlan store={store} />);
    await user.upload(input(), jsonFile("[]"));
    await user.click(importButton());
    expect(await screen.findByRole("alert")).toBeVisible();
    const workspace = makeWorkspace();
    await user.upload(input(), jsonFile(JSON.stringify(workspace)));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input()).not.toHaveAttribute("aria-invalid");
    await user.click(importButton());
    await vi.waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "replace", workspace });
    });
  });

  it("confirms before replacing a saved plan, and replaces it on confirmation", async () => {
    const user = userEvent.setup({ delay: null });
    const saved = makeWorkspace({ intake: makeIntake({ eventName: "Old party" }) });
    const store = memoryStore(saved);
    const workspace = makeWorkspace();
    render(<ImportPlan store={store} />);
    await user.upload(input(), jsonFile(JSON.stringify(workspace)));
    await user.click(importButton());
    const group = await screen.findByRole("group", { name: "Replace your current plan?" });
    expect(group).toHaveFocus();
    expect(group).toHaveTextContent("Importing this file replaces “Old party”");
    expect(store.dispatch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Replace with imported plan" }));
    expect(store.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "replace", workspace });
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/plan");
  });

  it("keeps the saved plan and returns focus to Import plan when the planner declines", async () => {
    const user = userEvent.setup({ delay: null });
    const store = memoryStore(makeWorkspace());
    render(<ImportPlan store={store} />);
    await user.upload(input(), jsonFile(JSON.stringify(makeWorkspace())));
    await user.click(importButton());
    await user.click(await screen.findByRole("button", { name: "Keep current plan" }));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(importButton()).toHaveFocus();
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("drops a pending confirmation when a different file is chosen", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ImportPlan store={memoryStore(makeWorkspace())} />);
    await user.upload(input(), jsonFile(JSON.stringify(makeWorkspace())));
    await user.click(importButton());
    expect(await screen.findByRole("group")).toBeVisible();
    fireEvent.change(input(), { target: { files: [] } });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    await user.click(importButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(NO_FILE_MESSAGE);
  });
});
