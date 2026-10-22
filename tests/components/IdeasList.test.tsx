import { render, screen } from "@testing-library/react";

import { IdeasList } from "@/components/IdeasList";

import { makePlan } from "./fixtures";

describe("IdeasList", () => {
  it("renders the heading", () => {
    render(<IdeasList ideas={makePlan().ideas} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Personalised ideas" }),
    ).toBeInTheDocument();
  });

  it("renders every idea with title, description and inspiration", () => {
    const { ideas } = makePlan();
    render(<IdeasList ideas={ideas} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(ideas.length);
    for (const idea of ideas) {
      expect(screen.getByRole("heading", { level: 3, name: idea.title })).toBeInTheDocument();
      expect(screen.getByText(idea.description)).toBeInTheDocument();
      expect(screen.getByText(`Inspired by: ${idea.inspiredBy}`)).toBeInTheDocument();
    }
  });

  it("renders no items for an empty list", () => {
    render(<IdeasList ideas={[]} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
