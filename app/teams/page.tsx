import type { Metadata } from "next";
import Link from "next/link";
import { TeamBuilder } from "@/components/team-builder";
import { TeamDiscovery } from "@/components/team-discovery";
export const metadata: Metadata = { title: "Teams" };
export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const discover = (await searchParams).tab === "discover";
  return (
    <>
      <nav aria-label="Team tools" className="input-row team-tabs">
        <Link
          href="/teams?tab=builder"
          className={discover ? "button quiet" : "button"}
          aria-current={!discover ? "page" : undefined}
        >
          Builder
        </Link>
        <Link
          href="/teams?tab=discover"
          className={discover ? "button" : "button quiet"}
          aria-current={discover ? "page" : undefined}
        >
          Discover
        </Link>
      </nav>
      {discover ? <TeamDiscovery /> : <TeamBuilder />}
    </>
  );
}
