import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlanTabs } from "@/components/workspace/PlanTabs";

import { makeWorkspace } from "./fixtures";

const setup = () => {
  const base = makeWorkspace();
  const budget = [
    ...base.plan.budget,
    { id: crypto.randomUUID(), category: "Music", amount: 10_000, rationale: "Live band" },
  ];
  const workspace = { ...base, plan: { ...base.plan, budget } };
  const dispatch = vi.fn();
  render(<PlanTabs workspace={workspace} dispatch={dispatch} />);
  return { workspace, dispatch, user: userEvent.setup() };
};

describe("PlanTabs", () => {
  it("shows the budget tab first and switches panels", async () => {
    const { user } = setup();
    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Marigold arch");
  });

  it("dispatches budget edits: amount, total, add and remove", async () => {
    const { workspace, dispatch, user } = setup();
    const [first] = workspace.plan.budget;
    fireEvent.change(screen.getByLabelText("Venue amount (INR)"), { target: { value: "210000" } });
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setAmount", id: first!.id, amount: 210000 });

    fireEvent.change(screen.getByLabelText("Total budget (INR)"), { target: { value: "600000" } });
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setTotalBudget", amount: 600000 });

    await user.type(screen.getByRole("textbox", { name: "Category" }), "Lighting");
    await user.click(screen.getByRole("button", { name: "Add line" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "addLine",
      line: expect.objectContaining({ category: "Lighting" }) as unknown,
    });

    await user.click(screen.getByRole("button", { name: "Remove Music" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "removeLine",
      id: workspace.plan.budget[3]!.id,
    });
  });

  it("dispatches milestone toggles from the timeline tab", async () => {
    const { workspace, dispatch, user } = setup();
    await user.click(screen.getByRole("tab", { name: "Timeline" }));
    await user.click(screen.getByRole("checkbox", { name: /Set the guest list/ }));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "toggleMilestone",
      id: workspace.plan.timeline[0]!.id,
    });
  });

  it("dispatches vendor toggles from the vendors tab", async () => {
    const { workspace, dispatch, user } = setup();
    await user.click(screen.getByRole("tab", { name: "Vendors" }));
    await user.click(screen.getByRole("checkbox", { name: "Photographer" }));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "toggleVendor",
      id: workspace.plan.vendors[1]!.id,
    });
  });
});
