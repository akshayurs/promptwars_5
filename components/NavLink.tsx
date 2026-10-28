"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, ReactNode } from "react";

export type NavLinkProps = { href: Route; children: ReactNode };

export const NavLink = ({ href, children }: NavLinkProps): ReactElement => {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-11 items-center rounded-lg px-3 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink aria-[current=page]:bg-brand-soft aria-[current=page]:font-semibold aria-[current=page]:text-brand"
    >
      {children}
    </Link>
  );
};
