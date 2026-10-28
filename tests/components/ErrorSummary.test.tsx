import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { ErrorSummary } from "@/components/intake/ErrorSummary";

const renderSummary = (message: string | null, issues: Record<string, string>) =>
  render(<ErrorSummary message={message} issues={issues} summaryRef={createRef()} />);

describe("ErrorSummary", () => {
  it("renders nothing without a message", () => {
    const { container } = renderSummary(null, {});
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the message without a list when no field is invalid", () => {
    renderSummary("Something went wrong", {});
    expect(screen.getByText("Something went wrong")).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("moves focus to the field when its link is activated", () => {
    render(<input id="eventName" aria-label="Event name" />);
    renderSummary("Fix the form", { eventName: "Required" });
    const link = screen.getByRole("link", { name: /Event name: Required/ });
    expect(fireEvent.click(link)).toBe(false);
    expect(screen.getByLabelText("Event name")).toHaveFocus();
  });

  it("falls back to the default anchor behaviour when the field is not on the page", () => {
    renderSummary("Fix the form", { eventName: "Required" });
    const link = screen.getByRole("link", { name: /Event name: Required/ });
    expect(fireEvent.click(link)).toBe(true);
  });
});
