"use client";

import type { Character } from "@/lib/model";
import { useOpenCharacter } from "./character-drawer";
import { ElementBadge, GameIcon } from "./game-icon";
import { RarityStars } from "./rarity-stars";

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
          {(character.rarity === 4 || character.rarity === 5) && (
            <RarityStars rarity={character.rarity} />
          )}
          <span className="character-level">
            <strong
              data-high-level={
                character.level >= 91 && character.level <= 100 ? "" : undefined
              }
            >
              Lv. {character.level}
            </strong>{" "}
            · C{character.constellation}
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
        <div className="roster-weapon-group">
          <span className="roster-gear-label">Weapon</span>
          <span
            className="roster-weapon weapon-rarity"
            data-rarity={character.weapon?.rarity}
            title={character.weapon?.name}
          >
            <GameIcon
              src={character.weapon?.icon}
              alt={character.weapon?.name ?? "Weapon unavailable"}
              size={31}
            />
          </span>
        </div>
        {character.artifacts.length > 0 && (
          <div className="roster-artifact-group">
            <span className="roster-gear-label">Artifacts</span>
            <div className="roster-artifact-icons">
              {character.artifacts.map((artifact) => (
                <GameIcon
                  key={artifact.id}
                  src={artifact.icon}
                  alt={`${artifact.setName} ${artifact.slot}`}
                  size={21}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
