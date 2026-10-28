import { render, screen } from "@testing-library/react";

import { ExistingPlanNotice } from "@/components/intake/ExistingPlanNotice";
import { workspaceStore } from "@/lib/workspaceStore";

import { makeWorkspace } from "./fixtures";

describe("ExistingPlanNotice", () => {
  it("renders nothing when no plan is saved", () => {
    workspaceStore.dispatch({ type: "replace", workspace: null });
    const { container } = render(<ExistingPlanNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links back to the saved plan by name", () => {
    const workspace = makeWorkspace();
    workspaceStore.dispatch({ type: "replace", workspace });
    render(<ExistingPlanNotice />);
    expect(screen.getByText("You have a plan in progress")).toBeVisible();
    expect(
      screen.getByRole("link", { name: `Continue planning ${workspace.intake.eventName}` }),
    ).toHaveAttribute("href", "/plan");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
