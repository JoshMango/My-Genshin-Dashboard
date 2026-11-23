"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActionIcon } from "./action-icon";

const pages = [
  ["/", "Roster", "id"],
  ["/teams", "Teams", "people"],
  ["/compare", "Compare", "compare"],
  ["/settings", "Settings", "settings"],
  ["/about", "About", "info"],
] as const;

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="main-nav dashboard-nav">
      {pages.map(([url, name, icon]) => (
        <Link
          key={url}
          href={url}
          aria-current={pathname === url ? "page" : undefined}
        >
          <ActionIcon name={icon} /> {name}
        </Link>
      ))}
    </nav>
  );
}
