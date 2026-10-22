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
      className="rounded px-2 py-1 hover:bg-brand-soft aria-[current=page]:font-semibold aria-[current=page]:underline"
    >
      {children}
    </Link>
  );
};
