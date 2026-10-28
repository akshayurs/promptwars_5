import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BudgetTable } from "@/components/BudgetTable";
import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import { budgetLines as lines, extraLines, StatefulTable, UUID } from "./budgetTableHelpers";

describe("BudgetTable (add line)", () => {
  const renderAdd = (current: readonly BudgetLine[] = lines) => {
    const onAddLine = vi.fn();
    render(
      <BudgetTable lines={current} totalBudget={500_000} currency="INR" onAddLine={onAddLine} />,
    );
    return { onAddLine };
  };

  it("shows a validation error for an empty category", async () => {
    const { onAddLine } = renderAdd();
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAddLine).not.toHaveBeenCalled();
    const category = screen.getByRole("textbox", { name: "Category" });
    expect(category).toHaveAttribute("aria-invalid", "true");
    expect(category).toHaveAccessibleDescription("Enter a category.");
    expect(category).toHaveFocus();
  });

  it("treats a whitespace-only category as empty", async () => {
    const { onAddLine } = renderAdd();
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAddLine).not.toHaveBeenCalled();
  });

  it("calls onAddLine with a uuid, sanitized amount and default rationale, then clears", async () => {
    const { onAddLine } = renderAdd();
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "  Music  ");
    const amount = screen.getByRole("spinbutton", { name: "Amount (INR)" });
    expect(amount).toHaveValue(0);
    fireEvent.change(amount, { target: { value: "1234.567" } });
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAddLine).toHaveBeenCalledTimes(1);
    const added = onAddLine.mock.calls[0]![0] as BudgetLine;
    expect(added).toEqual({
      id: expect.stringMatching(UUID) as string,
      category: "Music",
      amount: 1234.57,
      rationale: "Added by you",
    });
    expect(screen.getByRole("textbox", { name: "Category" })).toHaveValue("");
    expect(amount).toHaveValue(0);
  });

  it("keeps a provided rationale and clamps negative amounts to 0", async () => {
    const { onAddLine } = renderAdd();
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "Cake");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount (INR)" }), {
      target: { value: "-20" },
    });
    await userEvent.type(screen.getByRole("textbox", { name: /Why it matters/ }), "Birthday cake");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAddLine).toHaveBeenCalledWith(
      expect.objectContaining({ category: "Cake", amount: 0, rationale: "Birthday cake" }),
    );
    expect(screen.getByRole("textbox", { name: /Why it matters/ })).toHaveValue("");
  });

  it("enforces input length limits", () => {
    renderAdd();
    expect(screen.getByRole("textbox", { name: "Category" })).toHaveAttribute(
      "maxLength",
      String(LIMITS.shortText),
    );
    expect(screen.getByRole("textbox", { name: /Why it matters/ })).toHaveAttribute(
      "maxLength",
      String(LIMITS.mediumText),
    );
  });

  it("is aria-disabled with a reason at the maximum", async () => {
    const full = [...lines, ...extraLines(LIMITS.budgetLines.max - lines.length)];
    const { onAddLine } = renderAdd(full);
    const button = screen.getByRole("button", { name: "Add line" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(
      `A plan can have at most ${LIMITS.budgetLines.max} budget lines.`,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "Music");
    await userEvent.click(button);
    expect(onAddLine).not.toHaveBeenCalled();
  });

  it("moves focus to the new row's amount input", async () => {
    render(<StatefulTable initial={lines} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "Music");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    const input = screen.getByRole("spinbutton", { name: "Music amount (INR)" });
    expect(input).toHaveFocus();
    expect(screen.getByRole("rowheader", { name: "Music" })).toBeInTheDocument();
  });
});
