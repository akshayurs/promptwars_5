import { act, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";

import { IntakeForm } from "@/components/IntakeForm";
import { requestPlan, type ApiResult } from "@/lib/client";
import { todayIso } from "@/lib/format";
import type { Plan } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { futureDate, makePlan } from "./fixtures";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/client", () => ({ requestPlan: vi.fn() }));

const mockedRequestPlan = vi.mocked(requestPlan);

const fillForm = async (user: ReturnType<typeof userEvent.setup>, date: string): Promise<void> => {
  await user.type(screen.getByLabelText("Event name"), "  Priya's Party  ");
  await user.type(screen.getByLabelText("Event date"), date);
  await user.type(screen.getByLabelText("Guest count"), "80");
  await user.type(screen.getByLabelText("Total budget"), "250000");
  await user.type(screen.getByLabelText("City or venue area"), "  Mumbai ");
  await user.type(screen.getByLabelText("Vibe and preferences"), "  Retro disco  ");
};

const fillWedding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.type(screen.getByLabelText("Couple's names"), " Asha and Ravi ");
  await user.type(screen.getByLabelText(/^Ceremony style/), "Traditional Hindu");
};

const fillValidWedding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await fillForm(user, futureDate(30));
  await fillWedding(user);
};

const submitForm = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.click(screen.getByRole("button", { name: "Generate plan" }));
};

describe("IntakeForm", () => {
  beforeEach(() => {
    mockedRequestPlan.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });

  it("renders the event type radio group with a legend", () => {
    render(<IntakeForm />);
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
    render(<IntakeForm />);
    await user.click(screen.getByRole("radio", { name: "Birthday" }));
    expect(screen.getByRole("radio", { name: "Birthday" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Wedding" })).not.toBeChecked();
  });

  it("shows field errors for an empty submit and does not call the API", async () => {
    const user = userEvent.setup();
    render(<IntakeForm />);
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
    render(<IntakeForm />);
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
    render(<IntakeForm />);
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
    render(<IntakeForm />);
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
    render(<IntakeForm />);
    await fillValidWedding(user);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByText("Network error.")).toBeVisible();
    expect(screen.getByLabelText("Event name")).not.toHaveAttribute("aria-invalid");
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

  describe("event details", () => {
    it("shows only the selected event type's details fieldset", async () => {
      const user = userEvent.setup();
      render(<IntakeForm />);
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
      render(<IntakeForm />);
      await user.type(screen.getByLabelText("Couple's names"), "Asha and Ravi");
      await user.click(screen.getByRole("radio", { name: "Birthday" }));
      await user.click(screen.getByRole("radio", { name: "Wedding" }));
      expect(screen.getByLabelText("Couple's names")).toHaveValue("Asha and Ravi");
    });

    it("submits the wedding details", async () => {
      const user = userEvent.setup();
      mockedRequestPlan.mockResolvedValueOnce({ ok: true, value: makePlan() });
      render(<IntakeForm />);
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
      render(<IntakeForm />);
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
      render(<IntakeForm />);
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
      render(<IntakeForm />);
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
      render(<IntakeForm />);
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
      render(<IntakeForm />);
      await fillValidWedding(user);
      await submitForm(user);
      expect(await screen.findByText("Check your inputs")).toBeVisible();
      const style = screen.getByLabelText(/^Ceremony style/);
      expect(style).toHaveAttribute("aria-invalid", "true");
      expect(style).toHaveAccessibleDescription(/Tell us a little more/);
    });
  });
});
