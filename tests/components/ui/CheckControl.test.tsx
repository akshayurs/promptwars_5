import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { bindToggle, CheckControl } from "@/components/ui/CheckControl";

import { preloadLazyChunks } from "../lazy";

describe("CheckControl", () => {
  beforeAll(preloadLazyChunks);

  it("renders a read-only mark with screen-reader state when there is no handler", () => {
    const { container } = render(
      <CheckControl id="c1" checked onToggle={undefined} readOnlyText="(done)" />,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("(done)")).toHaveClass("sr-only");
    expect(container.querySelector("[aria-hidden='true'] svg")).not.toBeNull();
  });

  it("omits the read-only text when none is given", () => {
    const { container } = render(<CheckControl id="c2" checked={false} onToggle={undefined} />);
    expect(container.querySelector(".sr-only")).toBeNull();
  });

  it("renders an interactive checkbox that reports clicks", async () => {
    const onToggle = vi.fn();
    render(
      <>
        <CheckControl id="c3" checked={false} onToggle={onToggle} describedBy="c3-hint" />
        <label htmlFor="c3">Book venue</label>
        <p id="c3-hint">Due soon</p>
      </>,
    );
    const checkbox = await screen.findByRole("checkbox", { name: "Book venue" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(checkbox).toHaveAccessibleDescription("Due soon");
    await userEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("bindToggle", () => {
  it("binds the item id to the list toggle", () => {
    const toggle = vi.fn();
    bindToggle(toggle, "item-7")?.();
    expect(toggle).toHaveBeenCalledExactlyOnceWith("item-7");
  });

  it("stays undefined without a list toggle", () => {
    expect(bindToggle(undefined, "item-7")).toBeUndefined();
  });
});
