import { renderToString } from "react-dom/server";

import PlanLoading from "@/app/plan/loading";
import SummaryLoading from "@/app/plan/summary/loading";
import { PlanSummary } from "@/components/PlanSummary";
import { PlanWorkspace } from "@/components/PlanWorkspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("loading states before the browser store is readable", () => {
  it("shows the workspace loading notice on the server snapshot", () => {
    const html = renderToString(<PlanWorkspace />);
    expect(html).toContain("Workspace");
    expect(html).toContain("Loading your plan");
  });

  it("shows the summary loading notice on the server snapshot", () => {
    const html = renderToString(<PlanSummary />);
    expect(html).toContain("Summary");
    expect(html).toContain("Loading your plan");
  });

  it.each([
    ["workspace", PlanLoading, "Workspace"],
    ["summary", SummaryLoading, "Summary"],
  ])("streams the %s route loading UI from the server", (_, Loading, title) => {
    const html = renderToString(<Loading />);
    expect(html).toContain(`>${title}</h1>`);
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading your plan");
  });
});
