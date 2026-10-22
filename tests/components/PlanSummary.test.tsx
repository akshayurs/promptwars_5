import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlanSummary } from "@/components/PlanSummary";
import { STORAGE_KEY } from "@/lib/constants";
import { workspaceStore } from "@/lib/workspaceStore";

import { makeIntake, makeWorkspace, readStoredWorkspace } from "./fixtures";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const stubAnchorClick = (): HTMLAnchorElement[] => {
  const anchors: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    anchors.push(this);
  });
  return anchors;
};

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

describe("PlanSummary", () => {
  beforeEach(() => {
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: makeWorkspace() });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.restoreAllMocks();
  });

  it("renders read-only sections with no inputs or checkboxes", () => {
    render(<PlanSummary />);
    expect(screen.getByRole("heading", { level: 1, name: "Asha & Ravi Wedding" })).toBeVisible();
    expect(screen.getByRole("table", { name: "Budget allocation" })).toBeVisible();
    expect(screen.getByRole("heading", { name: /^Timeline to / })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Vendor checklist" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Personalised ideas" })).toBeVisible();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("prints via window.print", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PlanSummary />);
    await user.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("exports JSON as a Blob download named after the event", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    const createUrl = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:mock-url";
    });
    const revokeUrl = vi.fn();
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = revokeUrl;
    const anchors = stubAnchorClick();
    render(<PlanSummary />);
    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(anchors).toHaveLength(1);
    const anchor = anchors[0];
    expect(anchor?.download).toBe("asha-ravi-wedding-plan.json");
    expect(anchor?.href).toBe("blob:mock-url");
    await vi.waitFor(() => {
      expect(revokeUrl).toHaveBeenCalledExactlyOnceWith("blob:mock-url");
    });
    const blob = blobs[0];
    expect(blob?.type).toBe("application/json");
    const parsed: unknown = JSON.parse((await blob?.text()) ?? "null");
    expect(parsed).toEqual(workspaceStore.getSnapshot().workspace);
  });

  it("falls back to a generic file name for symbol-only event names", async () => {
    const user = userEvent.setup();
    workspaceStore.dispatch({
      type: "replace",
      workspace: makeWorkspace({ intake: makeIntake({ eventName: "!!" }) }),
    });
    URL.createObjectURL = () => "blob:x";
    URL.revokeObjectURL = () => undefined;
    const anchors = stubAnchorClick();
    render(<PlanSummary />);
    await user.click(screen.getByRole("button", { name: "Export JSON" }));
    expect(anchors[0]?.download).toBe("event-plan.json");
  });

  it("asks for confirmation before deleting, and Keep it cancels", async () => {
    const user = userEvent.setup();
    render(<PlanSummary />);
    expect(screen.queryByRole("group", { name: "Confirm start over" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("group", { name: "Confirm start over" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start over" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.queryByRole("group", { name: "Confirm start over" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start over" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start over" })).toHaveFocus();
    expect(readStoredWorkspace()).not.toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("Yes, delete clears storage and navigates home", async () => {
    const user = userEvent.setup();
    render(<PlanSummary />);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Start over" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/");
    expect(workspaceStore.getSnapshot().workspace).toBeNull();
  });

  it("shows the empty workspace when there is no plan", () => {
    workspaceStore.dispatch({ type: "replace", workspace: null });
    render(<PlanSummary />);
    expect(screen.getByRole("status")).toHaveTextContent("No plan yet");
    expect(screen.getByRole("heading", { level: 1, name: "Summary" })).toBeVisible();
    expect(screen.getByRole("link", { name: "intake form" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
  });

  it("moves focus to the h1 on mount", () => {
    render(<PlanSummary />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("opens closed details for printing and restores them afterwards", () => {
    const { container } = render(<PlanSummary />);
    const details = [...container.querySelectorAll("details")];
    expect(details.length).toBeGreaterThan(1);
    details[0]!.open = true;
    window.dispatchEvent(new Event("beforeprint"));
    expect(details.every((d) => d.open)).toBe(true);
    window.dispatchEvent(new Event("afterprint"));
    expect(details[0]!.open).toBe(true);
    expect(details.slice(1).every((d) => !d.open)).toBe(true);
  });
});
