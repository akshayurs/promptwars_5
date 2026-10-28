import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlanSummary } from "@/components/PlanSummary";
import { STORAGE_KEY } from "@/lib/constants";
import { workspaceStore } from "@/lib/workspaceStore";

import { makeIntake, makeWorkspace, readStoredWorkspace } from "./fixtures";
import { flushIdleCallbacks } from "./lazy";

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
    const user = userEvent.setup({ delay: null });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PlanSummary />);
    await user.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("exports JSON as a Blob download named after the event", async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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

  it.each([
    ["Download calendar (.ics)", "asha-ravi-wedding-calendar.ics", "text/calendar;charset=utf-8"],
    ["Download budget (CSV)", "asha-ravi-wedding-budget.csv", "text/csv;charset=utf-8"],
  ])("%s downloads %s", async (label, fileName, type) => {
    const user = userEvent.setup({ delay: null });
    const blobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob) => {
      blobs.push(blob);
      return "blob:export";
    };
    const revokeUrl = vi.fn();
    URL.revokeObjectURL = revokeUrl;
    const anchors = stubAnchorClick();
    render(<PlanSummary />);
    await user.click(screen.getByRole("button", { name: label }));
    expect(anchors[0]?.download).toBe(fileName);
    expect(blobs[0]?.type).toBe(type);
    await vi.waitFor(() => {
      expect(revokeUrl).toHaveBeenCalledExactlyOnceWith("blob:export");
    });
  });

  it("calendar export holds the event day and every milestone", async () => {
    const user = userEvent.setup({ delay: null });
    const blobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob) => {
      blobs.push(blob);
      return "blob:ics";
    };
    URL.revokeObjectURL = () => undefined;
    stubAnchorClick();
    render(<PlanSummary />);
    await user.click(screen.getByRole("button", { name: "Download calendar (.ics)" }));
    const text = (await blobs[0]?.text()) ?? "";
    const { plan } = workspaceStore.getSnapshot().workspace!;
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(plan.timeline.length + 1);
    expect(text).toContain("SUMMARY:Asha & Ravi Wedding");
  });

  it("budget export lists every line and a total", async () => {
    const user = userEvent.setup({ delay: null });
    const blobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob) => {
      blobs.push(blob);
      return "blob:csv";
    };
    URL.revokeObjectURL = () => undefined;
    stubAnchorClick();
    render(<PlanSummary />);
    await user.click(screen.getByRole("button", { name: "Download budget (CSV)" }));
    const rows = ((await blobs[0]?.text()) ?? "").split("\r\n");
    expect(rows[0]).toBe("Category,Amount,Currency,Why it matters");
    expect(rows).toContain("Venue,200000,INR,Hall for guests");
    expect(rows).toContain("Total allocated,400000,INR,");
  });

  it("asks for confirmation before deleting, and Keep it cancels", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PlanSummary />);
    expect(
      screen.queryByRole("group", { name: "Delete this plan from the browser?" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("group", { name: "Delete this plan from the browser?" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start over" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(
      screen.queryByRole("group", { name: "Delete this plan from the browser?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start over" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start over" })).toHaveFocus();
    expect(readStoredWorkspace()).not.toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("Yes, delete clears storage and navigates home", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PlanSummary />);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Start over" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/");
    expect(workspaceStore.getSnapshot().workspace).toBeNull();
  });

  it("shows the empty workspace when there is no plan", async () => {
    workspaceStore.dispatch({ type: "replace", workspace: null });
    render(<PlanSummary />);
    await flushIdleCallbacks();
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
