import Link from "next/link";
import type { Character } from "@/lib/model";
import { ElementBadge, GameIcon } from "./game-icon";

export function CharacterCard({ character }: { character: Character }) {
  return (
    <article
      className="character-card"
      data-rarity={character.rarity}
      data-element={character.element}
    >
      <Link className="character-link" href={`/character/${character.id}`}>
        <div className="character-art">
          <ElementBadge element={character.element} />
          <GameIcon src={character.icon} alt="" size={176} />
        </div>
        <div className="character-caption">
          <h3>{character.name}</h3>
          <span>
            Lv. {character.level} · C{character.constellation}
            {character.source === "preview" && " · Not owned"}
          </span>
        </div>
      </Link>
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
