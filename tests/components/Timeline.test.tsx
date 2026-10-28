import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Timeline } from "@/components/Timeline";
import { shiftDate } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { Milestone } from "@/lib/schema";

import { FIXED_NOW } from "../unit/clock";
import { makePlan } from "./fixtures";
import { preloadLazyChunks } from "./lazy";

const EVENT_DATE = "2030-06-15";
const FIXED_TODAY = FIXED_NOW.toISOString().slice(0, 10);

const milestone = (overrides: Partial<Milestone>): Milestone => ({
  id: crypto.randomUUID(),
  title: "Task",
  phase: "planning",
  daysBeforeEvent: 10,
  done: false,
  details: "Details",
  ...overrides,
});

describe("Timeline", () => {
  it("shows the formatted event date in the heading", () => {
    render(<Timeline timeline={makePlan().timeline} eventDate={EVENT_DATE} />);
    expect(
      screen.getByRole("heading", { level: 2, name: `Timeline to ${formatDate(EVENT_DATE)}` }),
    ).toBeInTheDocument();
  });

  it("groups phases in canonical order", () => {
    const timeline = [
      milestone({ phase: "event-day", daysBeforeEvent: 0, title: "Party" }),
      milestone({ phase: "planning", title: "Plan" }),
      milestone({ phase: "final-prep", title: "Prep" }),
      milestone({ phase: "booking", title: "Book" }),
    ];
    render(<Timeline timeline={timeline} eventDate={EVENT_DATE} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Planning", "Booking", "Final preparations", "Event day"]);
  });

  it("omits empty phases", () => {
    render(
      <Timeline
        timeline={[milestone({ phase: "booking" }), milestone({ phase: "booking" })]}
        eventDate={EVENT_DATE}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Booking");
  });

  it("sorts milestones by daysBeforeEvent descending within a phase", () => {
    const timeline = [
      milestone({ title: "Near", daysBeforeEvent: 5 }),
      milestone({ title: "Far", daysBeforeEvent: 100 }),
      milestone({ title: "Mid", daysBeforeEvent: 30 }),
    ];
    render(<Timeline timeline={timeline} eventDate={EVENT_DATE} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("p")?.textContent)).toEqual(["Far", "Mid", "Near"]);
  });

  it("renders <time> with dateTime equal to event date minus days", () => {
    const { container } = render(
      <Timeline timeline={[milestone({ daysBeforeEvent: 30 })]} eventDate={EVENT_DATE} />,
    );
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", shiftDate(EVENT_DATE, -30));
    expect(time).toHaveAttribute("datetime", "2030-05-16");
    expect(time).toHaveTextContent(formatDate("2030-05-16"));
  });

  it.each([
    [0, "On the day"],
    [1, "1 day before"],
    [2, "2 days before"],
    [45, "45 days before"],
  ])("labels %i days as %s", (days, label) => {
    render(
      <Timeline
        timeline={[milestone({ daysBeforeEvent: days, phase: "booking" })]}
        eventDate={EVENT_DATE}
      />,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent(label);
  });

  it("uses ordered lists", () => {
    render(<Timeline timeline={makePlan().timeline} eventDate={EVENT_DATE} />);
    expect(screen.getAllByRole("list")).toHaveLength(4);
    for (const list of screen.getAllByRole("list")) {
      expect(list.tagName).toBe("OL");
    }
  });

  it("renders milestone details", () => {
    render(
      <Timeline timeline={[milestone({ details: "Call the florist" })]} eventDate={EVENT_DATE} />,
    );
    expect(screen.getByText("Call the florist")).toBeInTheDocument();
  });

  it("shows progress from mount with a labelled progress bar", () => {
    const timeline = [milestone({ done: true }), milestone({}), milestone({})];
    render(<Timeline timeline={timeline} eventDate={EVENT_DATE} />);
    expect(screen.getByRole("status")).toHaveTextContent("1 of 3 milestones done");
    const bar = screen.getByRole("progressbar", { name: "1 of 3 milestones done" });
    expect(bar).toHaveAttribute("value", "1");
    expect(bar).toHaveAttribute("max", "3");
  });

  it("keeps the progress max at least 1 for an empty timeline", () => {
    render(<Timeline timeline={[]} eventDate={EVENT_DATE} />);
    expect(screen.getByRole("status")).toHaveTextContent("0 of 0 milestones done");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "1");
  });
});

describe("Timeline interactive mode", () => {
  beforeAll(preloadLazyChunks);

  it("renders a checkbox per milestone labelled by its title and described by its date", async () => {
    const timeline = [
      milestone({ title: "Book venue", daysBeforeEvent: 30, done: true }),
      milestone({ title: "Send invites", daysBeforeEvent: 20 }),
    ];
    render(<Timeline timeline={timeline} eventDate={EVENT_DATE} onToggle={vi.fn()} />);
    const booked = await screen.findByRole("checkbox", { name: "Book venue" });
    expect(booked).toHaveAttribute("aria-checked", "true");
    expect(booked).toHaveAccessibleDescription(
      `${formatDate(shiftDate(EVENT_DATE, -30))} · 30 days before`,
    );
    expect(screen.getByRole("checkbox", { name: "Send invites" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onToggle with the milestone id", async () => {
    const onToggle = vi.fn();
    const target = milestone({ title: "Hire DJ" });
    render(<Timeline timeline={[target]} eventDate={EVENT_DATE} onToggle={onToggle} />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Hire DJ" }));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(target.id);
  });

  it("shows visible Done text for completed milestones only", async () => {
    const timeline = [
      milestone({ title: "Finished", daysBeforeEvent: 40, done: true }),
      milestone({ title: "Pending", daysBeforeEvent: 30 }),
    ];
    render(<Timeline timeline={timeline} eventDate={EVENT_DATE} onToggle={vi.fn()} />);
    await screen.findAllByRole("checkbox");
    const [finished, pending] = screen.getAllByRole("listitem");
    expect(within(finished!).getByText("Done")).toBeVisible();
    expect(within(pending!).queryByText("Done")).not.toBeInTheDocument();
  });

  it("flags open milestones as Overdue or Due this week relative to today", async () => {
    const eventDate = shiftDate(FIXED_TODAY, 10);
    const timeline = [
      milestone({ title: "Late", daysBeforeEvent: 12 }),
      milestone({ title: "Late but done", daysBeforeEvent: 11, done: true }),
      milestone({ title: "Today", daysBeforeEvent: 10 }),
      milestone({ title: "Soon", daysBeforeEvent: 3 }),
      milestone({ title: "Later", daysBeforeEvent: 2 }),
    ];
    render(<Timeline timeline={timeline} eventDate={eventDate} onToggle={vi.fn()} />);
    await screen.findAllByRole("checkbox");
    const item = (title: string) =>
      screen.getByRole("checkbox", { name: title }).closest("li") as HTMLElement;
    expect(item("Late")).toHaveTextContent("Overdue");
    expect(item("Late but done")).not.toHaveTextContent("Overdue");
    expect(item("Late but done")).toHaveTextContent("Done");
    expect(item("Today")).toHaveTextContent("Due this week");
    expect(item("Soon")).toHaveTextContent("Due this week");
    expect(item("Later")).not.toHaveTextContent(/Overdue|Due this week/);
  });
});

describe("Timeline read-only mode", () => {
  it("has no checkboxes and exposes state as screen-reader text", () => {
    const timeline = [
      milestone({ title: "Finished", daysBeforeEvent: 40, done: true }),
      milestone({ title: "Pending", daysBeforeEvent: 30 }),
    ];
    render(<Timeline timeline={timeline} eventDate={EVENT_DATE} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("(done)")).toHaveClass("sr-only");
    expect(screen.getByText("(open)")).toHaveClass("sr-only");
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("gives each rendered timeline its own heading and progress ids", () => {
    render(
      <>
        <Timeline timeline={[milestone({})]} eventDate={EVENT_DATE} />
        <Timeline timeline={[milestone({ done: true })]} eventDate={EVENT_DATE} />
      </>,
    );
    const [first, second] = screen.getAllByRole("region");
    expect(first).toHaveAccessibleName(`Timeline to ${formatDate(EVENT_DATE)}`);
    expect(second).toHaveAccessibleName(`Timeline to ${formatDate(EVENT_DATE)}`);
    expect(screen.getByRole("progressbar", { name: "0 of 1 milestones done" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "1 of 1 milestones done" })).toBeVisible();
  });

  it("uses the planner's local calendar day from the injected clock", async () => {
    const eventDate = "2031-01-11";
    // 20:00 UTC on 31 Dec is already 1 Jan for a planner east of UTC.
    const eastOfUtc = (): Date =>
      Object.assign(new Date("2030-12-31T20:00:00Z"), {
        getFullYear: () => 2031,
        getMonth: () => 0,
        getDate: () => 1,
      });
    const timeline = [milestone({ title: "Book the band", daysBeforeEvent: 11 })];
    render(
      <Timeline timeline={timeline} eventDate={eventDate} onToggle={vi.fn()} now={eastOfUtc} />,
    );
    const item = (await screen.findByRole("checkbox", { name: "Book the band" })).closest("li");
    expect(item).toHaveTextContent("Overdue");
  });
});
