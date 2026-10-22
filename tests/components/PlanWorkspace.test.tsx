import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlanWorkspace } from "@/components/PlanWorkspace";
import { requestRefinement } from "@/lib/client";
import { formatMoney, todayIso } from "@/lib/format";
import { workspaceStore } from "@/lib/workspaceStore";

import { makeIntake, makeWorkspace, readStoredWorkspace } from "./fixtures";

const localDatePlus = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayIso(() => date);
};

vi.mock("@/lib/client", () => ({ requestRefinement: vi.fn() }));

const mockedRefine = vi.mocked(requestRefinement);

describe("PlanWorkspace", () => {
  beforeEach(() => {
    mockedRefine.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: makeWorkspace() });
  });

  it("renders the event name, summary and facts", () => {
    const workspace = workspaceStore.getSnapshot().workspace!;
    render(<PlanWorkspace />);
    expect(screen.getByRole("heading", { level: 1, name: "Asha & Ravi Wedding" })).toBeVisible();
    expect(screen.getByText(workspace.plan.summary)).toBeVisible();
    expect(screen.getByText("Date", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      /days away/,
    );
    expect(screen.getByText("Guests", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      "150",
    );
    expect(screen.getByText("Budget", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      formatMoney(500_000, "INR"),
    );
    expect(screen.getByText("Location", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      "Bengaluru",
    );
    expect(screen.getByRole("link", { name: "Open printable summary" })).toHaveAttribute(
      "href",
      "/plan/summary",
    );
  });

  it("moves focus to the h1 on mount", () => {
    render(<PlanWorkspace />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveFocus();
  });

  it.each([
    [0, "(today)"],
    [1, "(tomorrow)"],
    [5, "(5 days away)"],
  ])("shows a countdown for %i days", (days, label) => {
    workspaceStore.dispatch({
      type: "replace",
      workspace: makeWorkspace({ intake: makeIntake({ eventDate: localDatePlus(days) }) }),
    });
    render(<PlanWorkspace />);
    expect(screen.getByText("Date", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      label,
    );
  });

  it("shows no countdown for past dates", () => {
    workspaceStore.dispatch({
      type: "replace",
      workspace: makeWorkspace({ intake: makeIntake({ eventDate: localDatePlus(-3) }) }),
    });
    render(<PlanWorkspace />);
    expect(screen.getByText("Date", { selector: "dt" }).nextElementSibling).not.toHaveTextContent(
      "(",
    );
  });

  it("renders a labelled tablist with the budget panel active by default", () => {
    render(<PlanWorkspace />);
    const tablist = screen.getByRole("tablist", { name: "Plan sections" });
    expect(
      within(tablist)
        .getAllByRole("tab")
        .map((t) => t.textContent),
    ).toEqual(["Budget", "Timeline", "Vendors", "Ideas"]);
    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toContainElement(
      screen.getByLabelText("Venue amount (INR)"),
    );
  });

  it("switches panels by click", async () => {
    const user = userEvent.setup();
    render(<PlanWorkspace />);
    await user.click(screen.getByRole("tab", { name: "Timeline" }));
    expect(screen.getByRole("heading", { name: /^Timeline to / })).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Vendors" }));
    expect(screen.getByRole("heading", { name: "Vendor checklist" })).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(screen.getByRole("heading", { name: "Personalised ideas" })).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Budget" }));
    expect(screen.getByRole("table", { name: "Budget allocation" })).toBeVisible();
  });

  it("switches panels with arrow keys", async () => {
    const user = userEvent.setup();
    render(<PlanWorkspace />);
    screen.getByRole("tab", { name: "Budget" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: /^Timeline to / })).toBeVisible();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Ideas" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Ideas" })).toHaveAttribute("aria-selected", "true");
  });

  it("updates the allocated total and persists a budget edit", () => {
    render(<PlanWorkspace />);
    expect(screen.getAllByText(formatMoney(400_000, "INR")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Venue amount (INR)"), { target: { value: "100000" } });
    expect(screen.getByLabelText("Venue amount (INR)")).toHaveValue(100_000);
    expect(screen.getByRole("cell", { name: formatMoney(300_000, "INR") })).toBeVisible();
    expect(screen.getByText(`${formatMoney(200_000, "INR")} still unallocated.`)).toBeVisible();
    expect(readStoredWorkspace()?.plan.budget[0]?.amount).toBe(100_000);
  });

  it("shows the over-budget warning after an edit", () => {
    render(<PlanWorkspace />);
    fireEvent.change(screen.getByLabelText("Venue amount (INR)"), { target: { value: "400000" } });
    expect(screen.getByText("Over budget")).toBeVisible();
  });

  it("toggles a vendor, updates progress and persists", async () => {
    const user = userEvent.setup();
    render(<PlanWorkspace />);
    await user.click(screen.getByRole("tab", { name: "Vendors" }));
    expect(screen.getByText("0 of 3 vendors booked")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Caterer" }));
    expect(screen.getByText("1 of 3 vendors booked")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /Caterer/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(readStoredWorkspace()?.plan.vendors[0]?.booked).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /Caterer/ }));
    expect(screen.getByText("0 of 3 vendors booked")).toBeVisible();
    expect(readStoredWorkspace()?.plan.vendors[0]?.booked).toBe(false);
  });

  it("includes the refine panel and applies/undoes a refinement", async () => {
    const user = userEvent.setup();
    const current = workspaceStore.getSnapshot().workspace!;
    const refined = {
      ...current.plan,
      summary: "Refined summary",
      ideas: current.plan.ideas.slice(0, 3).map((idea) => ({ ...idea, title: `${idea.title} v2` })),
    };
    mockedRefine.mockResolvedValueOnce({ ok: true, value: refined });
    render(<PlanWorkspace />);
    expect(screen.getByRole("heading", { name: "Refine with AI" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Undo last refinement" })).toBeDisabled();

    await user.type(screen.getByLabelText("What should change?"), "rename ideas");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));

    expect(await screen.findByText("Refined summary")).toBeVisible();
    expect(readStoredWorkspace()?.plan.summary).toBe("Refined summary");
    const undo = screen.getByRole("button", { name: "Undo last refinement" });
    expect(undo).toBeEnabled();
    await user.click(undo);
    expect(screen.getByText(current.plan.summary)).toBeVisible();
    expect(readStoredWorkspace()?.plan.summary).toBe(current.plan.summary);
  });

  it("shows the empty workspace with a link home when nothing is stored", () => {
    workspaceStore.dispatch({ type: "replace", workspace: null });
    render(<PlanWorkspace />);
    expect(screen.getByRole("status")).toHaveTextContent("No plan yet");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Workspace" })).toBeVisible();
    expect(screen.getByRole("link", { name: "intake form" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
