import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VendorChecklist } from "@/components/VendorChecklist";

import { makePlan } from "./fixtures";
import { preloadLazyChunks } from "./lazy";

const makeVendors = (bookedIndexes: readonly number[] = []) =>
  makePlan().vendors.map((vendor, index) => ({ ...vendor, booked: bookedIndexes.includes(index) }));

describe("VendorChecklist", () => {
  beforeAll(preloadLazyChunks);

  it("shows progress text and a progress element", () => {
    render(<VendorChecklist vendors={makeVendors([0])} />);
    expect(screen.getByRole("status")).toHaveTextContent("1 of 3 vendors booked");
    const progress = screen.getByRole("progressbar", { name: "1 of 3 vendors booked" });
    expect(progress).toHaveAttribute("value", "1");
    expect(progress).toHaveAttribute("max", "3");
  });

  it("has a heading", () => {
    render(<VendorChecklist vendors={makeVendors()} />);
    expect(screen.getByRole("heading", { name: "Vendor checklist" })).toBeInTheDocument();
  });

  it("is read-only without onToggle and announces booking state in text", () => {
    const { container } = render(<VendorChecklist vendors={makeVendors([1])} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(container.querySelector("label")).toBeNull();
    expect(screen.getByText("Photographer")).toHaveTextContent("Photographer (booked)");
    expect(screen.getByText("Caterer")).toHaveTextContent("Caterer (not booked)");
    expect(screen.getByText("(booked)")).toHaveClass("sr-only");
  });

  it("shows the budget line a vendor is paid from, and nothing when there is no link", () => {
    const [linked, unlinked] = makeVendors();
    render(<VendorChecklist vendors={[{ ...linked!, budgetCategory: "Catering" }, unlinked!]} />);
    expect(screen.getByText("Budget: Catering")).toBeVisible();
    expect(screen.getAllByText(/^Budget:/)).toHaveLength(1);
  });

  it("renders a checkbox labelled by category when interactive", async () => {
    render(<VendorChecklist vendors={makeVendors()} onToggle={vi.fn()} />);
    expect(await screen.findAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: "Caterer" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onToggle with the vendor id on click", async () => {
    const user = userEvent.setup({ delay: null });
    const onToggle = vi.fn();
    const vendors = makeVendors();
    render(<VendorChecklist vendors={vendors} onToggle={onToggle} />);
    await user.click(await screen.findByRole("checkbox", { name: "Photographer" }));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(vendors[1]!.id);
  });

  it("toggles via clicking the label", async () => {
    const user = userEvent.setup({ delay: null });
    const onToggle = vi.fn();
    const vendors = makeVendors();
    render(<VendorChecklist vendors={vendors} onToggle={onToggle} />);
    await screen.findAllByRole("checkbox");
    await user.click(screen.getByText("Florist"));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(vendors[2]!.id);
  });

  it("marks booked vendors as checked without duplicate sr-only text", async () => {
    render(<VendorChecklist vendors={makeVendors([0])} onToggle={vi.fn()} />);
    const checkbox = await screen.findByRole("checkbox", { name: "Caterer" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText(/booked\)/)).not.toBeInTheDocument();
  });

  it("lists questions inside details", () => {
    const { container } = render(<VendorChecklist vendors={makeVendors()} />);
    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(3);
    const first = details[0]!;
    expect(within(first).getByText("Questions to ask")).toBeInTheDocument();
    expect(within(first).getByText("Do you cover dietary needs?")).toBeInTheDocument();
    expect(first.querySelectorAll("li")).toHaveLength(2);
  });

  it("names each questions disclosure after its vendor", () => {
    const { container } = render(<VendorChecklist vendors={makeVendors()} />);
    const names = [...container.querySelectorAll("summary")].map((summary) => summary.textContent);
    expect(names).toEqual([
      "Questions to ask: Caterer",
      "Questions to ask: Photographer",
      "Questions to ask: Florist",
    ]);
    expect(within(container.querySelector("summary")!).getByText(": Caterer")).toHaveClass(
      "sr-only",
    );
  });

  it("lists a question the model repeated only once", () => {
    const [vendor] = makeVendors();
    const repeated = {
      ...vendor!,
      questionsToAsk: ["Is a deposit needed?", "Is a deposit needed?"],
    };
    const { container } = render(<VendorChecklist vendors={[repeated]} />);
    const items = container.querySelectorAll("details li");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Is a deposit needed?");
  });

  it("handles an empty vendor list", () => {
    render(<VendorChecklist vendors={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("0 of 0 vendors booked");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "1");
  });
});
