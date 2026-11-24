"use client";

import Link from "next/link";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { artifactPieceFields, loadDescriptions } from "@/lib/enka/descriptions";
import { slots, type Character } from "@/lib/model";
import type { Team } from "@/lib/teams";
import { ActionIcon } from "./action-icon";
import { ArtifactSlot } from "./artifact-slot";
import { ArtifactVerdict } from "./artifact-verdict";
import { CharacterAppearance } from "./character-appearance";
import { CombatStats } from "./combat-stats";
import { useDashboard } from "./dashboard-state";
import { ElementBadge, GameIcon } from "./game-icon";
import { RarityStars } from "./rarity-stars";
import { WeaponCard } from "./weapon-card";

const tabs = [
  "Details / Stats",
  "Artifacts",
  "Constellations",
  "Talents",
] as const;
type Descriptions = Awaited<ReturnType<typeof loadDescriptions>>;

export function CharacterScreen({ id }: { id: string }) {
  const { characters } = useDashboard();
  const character = characters.find((entry) => entry.id === id);
  return character ? (
    <CharacterDetails key={id} character={character} />
  ) : (
    <section className="panel">
      <h1>Character unavailable</h1>
      <p>
        <Link href="/">Import a showcase</Link> to open this character.
      </p>
    </section>
  );
}

export function CharacterDetails({
  character,
  compact = false,
  team,
}: {
  character: Character;
  compact?: boolean;
  team?: Team;
}) {
  const panelId = useId();
  const [tab, setTab] = useState(0);
  const [loaded, setLoaded] = useState<{
    character: Character;
    details: Descriptions;
  }>();
  const details = loaded?.character === character ? loaded.details : undefined;
  useEffect(() => {
    let cancelled = false;
    void loadDescriptions(character).then((value) => {
      if (!cancelled) setLoaded({ character, details: value });
    });
    return () => {
      cancelled = true;
    };
  }, [character]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const directions: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (tab + (directions[event.key] ?? 0) + tabs.length) % tabs.length;
    if (index !== tab || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setTab(index);
      document.getElementById(`${panelId}-tab-${index}`)?.focus();
    }
  }

  const equippedSets = new Map<string, Character["artifacts"]>();
  for (const item of character.artifacts) {
    if (item.setName === "Unknown set") continue;
    const pieces = equippedSets.get(item.setName) ?? [];
    pieces.push(item);
    equippedSets.set(item.setName, pieces);
  }
  const activeSets = [...equippedSets].filter(
    ([, pieces]) => pieces.length >= 2,
  );
  const identity = (
    <header className="detail-identity">
      <ElementBadge element={character.element} />
      {compact ? <h2>{character.name}</h2> : <h1>{character.name}</h1>}
      {compact && (character.rarity === 4 || character.rarity === 5) && (
        <RarityStars rarity={character.rarity} />
      )}
      <p className="muted">
        Lv. {character.level} · Ascension {character.ascension} · C
        {character.constellation}
      </p>
    </header>
  );
  const weaponCard = character.weapon && (
    <WeaponCard
      key={character.weapon.id}
      weapon={character.weapon}
      passiveName={details?.weaponName}
      passive={details?.weaponText}
      loading={!details}
      compact={compact}
    />
  );

  return (
    <>
      {!compact && (
        <Link className="back-link" href="/">
          Character Roster
        </Link>
      )}
      <section
        className="character-detail section-space"
        data-element={character.element}
      >
        <div
          role="tablist"
          aria-label="Character details"
          className="detail-tabs"
        >
          {tabs.map((label, index) => (
            <button
              type="button"
              role="tab"
              id={`${panelId}-tab-${index}`}
              key={label}
              aria-selected={tab === index}
              tabIndex={tab === index ? 0 : -1}
              aria-controls={panelId}
              className={tab === index ? "" : "quiet"}
              onClick={() => setTab(index)}
              onKeyDown={navigate}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className={tab === 0 ? "detail-panel" : "panel detail-panel"}
          role="tabpanel"
          id={panelId}
          aria-labelledby={`${panelId}-tab-${tab}`}
          tabIndex={0}
        >
          {tab === 1 && activeSets.length > 0 ? (
            <div className="detail-loadout">
              {identity}
              <div
                className="equipped-set-summary"
                data-split={activeSets.length === 2}
              >
                <div className="equipped-set-icons" aria-hidden="true">
                  {activeSets.map(([name, pieces]) => {
                    const icon =
                      pieces.find((piece) => piece.slot === "Flower")?.icon ??
                      pieces.find((piece) => piece.icon)?.icon;
                    return <GameIcon key={name} src={icon} alt="" size={80} />;
                  })}
                </div>
                <div className="equipped-set-names">
                  {activeSets.map(([name]) => (
                    <strong key={name}>{name}</strong>
                  ))}
                </div>
              </div>
            </div>
          ) : tab !== 0 ? (
            identity
          ) : null}
          {tab === 0 && (
            <>
              <div className={compact ? undefined : "character-overview"}>
                {!compact && <CharacterAppearance character={character} />}
                <div className="panel">
                  {compact && weaponCard ? (
                    <div className="detail-loadout">
                      {identity}
                      {weaponCard}
                    </div>
                  ) : (
                    identity
                  )}
                  <CombatStats character={character} />
                </div>
              </div>
              {!compact &&
                (weaponCard ?? (
                  <section className="section-space panel">
                    <h2>Weapon</h2>
                    <p className="muted">
                      No weapon is recorded for this build.
                    </p>
                  </section>
                ))}
            </>
          )}
          {tab === 1 && (
            <>
              <h2>Artifacts</h2>
              {character.source === "showcase" &&
                character.artifacts.length === 0 && (
                  <p className="muted">
                    The public showcase returned no equipped artifacts for this
                    build. Reimport the UID after your in-game showcase
                    refreshes.
                  </p>
                )}
              {activeSets.length > 0 && (
                <div className="set-bonuses">
                  {activeSets.map(([name, pieces]) => (
                    <div key={name}>
                      {activeSets.length > 1 && <strong>{name}</strong>}
                      <p>
                        <span className="bonus-label">2-piece active</span>{" "}
                        {details?.sets[name]?.effect2Pc}
                      </p>
                      {pieces.length >= 4 && (
                        <p>
                          <span className="bonus-label">4-piece active</span>{" "}
                          {details?.sets[name]?.effect4Pc}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="artifact-grid">
                {slots.map((slot) => {
                  const artifact = character.artifacts.find(
                    (item) => item.slot === slot,
                  );
                  const name =
                    artifact &&
                    details?.sets[artifact.setName]?.[artifactPieceFields[slot]]
                      ?.name;
                  return (
                    <ArtifactSlot
                      key={slot}
                      slot={slot}
                      artifact={artifact}
                      name={name}
                    />
                  );
                })}
              </div>
            </>
          )}
          {(tab === 0 || tab === 1) && (
            <ArtifactVerdict character={character} team={team} />
          )}
          {tab === 2 && (
            <>
              <h2>Constellations</h2>
              <div className="detail-list">
                {Array.from({ length: 6 }, (_, index) => {
                  const entry = character.constellations[index];
                  const text = details?.constellations[index];
                  const unlocked = index < character.constellation;
                  return (
                    <details
                      className="gear-card"
                      key={index}
                      data-locked={!unlocked}
                    >
                      <summary>
                        <GameIcon src={entry?.icon} alt="" size={46} />
                        <span>
                          <strong>
                            C{index + 1} ·{" "}
                            {text?.name ?? entry?.name ?? "Constellation"}
                          </strong>
                          <small>{unlocked ? "Unlocked" : "Locked"}</small>
                        </span>
                      </summary>
                      <p className="description">
                        {text?.description ??
                          entry?.description ??
                          "Description unavailable."}
                      </p>
                    </details>
                  );
                })}
              </div>
            </>
          )}
          {tab === 3 && (
            <>
              <h2>Talents</h2>
              <div className="detail-list">
                {character.talents.map((talent, index) => {
                  const text = details?.talents[index];
                  return (
                    <details className="gear-card" key={talent.name}>
                      <summary>
                        <GameIcon src={talent.icon} alt="" size={46} />
                        <span>
                          <strong>{text?.name ?? talent.name}</strong>
                          <small>
                            {talent.name} · Lv. {talent.level}
                            {talent.bonus
                              ? ` + ${talent.bonus} boost = ${talent.level + talent.bonus}`
                              : ""}
                          </small>
                        </span>
                      </summary>
                      <p className="description">
                        {text?.description ??
                          talent.description ??
                          "Description unavailable."}
                      </p>
                    </details>
                  );
                })}
              </div>
              {!character.talents.length && (
                <p className="muted">
                  Talent metadata is unavailable for this character.
                </p>
              )}
              <section className="passive-talents">
                <h3>Passive talents</h3>
                {details?.passives.length ? (
                  <div className="detail-list">
                    {details.passives.map((passive) => (
                      <details className="gear-card" key={passive.name}>
                        <summary>
                          <ActionIcon name="star" />
                          <strong>{passive.name}</strong>
                        </summary>
                        <p className="description">
                          {passive.description ?? "Description unavailable."}
                        </p>
                      </details>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    {details
                      ? "Passive talent data is unavailable."
                      : "Loading passive talents…"}
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </>
  );
}
