import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RefinePanel } from "@/components/RefinePanel";
import { requestRefinement, type ApiResult } from "@/lib/client";
import type { Plan, StoredWorkspace } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { makePlan, makeWorkspace } from "./fixtures";

vi.mock("@/lib/client", () => ({ requestRefinement: vi.fn() }));

const mockedRefine = vi.mocked(requestRefinement);

type Resolver = (result: ApiResult<Plan>) => void;

const deferred = (): { resolve: Resolver } => {
  const holder: { resolve: Resolver } = { resolve: () => undefined };
  mockedRefine.mockReturnValueOnce(
    new Promise<ApiResult<Plan>>((resolve) => {
      holder.resolve = resolve;
    }),
  );
  return holder;
};

const renderPanel = (
  workspace: StoredWorkspace = makeWorkspace(),
  handlers: { onApply?: (plan: Plan) => void; onUndo?: () => void } = {},
) => {
  workspaceStore.dispatch({ type: "replace", workspace });
  return render(
    <RefinePanel
      workspace={workspace}
      onApply={handlers.onApply ?? vi.fn()}
      onUndo={handlers.onUndo ?? vi.fn()}
    />,
  );
};

const statusRegion = (): HTMLElement => screen.getByRole("status");

describe("RefinePanel", () => {
  beforeEach(() => {
    mockedRefine.mockReset();
  });

  it("renders heading, labelled textarea, buttons and an empty status region", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Refine with AI" })).toBeInTheDocument();
    expect(screen.getByLabelText("What should change?")).toBeRequired();
    expect(screen.getByRole("button", { name: "Apply refinement" })).toBeEnabled();
    expect(statusRegion()).not.toHaveAttribute("aria-live");
    expect(statusRegion()).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("rejects instructions shorter than 3 characters without calling the API", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByLabelText("What should change?"), "  a ");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    const textarea = screen.getByLabelText("What should change?");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAccessibleDescription(/Describe the change you want in a few words\.$/);
    expect(textarea).toHaveFocus();
    expect(mockedRefine).not.toHaveBeenCalled();
  });

  it("applies the returned plan, summarises the diff and clears the textarea", async () => {
    const user = userEvent.setup();
    const workspace = makeWorkspace();
    const next: Plan = {
      ...workspace.plan,
      budget: workspace.plan.budget.map((line, index) =>
        index === 0 ? { ...line, amount: line.amount + 1 } : line,
      ),
      vendors: workspace.plan.vendors.slice(0, 2),
    };
    mockedRefine.mockResolvedValueOnce({ ok: true, value: next });
    const onApply = vi.fn();
    renderPanel(workspace, { onApply });
    const textarea = screen.getByLabelText("What should change?");
    await user.type(textarea, "  make it greener  ");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledExactlyOnceWith(next);
    });
    expect(mockedRefine).toHaveBeenCalledWith(
      { intake: workspace.intake, plan: workspace.plan, instruction: "make it greener" },
      expect.any(AbortSignal),
    );
    expect(statusRegion()).toHaveTextContent("Updated 1 budget line, 1 vendor.");
    expect(textarea).toHaveValue("");
  });

  it("uses plural wording for multiple changes", async () => {
    const user = userEvent.setup();
    const workspace = makeWorkspace();
    const next: Plan = {
      ...workspace.plan,
      budget: workspace.plan.budget.map((line) => ({ ...line, amount: line.amount + 1 })),
      timeline: workspace.plan.timeline.map((m) => ({ ...m, title: `${m.title}!` })),
      ideas: workspace.plan.ideas.map((idea) => ({ ...idea, title: `${idea.title}!` })),
    };
    mockedRefine.mockResolvedValueOnce({ ok: true, value: next });
    renderPanel(workspace);
    await user.type(screen.getByLabelText("What should change?"), "change lots");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    await waitFor(() => {
      expect(statusRegion()).toHaveTextContent(
        `Updated ${workspace.plan.budget.length} budget lines, ${workspace.plan.timeline.length} milestones, ${workspace.plan.ideas.length} ideas.`,
      );
    });
  });

  it("reports when nothing changed", async () => {
    const user = userEvent.setup();
    const workspace = makeWorkspace();
    mockedRefine.mockResolvedValueOnce({ ok: true, value: workspace.plan });
    renderPanel(workspace);
    await user.type(screen.getByLabelText("What should change?"), "no-op please");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    expect(await screen.findByText("The plan already matched your request.")).toBeInTheDocument();
  });

  it("shows the API error in the status region, not as a field error", async () => {
    const user = userEvent.setup();
    mockedRefine.mockResolvedValueOnce({ ok: false, message: "Model overloaded", issues: {} });
    const onApply = vi.fn();
    renderPanel(makeWorkspace(), { onApply });
    const textarea = screen.getByLabelText("What should change?");
    await user.type(textarea, "cut costs");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    await waitFor(() => {
      expect(statusRegion()).toHaveTextContent("Model overloaded");
    });
    expect(onApply).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("cut costs");
    expect(textarea).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("discards the result when the plan changed while refining", async () => {
    const user = userEvent.setup();
    const workspace = makeWorkspace();
    const pending = deferred();
    const onApply = vi.fn();
    renderPanel(workspace, { onApply });
    await user.type(screen.getByLabelText("What should change?"), "add a band");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    act(() => {
      workspaceStore.dispatch({
        type: "replace",
        workspace: { ...workspace, savedAt: "2099-01-01T00:00:00.000Z" },
      });
    });
    pending.resolve({ ok: true, value: makePlan() });
    await waitFor(() => {
      expect(statusRegion()).toHaveTextContent("The plan changed while refining. Try again.");
    });
    expect(onApply).not.toHaveBeenCalled();
  });

  it("disables undo when there is no previous plan", () => {
    renderPanel(makeWorkspace({ previousPlan: null }));
    expect(screen.getByRole("button", { name: "Undo last refinement" })).toBeDisabled();
  });

  it("calls onUndo, clears the stale summary and moves focus to the status", async () => {
    const user = userEvent.setup();
    const workspace = makeWorkspace({ previousPlan: makePlan() });
    mockedRefine.mockResolvedValueOnce({ ok: true, value: workspace.plan });
    const onUndo = vi.fn();
    renderPanel(workspace, { onUndo });
    await user.type(screen.getByLabelText("What should change?"), "no-op please");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    await screen.findByText("The plan already matched your request.");

    const undo = screen.getByRole("button", { name: "Undo last refinement" });
    expect(undo).toBeEnabled();
    await user.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(statusRegion()).toHaveTextContent("Refinement undone.");
    expect(screen.queryByText("The plan already matched your request.")).not.toBeInTheDocument();
    expect(statusRegion()).toHaveFocus();
  });

  it("keeps buttons focusable but inert while pending", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onUndo = vi.fn();
    renderPanel(makeWorkspace({ previousPlan: makePlan() }), { onUndo });
    await user.type(screen.getByLabelText("What should change?"), "add a band");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    const busy = screen.getByRole("button", { name: "Refining…" });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveAttribute("aria-disabled", "true");
    expect(busy).toHaveFocus();
    await user.click(busy);
    expect(mockedRefine).toHaveBeenCalledTimes(1);

    const undo = screen.getByRole("button", { name: "Undo last refinement" });
    expect(undo).toHaveAttribute("aria-disabled", "true");
    await user.click(undo);
    expect(onUndo).not.toHaveBeenCalled();

    pending.resolve({ ok: false, message: "stop", issues: {} });
    const apply = await screen.findByRole("button", { name: "Apply refinement" });
    expect(apply).not.toHaveAttribute("aria-disabled");
  });

  it("ignores a second submit while pending", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    renderPanel();
    const textarea = screen.getByLabelText("What should change?");
    await user.type(textarea, "add a band");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    const form = textarea.closest("form")!;
    act(() => {
      form.requestSubmit();
    });
    expect(mockedRefine).toHaveBeenCalledTimes(1);
    pending.resolve({ ok: false, message: "stop", issues: {} });
    await screen.findByRole("button", { name: "Apply refinement" });
  });

  it("cancels a pending refinement, announces it and ignores the late result", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onApply = vi.fn();
    renderPanel(makeWorkspace(), { onApply });
    const textarea = screen.getByLabelText("What should change?");
    await user.type(textarea, "add a band");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    const signal = mockedRefine.mock.calls[0]?.[1];
    expect(signal?.aborted).toBe(false);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(signal?.aborted).toBe(true);
    expect(statusRegion()).toHaveTextContent("Refinement cancelled.");
    expect(statusRegion()).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply refinement" })).not.toHaveAttribute(
      "aria-busy",
    );
    expect(textarea).toHaveValue("add a band");

    await act(async () => {
      pending.resolve({ ok: true, value: makePlan() });
      await Promise.resolve();
    });
    expect(onApply).not.toHaveBeenCalled();
    expect(statusRegion()).toHaveTextContent("Refinement cancelled.");
  });

  it("clears the cancellation notice when the next refinement starts", async () => {
    const user = userEvent.setup();
    deferred();
    const second = deferred();
    renderPanel();
    await user.type(screen.getByLabelText("What should change?"), "add a band");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    expect(statusRegion()).toHaveTextContent("Asking Gemini to apply your change.");
    second.resolve({ ok: false, message: "stop", issues: {} });
    expect(await screen.findByText("stop")).toBeVisible();
  });

  it("aborts the pending request on unmount", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onApply = vi.fn();
    const { unmount } = renderPanel(makeWorkspace(), { onApply });
    await user.type(screen.getByLabelText("What should change?"), "add a band");
    await user.click(screen.getByRole("button", { name: "Apply refinement" }));
    const signal = mockedRefine.mock.calls[0]?.[1];
    unmount();
    expect(signal?.aborted).toBe(true);
    pending.resolve({ ok: true, value: makePlan() });
    await Promise.resolve();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("points total budget, guest count and date changes to the edit details page", () => {
    renderPanel();
    expect(screen.getByRole("link", { name: "Edit event details" })).toHaveAttribute(
      "href",
      "/plan/edit",
    );
    expect(screen.getByText(/To change the total budget, guest count or date/)).toBeVisible();
  });
});
