import { fireEvent, render, screen } from "@testing-library/react";

import { BudgetTable } from "@/components/BudgetTable";

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

  it("calls onAmountChange with the sanitized number", () => {
    const onChange = vi.fn();
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Venue amount (INR)"), { target: { value: "123.456" } });
    expect(onChange).toHaveBeenLastCalledWith(lines[0]!.id, 123.46);
  });

  it("coerces negative amounts to 0", () => {
    const onChange = vi.fn();
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Catering amount (INR)"), { target: { value: "-50" } });
    expect(onChange).toHaveBeenLastCalledWith(lines[1]!.id, 0);
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

  it("clamps values above the maximum budget", () => {
    const onChange = vi.fn();
    render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" onAmountChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Venue amount (INR)"), {
      target: { value: "5000000000" },
    });
    expect(onChange).toHaveBeenLastCalledWith(lines[0]!.id, 1_000_000_000);
  });
});
