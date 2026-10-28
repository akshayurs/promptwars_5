import { render, screen, within } from "@testing-library/react";

import { BudgetTable } from "@/components/BudgetTable";
import { formatMoney } from "@/lib/format";

import { budgetLines as lines } from "./budgetTableHelpers";

describe("BudgetTable (read-only)", () => {
  it("renders caption, headers and formatted money without inputs", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    expect(screen.getByRole("table", { name: "Budget allocation" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Why it matters" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByText(formatMoney(200_000, "INR"))).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Hall for guests" })).toBeInTheDocument();
  });

  it("keeps the row header name to the category when the rationale is repeated for phones", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    const header = screen.getByRole("rowheader", { name: lines[0]!.category });
    expect(within(header).getByText(lines[0]!.rationale)).toHaveAttribute("aria-hidden", "true");
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

  it("renders no buttons, forms or inputs", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  it("labels the section with a visible heading and hides the caption visually", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    expect(screen.getByRole("region", { name: "Budget allocation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Budget allocation" })).toBeVisible();
    expect(screen.getByText("Budget allocation", { selector: "caption" })).toHaveClass("sr-only");
  });
});
