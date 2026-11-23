"use client";

import type { Character } from "@/lib/model";
import { useOpenCharacter } from "./character-drawer";
import { ElementBadge, GameIcon } from "./game-icon";

export function CharacterCard({ character }: { character: Character }) {
  const open = useOpenCharacter();
  return (
    <article
      className="character-card"
      data-rarity={character.rarity}
      data-element={character.element}
    >
      <button
        type="button"
        className="character-link"
        onClick={() => open(character)}
      >
        <div className="character-art">
          <ElementBadge element={character.element} />
          <GameIcon src={character.icon} alt="" size={176} />
        </div>
        <div className="character-caption">
          <h3>{character.name}</h3>
          <span>
            Lv. {character.level} · C{character.constellation}
          </span>
          <span className="source-badge">
            {character.source === "showcase"
              ? "Showcase"
              : character.source === "preview"
                ? "Not owned"
                : "Imported"}
          </span>
        </div>
      </button>
      <div className="gear-icons">
        <GameIcon
          src={character.weapon?.icon}
          alt={character.weapon?.name ?? "Weapon unavailable"}
          size={28}
        />
        {character.artifacts.map((artifact) => (
          <GameIcon
            key={artifact.id}
            src={artifact.icon}
            alt={`${artifact.setName} ${artifact.slot}`}
            size={25}
          />
        ))}
      </div>
    </article>
  );
}
