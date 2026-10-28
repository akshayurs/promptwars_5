import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createPlanFlow } from "@/components/intake/intakeFlows";
import { IntakeForm } from "@/components/IntakeForm";
import type { requestPlan } from "@/lib/client";
import type { Plan } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { futureDate, makePlan } from "./fixtures";
import { fillForm, fillValidWedding } from "./intakeFormHelpers";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const mockedRequestPlan = vi.fn<typeof requestPlan>();
const flow = createPlanFlow({ requestPlan: mockedRequestPlan });

describe("IntakeForm", () => {
  beforeEach(() => {
    mockedRequestPlan.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });

  it("renders the event type radio group with a legend", () => {
    render(<IntakeForm flow={flow} />);
    const group = screen.getByRole("group", { name: "Event type" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual([
      "wedding",
      "birthday",
      "community",
    ]);
    expect(screen.getByRole("radio", { name: "Wedding" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Community event" })).not.toBeChecked();
  });

  it("switches the selected event type", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await user.click(screen.getByRole("radio", { name: "Birthday" }));
    expect(screen.getByRole("radio", { name: "Birthday" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Wedding" })).not.toBeChecked();
  });

  it("shows field errors for an empty submit and does not call the API", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));

    const problem = screen.getByText("There is a problem").closest("[tabindex='-1']");
    expect(problem).toHaveTextContent("Please correct the highlighted fields.");
    expect(problem).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    for (const label of [
      "Event name",
      "Event date",
      "Guest count",
      "Total budget",
      "City or venue area",
      "Vibe and preferences",
      "Couple's names",
      /^Ceremony style/,
    ]) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute("aria-invalid", "true");
      const errorId = field.getAttribute("aria-describedby")?.split(" ").at(-1);
      expect(errorId).toMatch(/-error$/);
      expect(document.getElementById(errorId ?? "")?.textContent).toBeTruthy();
    }
    expect(screen.getByLabelText("Must-haves (optional)")).not.toHaveAttribute("aria-invalid");
    expect(mockedRequestPlan).not.toHaveBeenCalled();
  });

  it("submits trimmed strings and numeric values, stores the plan and navigates", async () => {
    const user = userEvent.setup();
    const plan: Plan = makePlan();
    mockedRequestPlan.mockResolvedValueOnce({ ok: true, value: plan });
    const date = futureDate(30);
    render(<IntakeForm flow={flow} />);
    await fillForm(user, date);
    await user.click(screen.getByRole("radio", { name: "Birthday" }));
    await user.type(screen.getByLabelText("Guest of honour's name"), " Priya ");
    await user.type(screen.getByLabelText("Age they are turning"), "30");
    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
    await user.click(screen.getByRole("button", { name: "Generate plan" }));

    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledExactlyOnceWith("/plan");
    });
    expect(mockedRequestPlan).toHaveBeenCalledExactlyOnceWith(
      {
        eventType: "birthday",
        details: { honoreeName: "Priya", honoreeAge: 30 },
        eventName: "Priya's Party",
        eventDate: date,
        guestCount: 80,
        totalBudget: 250_000,
        currency: "USD",
        location: "Mumbai",
        vibe: "Retro disco",
        mustHaves: "",
      },
      expect.any(AbortSignal),
    );
    const stored = workspaceStore.getSnapshot().workspace;
    expect(stored?.plan).toEqual(plan);
    expect(stored?.intake.eventName).toBe("Priya's Party");
    expect(stored?.previousPlan).toBeNull();
  });

  it("rejects a past date client-side", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await fillForm(user, "2001-01-01");
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(screen.getByLabelText("Event date")).toHaveAttribute("aria-invalid", "true");
    expect(mockedRequestPlan).not.toHaveBeenCalled();
  });

  it("shows server issues on the matching field and the message in the alert", async () => {
    const user = userEvent.setup();
    mockedRequestPlan.mockResolvedValueOnce({
      ok: false,
      message: "Check your inputs",
      issues: { location: "We could not find that place" },
    });
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));

    expect(await screen.findByText("Check your inputs")).toBeVisible();
    expect(screen.getByText("Check your inputs").closest("[tabindex='-1']")).toHaveFocus();
    const location = screen.getByLabelText("City or venue area");
    expect(location).toHaveAttribute("aria-invalid", "true");
    expect(location).toHaveAccessibleDescription("We could not find that place");
    expect(router.push).not.toHaveBeenCalled();
    expect(workspaceStore.getSnapshot().workspace).toBeNull();
  });

  it("shows a general API failure without field errors", async () => {
    const user = userEvent.setup();
    mockedRequestPlan.mockResolvedValueOnce({ ok: false, message: "Network error.", issues: {} });
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByText("Network error.")).toBeVisible();
    expect(screen.getByLabelText("Event name")).not.toHaveAttribute("aria-invalid");
  });
});
