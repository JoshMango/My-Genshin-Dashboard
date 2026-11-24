"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  ["/", "Roster"],
  ["/teams", "Teams"],
  ["/compare", "Compare"],
  ["/settings", "Settings"],
  ["/about", "About"],
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="main-nav dashboard-nav">
      {pages.map(([url, name]) => (
        <Link
          key={url}
          href={url}
          aria-current={pathname === url ? "page" : undefined}
        >
          {name}
        </Link>
      ))}
    </nav>
  );
}
