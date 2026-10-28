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

  it("announces each removal in a visible polite status region", async () => {
    render(<StatefulTable initial={[...fourLines, ...extraLines(1)]} />);
    await screen.findByRole("button", { name: "Add line" });
    await userEvent.click(screen.getByRole("button", { name: "Remove Decor" }));
    const status = screen.getByText("Removed Decor.");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toBeVisible();
    expect(status).not.toHaveClass("sr-only");
    await userEvent.click(screen.getByRole("button", { name: "Remove Venue" }));
    expect(status).toHaveTextContent("Removed Venue.");
  });

  it("offers Undo, which restores the line at its position and focuses its amount", async () => {
    const user = userEvent.setup({ delay: null });
    render(<StatefulTable initial={fourLines} />);
    await user.click(screen.getByRole("button", { name: "Remove Catering" }));
    expect(screen.queryByRole("button", { name: "Remove Catering" })).not.toBeInTheDocument();
    const undo = screen.getByRole("button", { name: "Undo removing Catering" });
    expect(undo).toHaveTextContent(/^Undo/);

    await user.click(undo);
    // The last row header is the "Allocated of" footer.
    const categories = screen
      .getAllByRole("rowheader")
      .slice(0, -1)
      .map((cell) => cell.firstChild?.textContent);
    expect(categories).toEqual(fourLines.map((line) => line.category));
    expect(screen.getByRole("spinbutton", { name: "Catering amount (INR)" })).toHaveFocus();
    expect(screen.getByText("Restored Catering.")).toHaveAttribute("role", "status");
    expect(screen.queryByRole("button", { name: /^Undo/ })).not.toBeInTheDocument();
  });

  it("offers Undo for the latest removal only", async () => {
    const user = userEvent.setup({ delay: null });
    render(<StatefulTable initial={[...fourLines, ...extraLines(1)]} />);
    await user.click(screen.getByRole("button", { name: "Remove Venue" }));
    await user.click(screen.getByRole("button", { name: "Remove Decor" }));
    expect(screen.getAllByRole("button", { name: /^Undo/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Undo removing Decor" })).toBeVisible();
  });

  it("does not offer Undo when lines cannot be added back", async () => {
    const onRemoveLine = vi.fn();
    render(
      <BudgetTable
        lines={fourLines}
        totalBudget={500_000}
        currency="INR"
        onRemoveLine={onRemoveLine}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove Venue" }));
    expect(screen.getByText("Removed Venue.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Undo/ })).not.toBeInTheDocument();
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
