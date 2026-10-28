import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createPlanFlow } from "@/components/intake/intakeFlows";
import { IntakeForm } from "@/components/IntakeForm";
import type { requestPlan } from "@/lib/client";
import { workspaceStore } from "@/lib/workspaceStore";

import { futureDate, makePlan } from "./fixtures";
import { fillForm, fillValidWedding, submitForm } from "./intakeFormHelpers";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const mockedRequestPlan = vi.fn<typeof requestPlan>();
const flow = createPlanFlow({ requestPlan: mockedRequestPlan });

describe("IntakeForm event details", () => {
  beforeEach(() => {
    mockedRequestPlan.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });

  it("shows only the selected event type's details fieldset", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    const wedding = screen.getByRole("group", { name: "Wedding details" });
    expect(within(wedding).getByLabelText("Couple's names")).toBeRequired();
    expect(screen.queryByRole("group", { name: "Birthday details" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Birthday" }));
    const birthday = screen.getByRole("group", { name: "Birthday details" });
    expect(within(birthday).getByLabelText("Age they are turning")).toHaveAttribute(
      "type",
      "number",
    );
    expect(screen.queryByRole("group", { name: "Wedding details" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Couple's names")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Community event" }));
    const community = screen.getByRole("group", { name: "Community event details" });
    expect(within(community).getByLabelText("Admission")).toHaveValue("free");
    expect(
      within(community).getByRole("checkbox", { name: "This event needs a public permit" }),
    ).not.toBeChecked();
    expect(screen.queryByRole("group", { name: "Birthday details" })).not.toBeInTheDocument();
  });

  it("keeps typed details when switching away and back", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await user.type(screen.getByLabelText("Couple's names"), "Asha and Ravi");
    await user.click(screen.getByRole("radio", { name: "Birthday" }));
    await user.click(screen.getByRole("radio", { name: "Wedding" }));
    expect(screen.getByLabelText("Couple's names")).toHaveValue("Asha and Ravi");
  });

  it("submits the wedding details", async () => {
    const user = userEvent.setup();
    mockedRequestPlan.mockResolvedValueOnce({ ok: true, value: makePlan() });
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await submitForm(user);
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/plan");
    });
    expect(mockedRequestPlan.mock.calls[0]?.[0]).toMatchObject({
      eventType: "wedding",
      details: { coupleNames: "Asha and Ravi", ceremonyStyle: "Traditional Hindu" },
    });
  });

  it("submits community details with a boolean permit flag", async () => {
    const user = userEvent.setup();
    mockedRequestPlan.mockResolvedValueOnce({ ok: true, value: makePlan() });
    render(<IntakeForm flow={flow} />);
    await fillForm(user, futureDate(30));
    await user.click(screen.getByRole("radio", { name: "Community event" }));
    await user.selectOptions(screen.getByLabelText("Admission"), "ticketed");
    await user.click(screen.getByRole("checkbox", { name: "This event needs a public permit" }));
    await submitForm(user);
    await vi.waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/plan");
    });
    const payload = mockedRequestPlan.mock.calls[0]?.[0];
    expect(payload?.eventType).toBe("community");
    expect(payload?.details).toStrictEqual({ admission: "ticketed", needsPermit: true });
  });

  it("does not submit details of a type that is no longer selected", async () => {
    const user = userEvent.setup();
    mockedRequestPlan.mockResolvedValueOnce({ ok: true, value: makePlan() });
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await user.click(screen.getByRole("radio", { name: "Community event" }));
    await submitForm(user);
    await vi.waitFor(() => {
      expect(mockedRequestPlan).toHaveBeenCalledTimes(1);
    });
    expect(mockedRequestPlan.mock.calls[0]?.[0].details).toStrictEqual({
      admission: "free",
      needsPermit: false,
    });
  });

  it.each(["0", "121", "7.5"])("rejects honoree age %s on the age field", async (age) => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await fillForm(user, futureDate(30));
    await user.click(screen.getByRole("radio", { name: "Birthday" }));
    await user.type(screen.getByLabelText("Guest of honour's name"), "Aarav");
    await user.type(screen.getByLabelText("Age they are turning"), age);
    await submitForm(user);
    const ageField = screen.getByLabelText("Age they are turning");
    expect(ageField).toHaveAttribute("aria-invalid", "true");
    expect(ageField).toHaveAccessibleDescription(/.+/);
    expect(screen.getByLabelText("Guest of honour's name")).not.toHaveAttribute("aria-invalid");
    expect(mockedRequestPlan).not.toHaveBeenCalled();
  });

  it("flags a too-short couple name on that field", async () => {
    const user = userEvent.setup();
    render(<IntakeForm flow={flow} />);
    await fillForm(user, futureDate(30));
    await user.type(screen.getByLabelText("Couple's names"), "A");
    await user.type(screen.getByLabelText(/^Ceremony style/), "Civil");
    await submitForm(user);
    expect(screen.getByLabelText("Couple's names")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Ceremony style/)).not.toHaveAttribute("aria-invalid");
    expect(mockedRequestPlan).not.toHaveBeenCalled();
  });

  it("maps nested server issues onto the details field", async () => {
    const user = userEvent.setup();
    mockedRequestPlan.mockResolvedValueOnce({
      ok: false,
      message: "Check your inputs",
      issues: { "details.ceremonyStyle": "Tell us a little more" },
    });
    render(<IntakeForm flow={flow} />);
    await fillValidWedding(user);
    await submitForm(user);
    expect(await screen.findByText("Check your inputs")).toBeVisible();
    const style = screen.getByLabelText(/^Ceremony style/);
    expect(style).toHaveAttribute("aria-invalid", "true");
    expect(style).toHaveAccessibleDescription(/Tell us a little more/);
  });
});
