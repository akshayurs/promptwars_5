import { fireEvent, render, screen } from "@testing-library/react";

import { BudgetTable } from "@/components/BudgetTable";
import { LIMITS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

import { budgetLines as lines } from "./budgetTableHelpers";

describe("BudgetTable (editable)", () => {
  it("renders a labelled number input per line", () => {
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={vi.fn()} />,
    );
    const input = screen.getByRole("spinbutton", { name: "Venue amount (INR)" });
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveValue(200_000);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
  });

  it("calls onAmountChange with the sanitised number", () => {
    const onChange = vi.fn();
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Venue amount (INR)"), { target: { value: "123.456" } });
    expect(onChange).toHaveBeenLastCalledWith(lines[0]!.id, 123.46);
  });

  const RANGE_ERROR = `Enter an amount from ${formatMoney(0, "INR")} to ${formatMoney(
    LIMITS.maxBudget,
    "INR",
  )}.`;

  it.each(["-50", "5000000000"])(
    "flags %s as out of range without committing or reverting it",
    (value) => {
      const onChange = vi.fn();
      render(
        <BudgetTable
          lines={lines}
          totalBudget={500_000}
          currency="INR"
          onAmountChange={onChange}
        />,
      );
      const input = screen.getByLabelText("Catering amount (INR)");
      fireEvent.change(input, { target: { value } });
      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(RANGE_ERROR);
      expect(screen.getByText(RANGE_ERROR)).toBeVisible();
      fireEvent.blur(input);
      expect(input).toHaveValue(Number(value));
      expect(input).toHaveAttribute("aria-invalid", "true");
    },
  );

  it("clears the error and commits once the amount is back in range", () => {
    const onChange = vi.fn();
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={onChange} />,
    );
    const input = screen.getByLabelText("Venue amount (INR)");
    fireEvent.change(input, { target: { value: "5000000000" } });
    fireEvent.change(input, { target: { value: String(LIMITS.maxBudget) } });
    expect(onChange).toHaveBeenLastCalledWith(lines[0]!.id, LIMITS.maxBudget);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAccessibleDescription();
    expect(screen.queryByText(RANGE_ERROR)).not.toBeInTheDocument();
  });

  it("accepts 0 as a valid amount", () => {
    const onChange = vi.fn();
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Decor amount (INR)"), { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith(lines[2]!.id, 0);
  });

  it("lets the field be cleared without committing, and restores it on blur", () => {
    const onChange = vi.fn();
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={onChange} />,
    );
    const input = screen.getByLabelText("Decor amount (INR)");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(null);
    fireEvent.blur(input);
    expect(input).toHaveValue(50_000);
  });
});
