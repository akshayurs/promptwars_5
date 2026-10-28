import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";

import { IntakeForm } from "@/components/IntakeForm";
import { requestPlan, type ApiResult } from "@/lib/client";
import { todayIso } from "@/lib/dates";
import type { Plan } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { makePlan } from "./fixtures";
import { fillValidWedding } from "./intakeFormHelpers";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/client", () => ({ requestPlan: vi.fn() }));

const mockedRequestPlan = vi.mocked(requestPlan);

describe("IntakeForm submission lifecycle", () => {
  beforeEach(() => {
    mockedRequestPlan.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });

  it("shows the busy state while the request is pending", async () => {
    const user = userEvent.setup();
    const resolvers: Array<(result: ApiResult<Plan>) => void> = [];
    mockedRequestPlan.mockReturnValueOnce(
      new Promise<ApiResult<Plan>>((r) => {
        resolvers.push(r);
      }),
    );
    render(<IntakeForm />);
    await fillValidWedding(user);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));

    const busy = screen.getByRole("button", { name: "Generating your plan…" });
    expect(busy).toHaveAttribute("aria-disabled", "true");
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveFocus();
    await user.click(busy);
    act(() => {
      busy.closest("form")!.requestSubmit();
    });
    expect(mockedRequestPlan).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(/Asking Gemini/);

    resolvers[0]?.({ ok: true, value: makePlan() });
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/plan");
    });
  });

  it("refocuses the error summary on every failed submit", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
    const submit = screen.getByRole("button", { name: "Generate plan" });
    await user.click(submit);
    const problem = screen.getByText("There is a problem").closest("[tabindex='-1']");
    expect(problem).toHaveFocus();
    submit.focus();
    await user.click(submit);
    expect(problem).toHaveFocus();
  });

  it("omits the date minimum in server-rendered HTML", () => {
    const html = renderToString(<IntakeForm />);
    expect(html).toMatch(/id="eventDate"/);
    expect(html).not.toMatch(/min="\d{4}-/);
  });

  it("sets the date minimum to the local day after hydration", () => {
    render(<IntakeForm />);
    expect(screen.getByLabelText("Event date")).toHaveAttribute("min", todayIso());
  });

  it("aborts the request on unmount and ignores the late result", async () => {
    const user = userEvent.setup();
    const resolvers: Array<(result: ApiResult<Plan>) => void> = [];
    mockedRequestPlan.mockReturnValueOnce(
      new Promise<ApiResult<Plan>>((r) => {
        resolvers.push(r);
      }),
    );
    const { unmount } = render(<IntakeForm />);
    await fillValidWedding(user);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    const signal = mockedRequestPlan.mock.calls[0]?.[1];
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    resolvers[0]?.({ ok: true, value: makePlan() });
    await Promise.resolve();
    expect(router.push).not.toHaveBeenCalled();
    expect(workspaceStore.getSnapshot().workspace).toBeNull();
  });
});
