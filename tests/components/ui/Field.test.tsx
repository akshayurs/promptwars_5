import { render, screen } from "@testing-library/react";

import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";

describe("TextField", () => {
  it("associates the label with the input", () => {
    render(<TextField id="name" label="Name" />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("id", "name");
    expect(input.tagName).toBe("INPUT");
  });

  it("wires the hint through aria-describedby", () => {
    render(<TextField id="name" label="Name" hint="Your full name" />);
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Your full name");
    expect(screen.getByText("Your full name")).toHaveAttribute("id", "name-hint");
  });

  it("marks errors with aria-invalid and describes them", () => {
    render(<TextField id="name" label="Name" hint="Hint" error="Too short" />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe("name-hint name-error");
    expect(input).toHaveAccessibleDescription("Hint Too short");
    expect(screen.getByText("Too short")).toHaveAttribute("id", "name-error");
  });

  it("has no aria-invalid or aria-describedby without hint or error", () => {
    render(<TextField id="name" label="Name" />);
    const input = screen.getByLabelText("Name");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("forwards native input props", () => {
    render(<TextField id="n" label="N" type="number" placeholder="0" />);
    expect(screen.getByLabelText("N")).toHaveAttribute("type", "number");
  });
});

describe("TextAreaField", () => {
  it("labels a textarea and wires hint and error", () => {
    render(<TextAreaField id="bio" label="Bio" hint="Short" error="Required" />);
    const area = screen.getByLabelText("Bio");
    expect(area.tagName).toBe("TEXTAREA");
    expect(area).toHaveAttribute("aria-invalid", "true");
    expect(area.getAttribute("aria-describedby")).toBe("bio-hint bio-error");
  });

  it("omits aria-invalid when valid", () => {
    render(<TextAreaField id="bio" label="Bio" />);
    expect(screen.getByLabelText("Bio")).not.toHaveAttribute("aria-invalid");
  });
});

describe("SelectField", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("renders labelled select with options", () => {
    render(<SelectField id="pick" label="Pick" options={options} />);
    const select = screen.getByLabelText("Pick");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Alpha", "Beta"]);
  });

  it("sets aria-invalid and error description", () => {
    render(<SelectField id="pick" label="Pick" options={options} error="Choose one" />);
    const select = screen.getByLabelText("Pick");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.getAttribute("aria-describedby")).toBe("pick-error");
  });

  it("has no aria-invalid without error", () => {
    render(<SelectField id="pick" label="Pick" options={options} />);
    expect(screen.getByLabelText("Pick")).not.toHaveAttribute("aria-invalid");
  });
});
