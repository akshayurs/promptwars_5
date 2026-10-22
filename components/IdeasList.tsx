import type { ReactElement } from "react";

import type { Idea } from "@/lib/schema";

export type IdeasListProps = { ideas: readonly Idea[] };

export const IdeasList = ({ ideas }: IdeasListProps): ReactElement => (
  <section aria-labelledby="ideas-heading" className="flex flex-col gap-4">
    <h2 id="ideas-heading" className="text-lg font-semibold">
      Personalised ideas
    </h2>
    <ul className="grid gap-4 sm:grid-cols-2">
      {ideas.map((idea) => (
        <li
          key={idea.id}
          className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4"
        >
          <h3 className="font-medium">{idea.title}</h3>
          <p className="text-sm">{idea.description}</p>
          <p className="text-xs text-ink-muted">Inspired by: {idea.inspiredBy}</p>
        </li>
      ))}
    </ul>
  </section>
);
