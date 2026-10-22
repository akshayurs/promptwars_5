import { render, screen } from "@testing-library/react";

import { EventFacts } from "@/components/EventFacts";
import type { EventType, Intake } from "@/lib/schema";

import { makeIntake, makeIntakeFor, makeWorkspace } from "./fixtures";

const renderFacts = (intake: Intake): void => {
  render(<EventFacts workspace={makeWorkspace({ intake })} />);
};

const brief = (): HTMLElement => screen.getByRole("region", { name: "Your brief" });

describe("EventFacts", () => {
  it.each([
    ["wedding", "Wedding", "Asha and Ravi · Traditional Hindu ceremony"],
    ["birthday", "Birthday", "Aarav turns 7"],
    ["community", "Community event", "Free admission · permit required"],
  ] as const)("shows the %s badge and details summary", (type: EventType, badge, summary) => {
    renderFacts(makeIntakeFor(type));
    expect(screen.getByText(badge, { selector: "p" })).toBeVisible();
    expect(brief()).toHaveTextContent(summary);
  });

  it("labels the brief with a level-two heading", () => {
    renderFacts(makeIntakeFor("wedding"));
    expect(screen.getByRole("heading", { level: 2, name: "Your brief" })).toBeVisible();
  });

  it("does not repeat 'ceremony' when the style already names it", () => {
    renderFacts({
      ...makeIntake(),
      eventType: "wedding",
      details: { coupleNames: "Asha and Ravi", ceremonyStyle: "Civil ceremony" },
    });
    expect(brief()).toHaveTextContent("Asha and Ravi · Civil ceremony");
    expect(brief()).not.toHaveTextContent("ceremony ceremony");
  });

  it("describes ticketed community events without a permit", () => {
    renderFacts({
      ...makeIntake(),
      eventType: "community",
      details: { admission: "ticketed", needsPermit: false },
    });
    expect(brief()).toHaveTextContent("Ticketed admission · no permit needed");
  });

  it("echoes the vibe and must-haves the user typed", () => {
    renderFacts(makeIntakeFor("birthday", { vibe: "Dinosaur jungle", mustHaves: "Magic show" }));
    expect(screen.getByText("Vibe", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      "Dinosaur jungle",
    );
    expect(screen.getByText("Must-haves", { selector: "dt" }).nextElementSibling).toHaveTextContent(
      "Magic show",
    );
  });

  it("omits must-haves when none were given", () => {
    renderFacts(makeIntakeFor("birthday", { mustHaves: "" }));
    expect(screen.queryByText("Must-haves", { selector: "dt" })).not.toBeInTheDocument();
    expect(screen.getByText("Vibe", { selector: "dt" })).toBeVisible();
  });

  it("renders user text as text, not markup", () => {
    renderFacts({
      ...makeIntake(),
      eventType: "birthday",
      details: { honoreeName: "<b>Zed</b>", honoreeAge: 30 },
    });
    expect(brief()).toHaveTextContent("<b>Zed</b> turns 30");
    expect(brief().querySelector("b")).toBeNull();
  });
});
