import { render, screen } from "@testing-library/react";

import { Alert } from "@/components/ui/Alert";

describe("Alert", () => {
  it("uses role=alert for the error tone", () => {
    render(<Alert tone="error">Broken</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Broken");
  });

  it.each(["info", "success", "warning"] as const)("uses role=status for %s", (tone) => {
    render(<Alert tone={tone}>Message</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Message");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["info", "success", "warning", "error"] as const)(
    "omits the live role for %s when live is false",
    (tone) => {
      render(
        <Alert tone={tone} live={false}>
          Quiet
        </Alert>,
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("Quiet")).toBeInTheDocument();
    },
  );

  it("renders the title when provided", () => {
    render(
      <Alert tone="info" title="Heads up">
        Body
      </Alert>,
    );
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });

  it("omits the title when not provided", () => {
    const { container } = render(<Alert tone="info">Body</Alert>);
    expect(container.querySelector("p")).toBeNull();
  });

  it("hides the decorative icon from assistive tech", () => {
    const { container } = render(<Alert tone="warning">Body</Alert>);
    const icon = container.querySelector("[aria-hidden='true']");
    expect(icon).toHaveTextContent("⚠");
  });

  it("appends a custom className", () => {
    render(
      <Alert tone="info" className="mt-4">
        Body
      </Alert>,
    );
    expect(screen.getByRole("status")).toHaveClass("mt-4");
  });
});
