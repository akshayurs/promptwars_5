import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

import type { useHeadingFocus as UseHeadingFocus } from "@/components/useHeadingFocus";

// The hook remembers in-app navigation per page load, so each case loads a fresh module.
const loadHook = async (): Promise<typeof UseHeadingFocus> => {
  vi.resetModules();
  return (await import("@/components/useHeadingFocus")).useHeadingFocus;
};

const landOn = (path: string): void => {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([
    { name: `${window.location.origin}${path}` } as PerformanceEntry,
  ]);
};

const pageWith = (useHeadingFocus: typeof UseHeadingFocus) => {
  const Page = ({ title }: { title: string }): ReactElement => {
    const ref = useHeadingFocus();
    return (
      <h1 ref={ref} tabIndex={-1}>
        {title}
      </h1>
    );
  };
  return Page;
};

describe("useHeadingFocus", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("leaves focus at the document start on the route the browser loaded", async () => {
    window.history.replaceState(null, "", "/plan");
    landOn("/plan");
    const Page = pageWith(await loadHook());
    render(<Page title="Workspace" />);
    expect(screen.getByRole("heading", { name: "Workspace" })).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("focuses the heading after a client-side route change, including back to the first route", async () => {
    window.history.replaceState(null, "", "/plan");
    landOn("/plan");
    const Page = pageWith(await loadHook());
    const first = render(<Page title="Workspace" />);
    first.unmount();

    window.history.replaceState(null, "", "/plan/summary");
    const second = render(<Page title="Summary" />);
    expect(screen.getByRole("heading", { name: "Summary" })).toHaveFocus();
    second.unmount();

    window.history.replaceState(null, "", "/plan");
    render(<Page title="Workspace again" />);
    expect(screen.getByRole("heading", { name: "Workspace again" })).toHaveFocus();
  });

  it("focuses the heading when the browser does not report the loaded document", async () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
    const Page = pageWith(await loadHook());
    render(<Page title="Edit event details" />);
    expect(screen.getByRole("heading", { name: "Edit event details" })).toHaveFocus();
  });
});
