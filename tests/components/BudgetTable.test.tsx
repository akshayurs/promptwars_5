import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";

import { BudgetTable } from "@/components/BudgetTable";
import { addBudgetLine, removeBudgetLine } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { BudgetLine } from "@/lib/schema";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const extraLines = (count: number): BudgetLine[] =>
  Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    category: `Extra ${index}`,
    amount: 1,
    rationale: "More",
  }));

const StatefulTable = ({ initial }: { initial: readonly BudgetLine[] }): ReactElement => {
  const [current, setCurrent] = useState<readonly BudgetLine[]>(initial);
  return (
    <BudgetTable
      lines={current}
      totalBudget={500_000}
      currency="INR"
      onAmountChange={vi.fn()}
      onAddLine={(line) => {
        setCurrent((previous) => addBudgetLine(previous, line));
      }}
      onRemoveLine={(id) => {
        setCurrent((previous) => removeBudgetLine(previous, id));
      }}
    />
  );
};

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

describe("BudgetTable (remove line)", () => {
  const fourLines = [...lines, ...extraLines(1)];

  it("calls onRemoveLine with the line id", async () => {
    const onRemoveLine = vi.fn();
    render(
      <BudgetTable
        lines={fourLines}
        totalBudget={500_000}
        currency="INR"
        onRemoveLine={onRemoveLine}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove Catering" }));
    expect(onRemoveLine).toHaveBeenCalledWith(lines[1]!.id);
  });

  it("is aria-disabled with a reason at the minimum but stays focusable", async () => {
    const onRemoveLine = vi.fn();
    render(
      <BudgetTable
        lines={lines}
        totalBudget={500_000}
        currency="INR"
        onRemoveLine={onRemoveLine}
      />,
    );
    const button = screen.getByRole("button", { name: "Remove Venue" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      `A plan needs at least ${LIMITS.budgetLines.min} budget lines.`,
    );
    await userEvent.click(button);
    expect(onRemoveLine).not.toHaveBeenCalled();
    button.focus();
    expect(button).toHaveFocus();
  });

  it("moves focus to the Add line button after removal", async () => {
    render(<StatefulTable initial={fourLines} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Decor" }));
    expect(screen.queryByRole("button", { name: "Remove Decor" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add line" })).toHaveFocus();
  });

  it("moves focus to the heading when there is no add form", async () => {
    const Remover = (): ReactElement => {
      const [current, setCurrent] = useState<readonly BudgetLine[]>(fourLines);
      return (
        <BudgetTable
          lines={current}
          totalBudget={500_000}
          currency="INR"
          onRemoveLine={(id) => {
            setCurrent((previous) => removeBudgetLine(previous, id));
          }}
        />
      );
    };
    render(<Remover />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Venue" }));
    expect(screen.getByRole("heading", { level: 2, name: "Budget allocation" })).toHaveFocus();
  });
});

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
