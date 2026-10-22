import { fireEvent, render, screen, within } from "@testing-library/react";

import { BudgetTable } from "@/components/BudgetTable";
import { formatMoney } from "@/lib/format";

import { makePlan } from "./fixtures";

const lines = makePlan().budget; // 200k + 150k + 50k = 400k

describe("BudgetTable (read-only)", () => {
  it("renders caption, headers and formatted money without inputs", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    expect(screen.getByRole("table", { name: "Budget allocation" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Why it matters" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByText(formatMoney(200_000, "INR"))).toBeInTheDocument();
    expect(screen.getByText("Hall for guests")).toBeInTheDocument();
  });

  it("shows the allocated total in the footer", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    const footerRow = screen.getAllByRole("row").at(-1);
    expect(footerRow).toBeDefined();
    expect(within(footerRow!).getByText(formatMoney(400_000, "INR"))).toBeInTheDocument();
    expect(
      within(footerRow!).getByRole("rowheader", {
        name: `Allocated of ${formatMoney(500_000, "INR")}`,
      }),
    ).toBeInTheDocument();
  });

  it("reports unallocated money when under budget", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    expect(screen.getByText(`${formatMoney(100_000, "INR")} still unallocated.`)).toBeVisible();
    expect(screen.queryByText("Over budget")).not.toBeInTheDocument();
    expect(screen.getByText("80% of budget allocated")).toBeInTheDocument();
  });

  it("warns with the overage when over budget", () => {
    render(<BudgetTable lines={lines} totalBudget={300_000} currency="USD" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      `Over budget by ${formatMoney(100_000, "USD")}`,
    );
    expect(screen.getByRole("status")).toHaveClass("sr-only");
    expect(screen.getByText("Over budget")).toBeInTheDocument();
    expect(
      screen.getByText(`Allocations exceed the total by ${formatMoney(100_000, "USD")}.`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/still unallocated/)).not.toBeInTheDocument();
    expect(screen.getByText("100% of budget allocated")).toBeInTheDocument();
  });

  it("exposes a progress element with value and max", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("value", "400000");
    expect(progress).toHaveAttribute("max", "500000");
  });

  it("caps progress value at the total when over budget", () => {
    render(<BudgetTable lines={lines} totalBudget={300_000} currency="INR" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "300000");
  });

  it("keeps a single empty status region when under budget", () => {
    const { container } = render(
      <BudgetTable lines={lines} totalBudget={500_000} currency="INR" />,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("labels the section with a visible heading and hides the caption visually", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    expect(screen.getByRole("region", { name: "Budget allocation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Budget allocation" })).toBeVisible();
    expect(screen.getByText("Budget allocation", { selector: "caption" })).toHaveClass("sr-only");
  });
});

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
