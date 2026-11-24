import type { Metadata } from "next";
import { CompareScreen } from "@/components/compare-screen";
export const metadata: Metadata = { title: "Compare" };
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ build?: string; simulate?: string; team?: string }>;
}) {
  const params = await searchParams;
  return (
    <CompareScreen
      key={JSON.stringify(params)}
      fromDrawer={params.build === "1"}
      autoSimulate={params.simulate === "1"}
      initialTeam={params.team}
    />
  );
}
