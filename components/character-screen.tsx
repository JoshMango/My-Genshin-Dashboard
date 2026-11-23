"use client";

import Link from "next/link";
import { useDashboard } from "./dashboard-state";
import { ElementBadge, GameIcon } from "./game-icon";

export function CharacterScreen({ id }: { id: string }) {
  const { characters } = useDashboard();
  const character = characters.find((entry) => entry.id === id);
  if (!character)
    return (
      <section className="panel">
        <h1>Character unavailable</h1>
        <p>
          <Link href="/">Import a showcase</Link> to open this character.
        </p>
      </section>
    );
  return (
    <section className="panel">
      <h1>{character.name}</h1>
      <ElementBadge element={character.element} />
      <p>
        Lv. {character.level} · C{character.constellation}
      </p>
      <GameIcon
        src={character.art ?? character.icon}
        alt={character.name}
        size={320}
      />
    </section>
  );
}
