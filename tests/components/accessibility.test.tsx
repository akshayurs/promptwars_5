import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";

import { EventFacts } from "@/components/EventFacts";
import { IntakeForm } from "@/components/IntakeForm";
import { RefinePanel } from "@/components/RefinePanel";
import { useLongWait } from "@/components/useLongWait";
import { metadata as notFoundMetadata } from "@/app/not-found";
import { requestPlan, requestRefinement, type ApiResult } from "@/lib/client";
import { LONG_WAIT_NOTICE_MS } from "@/lib/constants";
import type { Plan, StoredWorkspace } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

import { futureDate, makePlan, makeWorkspace } from "./fixtures";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/client", () => ({ requestPlan: vi.fn(), requestRefinement: vi.fn() }));

const mockedPlan = vi.mocked(requestPlan);
const mockedRefine = vi.mocked(requestRefinement);

type Resolver = (result: ApiResult<Plan>) => void;

const pendingResult = (): { promise: Promise<ApiResult<Plan>>; resolve: Resolver } => {
  const holder: { resolve: Resolver } = { resolve: () => undefined };
  const promise = new Promise<ApiResult<Plan>>((resolve) => {
    holder.resolve = resolve;
  });
  return {
    promise,
    resolve: (result) => {
      holder.resolve(result);
    },
  };
};

const INTAKE_VALUES: ReadonlyArray<[string, string]> = [
  ["Event name", "Asha & Ravi Wedding"],
  ["Couple's names", "Asha and Ravi"],
  ["Ceremony style", "Traditional Hindu"],
  ["Event date", futureDate(30)],
  ["Guest count", "120"],
  ["Total budget", "400000"],
  ["City or venue area", "Pune"],
  ["Vibe and preferences", "Garden party"],
];

const fillIntake = (): void => {
  for (const [label, value] of INTAKE_VALUES) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
};

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const settle = async (resolve: Resolver, result: ApiResult<Plan>): Promise<void> => {
  await act(async () => {
    resolve(result);
    await Promise.resolve();
  });
};

describe("useLongWait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays false while idle and schedules nothing", () => {
    const { result } = renderHook(() => useLongWait(false));
    advance(LONG_WAIT_NOTICE_MS * 2);
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("turns true only after the delay and resets when the request settles", () => {
    const { result, rerender } = renderHook(({ pending }) => useLongWait(pending), {
      initialProps: { pending: true },
    });
    advance(LONG_WAIT_NOTICE_MS - 1);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
    rerender({ pending: false });
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    rerender({ pending: true });
    expect(result.current).toBe(false);
  });

  it("clears its timer on unmount", () => {
    const { unmount } = renderHook(() => useLongWait(true));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("intake generation progress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedPlan.mockReset();
    router.push.mockReset();
    workspaceStore.dispatch({ type: "replace", workspace: null });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the form busy, reassures after the delay and clears on completion", async () => {
    const pending = pendingResult();
    mockedPlan.mockReturnValueOnce(pending.promise);
    render(<IntakeForm />);
    fillIntake();
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    const form = screen.getByRole("button", { name: "Generating your plan…" }).closest("form");
    const status = screen.getByRole("status");
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(form).not.toContainElement(status);
    expect(status).toHaveTextContent(/Asking Gemini/);

    advance(LONG_WAIT_NOTICE_MS);
    expect(status).toHaveTextContent(/Still drafting your plan.*about half a minute/);

    await settle(pending.resolve, { ok: false, message: "Network error.", issues: {} });
    expect(form).not.toHaveAttribute("aria-busy");
    expect(status).toBeEmptyDOMElement();
    advance(LONG_WAIT_NOTICE_MS);
    expect(status).toBeEmptyDOMElement();
  });

  it("clears the reassurance timer when unmounted mid-request", () => {
    mockedPlan.mockReturnValueOnce(pendingResult().promise);
    const { unmount } = render(<IntakeForm />);
    fillIntake();
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("intake form guidance and error summary", () => {
  beforeEach(() => {
    mockedPlan.mockReset();
  });

  it("states that fields are required unless marked optional", () => {
    render(<IntakeForm />);
    expect(screen.getByText("All fields are required unless marked optional.")).toBeVisible();
  });

  it("links every invalid field from the summary in form order", () => {
    render(<IntakeForm />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    const summary = screen.getByText("There is a problem").closest("[tabindex='-1']");
    const links = within(summary as HTMLElement).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#eventName",
      "#coupleNames",
      "#ceremonyStyle",
      "#eventDate",
      "#guestCount",
      "#totalBudget",
      "#location",
      "#vibe",
    ]);
    expect(links[0]).toHaveTextContent(/^Event name: .+/);
  });

  it("moves focus to the field when a summary link is followed", () => {
    render(<IntakeForm />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    fireEvent.click(screen.getByRole("link", { name: /^Guest count:/ }));
    expect(screen.getByLabelText("Guest count")).toHaveFocus();
  });

  it("lists nested server issues against the details field", async () => {
    mockedPlan.mockResolvedValueOnce({
      ok: false,
      message: "Check your inputs",
      issues: { "details.ceremonyStyle": "Tell us a little more", unknown: "Ignored" },
    });
    render(<IntakeForm />);
    fillIntake();
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    const link = await screen.findByRole("link", { name: "Ceremony style: Tell us a little more" });
    expect(link).toHaveAttribute("href", "#ceremonyStyle");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows no link list for a general failure", async () => {
    mockedPlan.mockResolvedValueOnce({ ok: false, message: "Network error.", issues: {} });
    render(<IntakeForm />);
    fillIntake();
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByText("Network error.")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("refine progress", () => {
  const renderPanel = (workspace: StoredWorkspace): void => {
    workspaceStore.dispatch({ type: "replace", workspace });
    render(<RefinePanel workspace={workspace} onApply={vi.fn()} onUndo={vi.fn()} />);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockedRefine.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the form busy and announces progress in the status region", async () => {
    const pending = pendingResult();
    mockedRefine.mockReturnValueOnce(pending.promise);
    renderPanel(makeWorkspace());
    const textarea = screen.getByLabelText("What should change?");
    fireEvent.change(textarea, { target: { value: "add a dessert bar" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply refinement" }));

    const form = textarea.closest("form");
    const status = screen.getByRole("status");
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(form).not.toContainElement(status);
    expect(status).toHaveTextContent("Asking Gemini to apply your change.");

    advance(LONG_WAIT_NOTICE_MS);
    expect(status).toHaveTextContent(/Still refining your plan.*about half a minute/);

    await settle(pending.resolve, { ok: false, message: "Model overloaded", issues: {} });
    expect(form).not.toHaveAttribute("aria-busy");
    expect(status).toHaveTextContent("Model overloaded");
    expect(status).not.toHaveTextContent(/Still refining/);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("explains in text why undo is unavailable", () => {
    renderPanel(makeWorkspace({ previousPlan: null }));
    const undo = screen.getByRole("button", { name: "Undo last refinement" });
    expect(undo).toBeDisabled();
    expect(undo).toHaveAccessibleDescription("Nothing to undo yet.");
  });

  it("drops the undo reason once there is something to undo", () => {
    renderPanel(makeWorkspace({ previousPlan: makePlan() }));
    expect(screen.getByRole("button", { name: "Undo last refinement" })).not.toHaveAttribute(
      "aria-describedby",
    );
    expect(screen.queryByText("Nothing to undo yet.")).not.toBeInTheDocument();
  });
});

describe("semantics", () => {
  it("marks the event date up as a machine-readable time", () => {
    const workspace = makeWorkspace();
    render(<EventFacts workspace={workspace} />);
    const date = screen.getByText("Date", { selector: "dt" }).nextElementSibling;
    expect(date?.querySelector("time")).toHaveAttribute("datetime", workspace.intake.eventDate);
  });

  it("gives the not-found page its own document title", () => {
    expect(notFoundMetadata.title).toBe("Page not found");
  });
});
