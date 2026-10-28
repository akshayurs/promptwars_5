import { render, screen } from "@testing-library/react";
import { Children, isValidElement, type ReactNode } from "react";
import userEvent from "@testing-library/user-event";

import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import { ErrorReference } from "@/components/ui/ErrorReference";

const withDigest = (digest: string): Error => Object.assign(new Error("boom"), { digest });

describe("ErrorReference", () => {
  it("shows the server digest as a reference id", () => {
    render(<ErrorReference error={withDigest("abc123")} />);
    expect(screen.getByText("abc123").tagName).toBe("CODE");
    expect(screen.getByText(/Reference id:/)).toBeVisible();
  });

  it.each([new Error("no digest"), "not an error", null])("renders nothing for %j", (error) => {
    const { container } = render(<ErrorReference error={error} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("route error page", () => {
  it("titles the document, explains the error and retries", async () => {
    const retry = vi.fn();
    render(<ErrorPage error={withDigest("d-1")} retry={retry} />);
    expect(document.title).toBe("Something went wrong · EventCraft");
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Your saved plan is unaffected.");
    expect(screen.getByText("d-1")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

type Children = { children?: ReactNode };

const childrenOf = (node: ReactNode): ReactNode[] =>
  isValidElement<Children>(node) ? Children.toArray(node.props.children) : [];

describe("global error page retry", () => {
  it("calls retry when Try again is pressed", async () => {
    const retry = vi.fn();
    const [body] = childrenOf(GlobalError({ error: withDigest("g-2"), retry }));
    const main = childrenOf(body).find((node) => isValidElement(node) && node.type === "main");
    render(<>{main}</>);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByText("g-2")).toBeVisible();
  });
});
