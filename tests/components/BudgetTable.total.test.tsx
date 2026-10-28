import { fireEvent, render, screen } from "@testing-library/react";

import { BudgetTable } from "@/components/BudgetTable";
import { formatMoney } from "@/lib/format";

import { budgetLines as lines } from "./budgetTableHelpers";

describe("BudgetTable (editable total)", () => {
  const renderTotal = (onTotalChange = vi.fn()) => {
    render(
      <BudgetTable
        lines={lines}
        totalBudget={500_000}
        currency="INR"
        onTotalChange={onTotalChange}
      />,
    );
    return { onTotalChange, input: screen.getByLabelText("Total budget (INR)") };
  };

  it("renders a labelled number input with the current total", () => {
    const { input } = renderTotal();
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveValue(500_000);
    expect(screen.getByText("80% of budget allocated")).toBeInTheDocument();
  });

  it("commits valid totals", () => {
    const { input, onTotalChange } = renderTotal();
    fireEvent.change(input, { target: { value: "800000" } });
    expect(onTotalChange).toHaveBeenLastCalledWith(800_000);
  });

  it.each(["", "0", "-5", "1000000001"])("does not commit %j and reverts on blur", (value) => {
    const { input, onTotalChange } = renderTotal();
    fireEvent.change(input, { target: { value } });
    expect(onTotalChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(input).toHaveValue(500_000);
  });

  it("keeps a draft while typing and shows the prop value after blur", () => {
    const { input } = renderTotal();
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue(null);
    fireEvent.blur(input);
    expect(input).toHaveValue(500_000);
  });

  it("updates percentage and remaining text from the totalBudget prop", () => {
    const { rerender } = render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onTotalChange={vi.fn()} />,
    );
    rerender(
      <BudgetTable lines={lines} totalBudget={800_000} currency="INR" onTotalChange={vi.fn()} />,
    );
    expect(screen.getByText("50% of budget allocated")).toBeInTheDocument();
    expect(screen.getByText(`${formatMoney(400_000, "INR")} still unallocated.`)).toBeVisible();
    expect(screen.getByLabelText("Total budget (INR)")).toHaveValue(800_000);
  });
});
