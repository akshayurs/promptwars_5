import { render, screen } from "@testing-library/react";

import { NextUpCard } from "@/components/NextUpCard";
import { shiftDate, todayIso } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { Milestone } from "@/lib/schema";

const EVENT_DATE = "2030-06-15";

const milestone = (overrides: Partial<Milestone>): Milestone => ({
  id: crypto.randomUUID(),
  title: "Task",
  phase: "planning",
  daysBeforeEvent: 10,
  done: false,
  details: "Details",
  ...overrides,
});

describe("NextUpCard", () => {
  it("is a region labelled Next up", () => {
    render(<NextUpCard timeline={[milestone({})]} eventDate={EVENT_DATE} />);
    expect(screen.getByRole("region", { name: "Next up" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Next up" })).toBeInTheDocument();
  });

  it("shows the earliest-due open milestone with its date, relative label and details", () => {
    const timeline = [
      milestone({ title: "Done already", daysBeforeEvent: 200, done: true }),
      milestone({ title: "Later task", daysBeforeEvent: 30 }),
      milestone({ title: "Book venue", daysBeforeEvent: 90, details: "Pay the deposit" }),
    ];
    const { container } = render(<NextUpCard timeline={timeline} eventDate={EVENT_DATE} />);
    expect(screen.getByText("Book venue")).toBeInTheDocument();
    expect(screen.queryByText("Done already")).not.toBeInTheDocument();
    expect(screen.queryByText("Later task")).not.toBeInTheDocument();
    const date = shiftDate(EVENT_DATE, -90);
    expect(container.querySelector("time")).toHaveAttribute("datetime", date);
    expect(screen.getByText(formatDate(date))).toBeInTheDocument();
    expect(screen.getByText(/90 days before/)).toBeInTheDocument();
    expect(screen.getByText("Pay the deposit")).toBeInTheDocument();
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  it("says when every milestone is complete", () => {
    render(
      <NextUpCard
        timeline={[milestone({ done: true }), milestone({ done: true })]}
        eventDate={EVENT_DATE}
      />,
    );
    expect(screen.getByText("All milestones are complete.")).toBeInTheDocument();
  });

  it("treats an empty timeline as complete", () => {
    render(<NextUpCard timeline={[]} eventDate={EVENT_DATE} />);
    expect(screen.getByText("All milestones are complete.")).toBeInTheDocument();
  });

  it("states in text when the next milestone is overdue", () => {
    const eventDate = shiftDate(todayIso(), 5);
    render(
      <NextUpCard
        timeline={[milestone({ title: "Send invites", daysBeforeEvent: 8 })]}
        eventDate={eventDate}
      />,
    );
    expect(
      screen.getByText(`Overdue: this was due ${formatDate(shiftDate(eventDate, -8))}.`),
    ).toBeInTheDocument();
  });

  it("judges overdue against the injected clock's local day", () => {
    const timeline = [milestone({ title: "Send invites", daysBeforeEvent: 10 })];
    const dueDay = shiftDate(EVENT_DATE, -10);
    render(
      <NextUpCard
        timeline={timeline}
        eventDate={EVENT_DATE}
        now={() => new Date(`${shiftDate(dueDay, 1)}T09:00:00Z`)}
      />,
    );
    expect(screen.getByText(`Overdue: this was due ${formatDate(dueDay)}.`)).toBeInTheDocument();
  });
});
