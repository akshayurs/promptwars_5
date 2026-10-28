import { render, screen } from "@testing-library/react";

import { LazyFallback } from "@/components/ui/LazyFallback";

describe("LazyFallback", () => {
  it("reserves space, marks itself busy and names what is loading", () => {
    const { container } = render(<LazyFallback label="refine panel" className="h-80" />);
    const placeholder = container.firstElementChild;
    expect(placeholder).toHaveAttribute("aria-busy", "true");
    expect(placeholder).toHaveClass("h-80", "motion-reduce:animate-none");
    expect(screen.getByText("Loading refine panel…")).toHaveClass("sr-only");
  });
});
