import { renderToString } from "react-dom/server";

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
});
