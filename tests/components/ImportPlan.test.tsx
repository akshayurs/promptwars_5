import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ImportPlan } from "@/components/intake/ImportPlan";
import { LIMITS } from "@/lib/constants";
import { IMPORT_MESSAGES } from "@/lib/importWorkspace";
import { workspaceStore } from "@/lib/workspaceStore";

import { makeWorkspace } from "./fixtures";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const jsonFile = (text: string, name = "party-plan.json"): File =>
  new File([text], name, { type: "application/json" });

const input = (): HTMLInputElement => screen.getByLabelText("Import a saved plan (JSON)");

describe("ImportPlan", () => {
  beforeEach(() => {
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });

  it("renders a labelled JSON file input that explains it replaces the saved plan", () => {
    render(<ImportPlan />);
    expect(screen.getByRole("heading", { level: 2, name: "Already have a plan?" })).toBeVisible();
    expect(input()).toHaveAttribute("type", "file");
    expect(input()).toHaveAttribute("accept", ".json,application/json");
    expect(input()).toHaveAccessibleDescription(/replaces any plan saved in this browser/);
    expect(input()).not.toHaveAttribute("aria-invalid");
  });

  it("stores a valid exported plan and opens the workspace", async () => {
    const user = userEvent.setup();
    const workspace = makeWorkspace();
    render(<ImportPlan />);
    await user.upload(input(), jsonFile(JSON.stringify(workspace, null, 2)));
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledExactlyOnceWith("/plan");
    });
    expect(workspaceStore.getSnapshot().workspace).toEqual(workspace);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
    const user = userEvent.setup();
    render(<ImportPlan />);
    await user.upload(input(), file);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(input()).toHaveAccessibleDescription(
      new RegExp(`${message.replace(/[.()]/g, "\\$&")}$`),
    );
    expect(input()).toHaveValue("");
    expect(workspaceStore.getSnapshot().workspace).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("clears the error once a valid file is chosen", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<ImportPlan store={{ dispatch }} />);
    await user.upload(input(), jsonFile("[]"));
    expect(await screen.findByRole("alert")).toBeVisible();
    const workspace = makeWorkspace();
    await user.upload(input(), jsonFile(JSON.stringify(workspace)));
    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "replace", workspace });
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input()).not.toHaveAttribute("aria-invalid");
  });

  it("does nothing when the file chooser is dismissed", async () => {
    const dispatch = vi.fn();
    render(<ImportPlan store={{ dispatch }} />);
    fireEvent.change(input(), { target: { files: [] } });
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
