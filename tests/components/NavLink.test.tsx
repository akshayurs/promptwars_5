import { render, screen } from "@testing-library/react";

import { NavLink } from "@/components/NavLink";

const nav = vi.hoisted(() => ({ pathname: "/plan" }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

describe("NavLink", () => {
  it("marks the link for the current route with aria-current=page", () => {
    render(
      <>
        <NavLink href="/">New plan</NavLink>
        <NavLink href="/plan">Workspace</NavLink>
      </>,
    );
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "New plan" })).not.toHaveAttribute("aria-current");
  });
});
