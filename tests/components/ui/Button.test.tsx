import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";

import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders children and defaults to type=button", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).toBeEnabled();
  });

  it("respects an explicit submit type", () => {
    render(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "submit");
  });

  it("shows the busy label with aria-busy/aria-disabled and stays focusable", () => {
    render(
      <Button busy busyLabel="Saving…">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toBeEnabled();
    button.focus();
    expect(button).toHaveFocus();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("keeps the busy state when callers pass their own aria attributes", () => {
    render(
      <Button busy aria-disabled={false} aria-busy={false} type="submit">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Working…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("passes a caller's aria-disabled through when not busy", () => {
    render(<Button aria-disabled>Remove</Button>);
    expect(screen.getByRole("button", { name: "Remove" })).toHaveAttribute("aria-disabled", "true");
  });

  it("uses the default busy label", () => {
    render(<Button busy>Save</Button>);
    expect(screen.getByRole("button", { name: "Working…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("ignores clicks and blocks form submission while busy", async () => {
    const user = userEvent.setup({ delay: null });
    const onClick = vi.fn();
    const onSubmit = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Button busy type="submit" onClick={onClick}>
          Go
        </Button>
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Working…" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("forwards a ref to the underlying button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Ref" }));
  });

  it.each([
    ["primary", "bg-brand"],
    ["secondary", "bg-surface-raised"],
    ["danger", "text-danger"],
  ] as const)("applies the %s variant classes", (variant, cls) => {
    render(<Button variant={variant}>Label</Button>);
    expect(screen.getByRole("button", { name: "Label" })).toHaveClass(cls);
  });

  it("merges a custom className", () => {
    render(<Button className="extra">Label</Button>);
    expect(screen.getByRole("button", { name: "Label" })).toHaveClass("extra");
  });

  it("respects the disabled prop and does not fire clicks", async () => {
    const user = userEvent.setup({ delay: null });
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Nope" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onClick when enabled", async () => {
    const user = userEvent.setup({ delay: null });
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Yes</Button>);
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
