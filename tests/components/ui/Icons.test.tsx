import { render } from "@testing-library/react";

import * as Icons from "@/components/ui/Icons";

const iconNames = Object.keys(Icons) as Array<keyof typeof Icons>;

describe("Icons", () => {
  it.each(iconNames)("%s is decorative and hidden from assistive tech", (name) => {
    const Icon = Icons[name];
    const { container } = render(<Icon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it.each(iconNames)("%s applies a custom size class", (name) => {
    const Icon = Icons[name];
    const { container } = render(<Icon className="size-10" />);
    expect(container.querySelector("svg")).toHaveClass("size-10");
  });
});
