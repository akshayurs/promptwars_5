import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";

import { BudgetTable } from "@/components/BudgetTable";
import { removeBudgetLine } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import { budgetLines as lines, extraLines, StatefulTable } from "./budgetTableHelpers";
import { preloadLazyChunks } from "./lazy";

describe("BudgetTable (remove line)", () => {
  beforeAll(preloadLazyChunks);

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
    const addButton = await screen.findByRole("button", { name: "Add line" });
    await userEvent.click(screen.getByRole("button", { name: "Remove Decor" }));
    expect(screen.queryByRole("button", { name: "Remove Decor" })).not.toBeInTheDocument();
    expect(addButton).toHaveFocus();
  });

  it("announces each removal in a polite status region", async () => {
    render(<StatefulTable initial={[...fourLines, ...extraLines(1)]} />);
    await screen.findByRole("button", { name: "Add line" });
    await userEvent.click(screen.getByRole("button", { name: "Remove Decor" }));
    const status = screen.getByText("Removed Decor.");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveClass("sr-only");
    await userEvent.click(screen.getByRole("button", { name: "Remove Venue" }));
    expect(status).toHaveTextContent("Removed Venue.");
  });

  it("has no removal status region when lines cannot be removed", () => {
    render(<BudgetTable lines={lines} totalBudget={500_000} currency="INR" />);
    expect(screen.queryByText(/^Removed /)).not.toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
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
