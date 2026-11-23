import type { Metadata } from "next";
import { CompareScreen } from "@/components/compare-screen";
export const metadata: Metadata = { title: "Compare" };
export default function ComparePage() {
  return <CompareScreen />;
}
