import type { Metadata } from "next";
import { CompareScreen } from "@/components/compare-screen";
export const metadata: Metadata = { title: "Compare" };
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ build?: string }>;
}) {
  return <CompareScreen fromDrawer={(await searchParams).build === "1"} />;
}
