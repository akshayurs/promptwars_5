import { render, screen, within } from "@testing-library/react";

import { Timeline } from "@/components/Timeline";
import { formatDate, shiftDate } from "@/lib/format";
import type { Milestone } from "@/lib/schema";

import { makePlan } from "./fixtures";

const EVENT_DATE = "2030-06-15";

const milestone = (overrides: Partial<Milestone>): Milestone => ({
  id: crypto.randomUUID(),
  title: "Task",
  phase: "planning",
  daysBeforeEvent: 10,
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
    for (const list of screen.getAllByRole("list")) expect(list.tagName).toBe("OL");
  });

  it("renders milestone details", () => {
    render(
      <Timeline timeline={[milestone({ details: "Call the florist" })]} eventDate={EVENT_DATE} />,
    );
    expect(screen.getByText("Call the florist")).toBeInTheDocument();
  });
});
