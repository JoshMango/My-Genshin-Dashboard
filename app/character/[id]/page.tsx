import { CharacterScreen } from "@/components/character-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CharacterScreen id={id} />;
}
