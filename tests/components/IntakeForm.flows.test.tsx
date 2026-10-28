import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createPlanFlow } from "@/components/intake/intakeFlows";
import { IntakeForm } from "@/components/IntakeForm";
import type { ApiResult, requestPlan } from "@/lib/client";
import type { Plan } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { makePlan, makeWorkspace } from "./fixtures";
import { fillValidWedding, submitForm } from "./intakeFormHelpers";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const mockedRequestPlan = vi.fn<typeof requestPlan>();
const flow = createPlanFlow({ requestPlan: mockedRequestPlan });

const pendingPlan = (): ((result: ApiResult<Plan>) => void) => {
  const holder: { resolve: (result: ApiResult<Plan>) => void } = { resolve: () => undefined };
  mockedRequestPlan.mockReturnValueOnce(
    new Promise<ApiResult<Plan>>((resolve) => {
      holder.resolve = resolve;
    }),
  );
  return (result) => {
    holder.resolve(result);
  };
};

const generateButton = (): HTMLElement => screen.getByRole("button", { name: "Generate plan" });

describe("IntakeForm privacy notice", () => {
  it("says where event details go and where the plan is kept, next to the submit button", () => {
    render(<IntakeForm flow={flow} />);
    expect(generateButton()).toHaveAccessibleDescription(
      "Your event details are sent to Google Gemini to draft the plan. The plan is saved only in this browser.",
    );
  });
});

describe("IntakeForm cancellation", () => {
  beforeEach(() => {
    mockedRequestPlan.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });

  it("offers Cancel only while generating", async () => {
    const user = userEvent.setup();
    const resolve = pendingPlan();
    render(<IntakeForm flow={flow} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    await fillValidWedding(user);
    await submitForm(user);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    resolve({ ok: false, message: "Network error.", issues: {} });
    expect(await screen.findByText("Network error.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("aborts the request, announces it, keeps the answers and ignores the late plan", async () => {
    const user = userEvent.setup();
    const resolve = pendingPlan();
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await submitForm(user);
    const signal = mockedRequestPlan.mock.calls[0]?.[1];

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(signal?.aborted).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Plan generation cancelled. Your answers are still filled in.",
    );
    expect(generateButton()).toHaveFocus();
    expect(generateButton()).not.toHaveAttribute("aria-busy");
    expect(screen.getByLabelText("Event name")).toHaveValue("  Priya's Party  ");
    expect(screen.getByLabelText("Couple's names")).toHaveValue(" Asha and Ravi ");

    await act(async () => {
      resolve({ ok: true, value: makePlan() });
      await Promise.resolve();
    });
    expect(router.push).not.toHaveBeenCalled();
    expect(workspaceStore.getSnapshot().workspace).toBeNull();
  });

  it("can generate again after cancelling", async () => {
    const user = userEvent.setup();
    pendingPlan();
    mockedRequestPlan.mockResolvedValueOnce({ ok: true, value: makePlan() });
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await submitForm(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await submitForm(user);
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledExactlyOnceWith("/plan");
    });
    expect(mockedRequestPlan).toHaveBeenCalledTimes(2);
  });
});

describe("IntakeForm replacing a saved plan", () => {
  const saved = makeWorkspace();

  beforeEach(() => {
    mockedRequestPlan.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: saved });
  });

  const confirmGroup = (): HTMLElement =>
    screen.getByRole("group", { name: "Replace your current plan?" });

  it("asks before replacing and moves focus to the question", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await submitForm(user);
    expect(confirmGroup()).toHaveFocus();
    expect(confirmGroup()).toHaveTextContent(`replaces “${saved.intake.eventName}”`);
    expect(mockedRequestPlan).not.toHaveBeenCalled();
  });

  it("keeps the current plan and returns focus to the submit button", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await submitForm(user);
    await user.click(screen.getByRole("button", { name: "Keep current plan" }));
    expect(screen.queryByRole("group", { name: /Replace/ })).not.toBeInTheDocument();
    expect(generateButton()).toHaveFocus();
    expect(mockedRequestPlan).not.toHaveBeenCalled();
    expect(workspaceStore.getSnapshot().workspace).toEqual(saved);
  });

  it("replaces the plan once confirmed, sending the answers as they are now", async () => {
    const user = userEvent.setup();
    const plan = makePlan();
    mockedRequestPlan.mockResolvedValueOnce({ ok: true, value: plan });
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await submitForm(user);
    await user.type(screen.getByLabelText("Event name"), "!");
    await user.click(screen.getByRole("button", { name: "Replace and generate" }));
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/plan");
    });
    expect(mockedRequestPlan.mock.calls[0]?.[0].eventName).toBe("Priya's Party  !");
    expect(workspaceStore.getSnapshot().workspace?.plan).toEqual(plan);
  });

  it("validates before asking and hides the question when the answers become invalid", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await submitForm(user);
    expect(screen.queryByRole("group", { name: /Replace/ })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "There is a problem" })).toHaveFocus();

    await fillValidWedding(user);
    await submitForm(user);
    expect(screen.queryByRole("group", { name: "There is a problem" })).not.toBeInTheDocument();
    expect(confirmGroup()).toBeVisible();

    await user.clear(screen.getByLabelText("Event name"));
    await submitForm(user);
    expect(screen.queryByRole("group", { name: /Replace/ })).not.toBeInTheDocument();
  });
});
