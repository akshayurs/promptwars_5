import { fireEvent, render, screen } from "@testing-library/react";

import { BudgetTable } from "@/components/BudgetTable";
import { LIMITS } from "@/lib/constants";
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

  const TOTAL_ERROR = `Enter a total above ${formatMoney(0, "INR")}, up to ${formatMoney(
    LIMITS.maxBudget,
    "INR",
  )}.`;

  it.each(["0", "-5", "1000000001"])(
    "flags %j as invalid, keeps it on screen and does not commit it",
    (value) => {
      const { input, onTotalChange } = renderTotal();
      fireEvent.change(input, { target: { value } });
      expect(onTotalChange).not.toHaveBeenCalled();
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(TOTAL_ERROR);
      fireEvent.blur(input);
      expect(input).toHaveValue(Number(value));
      expect(screen.getByText(TOTAL_ERROR)).toBeVisible();
    },
  );

  it("clears the error once a valid total is typed", () => {
    const { input, onTotalChange } = renderTotal();
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.change(input, { target: { value: "650000" } });
    expect(onTotalChange).toHaveBeenLastCalledWith(650_000);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText(TOTAL_ERROR)).not.toBeInTheDocument();
  });

  it("treats an emptied field as no change and shows the prop value after blur", () => {
    const { input, onTotalChange } = renderTotal();
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue(null);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(onTotalChange).not.toHaveBeenCalled();
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
