import type { Metadata } from "next";
import { TeamBuilder } from "@/components/team-builder";
export const metadata: Metadata = { title: "Team builder" };
export default function TeamsPage() {
  return <TeamBuilder />;
}
