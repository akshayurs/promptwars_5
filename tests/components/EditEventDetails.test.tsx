import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";

import { EditEventDetails } from "@/components/intake/EditEventDetails";
import { requestRefinement, type ApiResult } from "@/lib/client";
import { buildAdaptRequest } from "@/lib/intakeEdit";
import type { Plan } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { makeIntakeFor, makePlan, makeWorkspace } from "./fixtures";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/client", () => ({ requestPlan: vi.fn(), requestRefinement: vi.fn() }));

const mockedRefine = vi.mocked(requestRefinement);
const intake = makeIntakeFor("birthday", { guestCount: 40, totalBudget: 80_000 });
const saved = makeWorkspace({ intake, previousPlan: makePlan() });

const updateButton = (): HTMLElement => screen.getByRole("button", { name: "Update plan" });

describe("EditEventDetails", () => {
  beforeEach(() => {
    mockedRefine.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: saved });
  });

  it("shows the loading notice before the browser store is readable", () => {
    const html = renderToString(<EditEventDetails />);
    expect(html).toContain("Edit event details");
    expect(html).toContain("Loading your plan");
  });

  it("shows the empty state when no plan is saved", () => {
    workspaceStore.dispatch({ type: "replace", workspace: null });
    render(<EditEventDetails />);
    expect(screen.getByRole("heading", { level: 1, name: "Edit event details" })).toBeVisible();
    expect(screen.getByText("No plan yet")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Update plan" })).not.toBeInTheDocument();
  });

  it("pre-fills every field from the saved intake under one focused heading", () => {
    render(<EditEventDetails />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Edit event details");
    expect(heading).toHaveFocus();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Birthday" })).toBeChecked();
    expect(screen.getByLabelText("Event name")).toHaveValue(intake.eventName);
    expect(screen.getByLabelText("Guest of honour's name")).toHaveValue("Aarav");
    expect(screen.getByLabelText("Age they are turning")).toHaveValue(7);
    expect(screen.getByLabelText("Event date")).toHaveValue(intake.eventDate);
    expect(screen.getByLabelText("Guest count")).toHaveValue(40);
    expect(screen.getByLabelText("Total budget")).toHaveValue(80_000);
    expect(screen.getByLabelText("Currency")).toHaveValue(intake.currency);
    expect(screen.getByLabelText("City or venue area")).toHaveValue(intake.location);
    expect(screen.getByLabelText("Vibe and preferences")).toHaveValue(intake.vibe);
    expect(screen.getByLabelText("Must-haves (optional)")).toHaveValue(intake.mustHaves);
    expect(screen.getByRole("link", { name: "Back to the workspace" })).toHaveAttribute(
      "href",
      "/plan",
    );
  });

  it.each([
    ["wedding", "Couple's names", "Asha and Ravi"],
    ["community", "Admission", "free"],
  ] as const)("pre-fills %s details", (type, label, value) => {
    workspaceStore.dispatch({
      type: "replace",
      workspace: makeWorkspace({ intake: makeIntakeFor(type) }),
    });
    render(<EditEventDetails />);
    expect(screen.getByLabelText(label)).toHaveValue(value);
  });

  it("adapts the plan to the edited details and saves both without asking to replace", async () => {
    const user = userEvent.setup();
    const adapted = makePlan({ summary: "Now for sixty guests." });
    mockedRefine.mockResolvedValueOnce({ ok: true, value: adapted });
    render(<EditEventDetails />);
    const guests = screen.getByLabelText("Guest count");
    await user.clear(guests);
    await user.type(guests, "60");
    await user.click(updateButton());

    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledExactlyOnceWith("/plan");
    });
    expect(screen.queryByRole("group", { name: /Replace/ })).not.toBeInTheDocument();
    const edited = { ...intake, guestCount: 60 };
    expect(mockedRefine).toHaveBeenCalledExactlyOnceWith(
      buildAdaptRequest(edited, saved.plan),
      expect.any(AbortSignal),
    );
    const stored = workspaceStore.getSnapshot().workspace;
    expect(stored?.intake).toEqual(edited);
    expect(stored?.plan).toEqual(adapted);
    expect(stored?.previousPlan).toBeNull();
  });

  it("can be cancelled without touching the saved plan", async () => {
    const user = userEvent.setup();
    const holder: { resolve: (result: ApiResult<Plan>) => void } = { resolve: () => undefined };
    mockedRefine.mockReturnValueOnce(
      new Promise<ApiResult<Plan>>((resolve) => {
        holder.resolve = resolve;
      }),
    );
    render(<EditEventDetails />);
    await user.click(updateButton());
    expect(screen.getByRole("button", { name: "Updating your plan…" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(/adapt your plan to the new details/);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Update cancelled. Your saved plan has not changed.",
    );
    await act(async () => {
      holder.resolve({ ok: true, value: makePlan() });
      await Promise.resolve();
    });
    expect(workspaceStore.getSnapshot().workspace).toEqual(saved);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a refine failure in the error summary and keeps the edits", async () => {
    const user = userEvent.setup();
    mockedRefine.mockResolvedValueOnce({ ok: false, message: "Model overloaded", issues: {} });
    render(<EditEventDetails />);
    await user.type(screen.getByLabelText("City or venue area"), " West");
    await user.click(updateButton());
    expect(await screen.findByRole("group", { name: "There is a problem" })).toHaveFocus();
    expect(screen.getByText("Model overloaded")).toBeVisible();
    expect(screen.getByLabelText("City or venue area")).toHaveValue(`${intake.location} West`);
    expect(workspaceStore.getSnapshot().workspace).toEqual(saved);
  });
});
