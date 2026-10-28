import { useId, type ReactElement } from "react";

import { IconBadge } from "@/components/ui/IconBadge";
import { BulbIcon } from "@/components/ui/Icons";
import { CARD, SECTION_HEADING } from "@/components/ui/styles";
import type { Idea } from "@/lib/schema";

export type IdeasListProps = { ideas: readonly Idea[] };

export const IdeasList = ({ ideas }: IdeasListProps): ReactElement => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className={SECTION_HEADING}>
        Personalised ideas
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ideas.map((idea) => (
          <li
            key={idea.id}
            className={`${CARD} flex break-inside-avoid flex-col gap-3 p-5 transition-colors hover:border-brand/40`}
          >
            <IconBadge>
              <BulbIcon />
            </IconBadge>
            <h3 className="font-semibold tracking-tight">{idea.title}</h3>
            <p className="flex-1 text-sm leading-relaxed">{idea.description}</p>
            <p className="border-t border-line pt-3 text-xs text-ink-muted">
              Inspired by: {idea.inspiredBy}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
