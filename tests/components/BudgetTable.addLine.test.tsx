import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddLineForm } from "@/components/budget/AddLineForm";
import { BudgetTable } from "@/components/BudgetTable";
import { LIMITS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { BudgetLine } from "@/lib/schema";

import { budgetLines as lines, extraLines, StatefulTable, UUID } from "./budgetTableHelpers";
import { preloadLazyChunks } from "./lazy";

describe("BudgetTable (add line)", () => {
  beforeAll(preloadLazyChunks);

  const renderAdd = async (current: readonly BudgetLine[] = lines) => {
    const onAddLine = vi.fn();
    render(
      <BudgetTable lines={current} totalBudget={500_000} currency="INR" onAddLine={onAddLine} />,
    );
    await screen.findByRole("button", { name: "Add line" });
    return { onAddLine };
  };

  it("shows a validation error for an empty category", async () => {
    const { onAddLine } = await renderAdd();
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAddLine).not.toHaveBeenCalled();
    const category = screen.getByRole("textbox", { name: "Category" });
    expect(category).toHaveAttribute("aria-invalid", "true");
    expect(category).toHaveAccessibleDescription("Enter a category.");
    expect(category).toHaveFocus();
  });

  it("treats a whitespace-only category as empty", async () => {
    const { onAddLine } = await renderAdd();
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAddLine).not.toHaveBeenCalled();
  });

  it("calls onAddLine with a uuid, sanitized amount and default rationale, then clears", async () => {
    const { onAddLine } = await renderAdd();
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

  it("keeps a provided rationale", async () => {
    const { onAddLine } = await renderAdd();
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "Cake");
    await userEvent.type(screen.getByRole("textbox", { name: /Why it matters/ }), "Birthday cake");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAddLine).toHaveBeenCalledWith(
      expect.objectContaining({ category: "Cake", amount: 0, rationale: "Birthday cake" }),
    );
    expect(screen.getByRole("textbox", { name: /Why it matters/ })).toHaveValue("");
  });

  it.each(["-20", "1000000001"])(
    "rejects an out-of-range amount of %s and focuses the amount field",
    async (value) => {
      const { onAddLine } = await renderAdd();
      await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "Cake");
      const amount = screen.getByRole("spinbutton", { name: "Amount (INR)" });
      fireEvent.change(amount, { target: { value } });
      await userEvent.click(screen.getByRole("button", { name: "Add line" }));
      expect(onAddLine).not.toHaveBeenCalled();
      expect(amount).toHaveAttribute("aria-invalid", "true");
      expect(amount).toHaveAccessibleDescription(
        `Enter an amount from ${formatMoney(0, "INR")} to ${formatMoney(LIMITS.maxBudget, "INR")}.`,
      );
      expect(amount).toHaveFocus();
      expect(screen.getByRole("textbox", { name: "Category" })).not.toHaveAttribute("aria-invalid");
    },
  );

  it("uses the injected id factory for new lines", async () => {
    const onAdd = vi.fn();
    render(
      <AddLineForm
        atMax={false}
        currency="USD"
        buttonRef={{ current: null }}
        onAdd={onAdd}
        createId={() => "line-1"}
      />,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Category" }), "Music");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      id: "line-1",
      category: "Music",
      amount: 0,
      rationale: "Added by you",
    });
  });

  it("enforces input length limits", async () => {
    await renderAdd();
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
    const { onAddLine } = await renderAdd(full);
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
    await userEvent.type(await screen.findByRole("textbox", { name: "Category" }), "Music");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    const input = screen.getByRole("spinbutton", { name: "Music amount (INR)" });
    expect(input).toHaveFocus();
    expect(screen.getByRole("rowheader", { name: "Music" })).toBeInTheDocument();
  });
});
