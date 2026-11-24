"use client";

import Link from "next/link";
import { useEffect, useState, type KeyboardEvent } from "react";
import { loadDescriptions } from "@/lib/enka/descriptions";
import {
  formatStat,
  slots,
  statLabels,
  type Character,
  type StatKey,
} from "@/lib/model";
import { ArtifactSlot } from "./artifact-slot";
import { ArtifactVerdict } from "./artifact-verdict";
import { useDashboard } from "./dashboard-state";
import { ElementBadge, GameIcon } from "./game-icon";

const tabs = [
  "Details / Stats",
  "Artifacts",
  "Constellations",
  "Talents",
] as const;
const summaryStats: StatKey[] = [
  "hp",
  "atk",
  "def",
  "eleMas",
  "critRate_",
  "critDMG_",
  "enerRech_",
];
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

function CharacterDetails({ character }: { character: Character }) {
  const [tab, setTab] = useState(0);
  const [details, setDetails] = useState<Descriptions>();
  useEffect(() => {
    let cancelled = false;
    void loadDescriptions(character).then((value) => {
      if (!cancelled) setDetails(value);
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
      document.getElementById(`character-tab-${index}`)?.focus();
    }
  }

  const sets = Object.entries(
    character.artifacts.reduce<Record<string, number>>((counts, item) => {
      if (item.setId || item.setName !== "Unknown set")
        counts[item.setName] = (counts[item.setName] ?? 0) + 1;
      return counts;
    }, {}),
  ).filter(([, count]) => count >= 2);
  const elementStat = character.element
    ? (`${character.element.toLowerCase()}_dmg_` as StatKey)
    : undefined;
  const displayStats = [
    ...summaryStats,
    ...(elementStat ? [elementStat] : []),
    ...(Object.keys(character.stats).filter(
      (key) =>
        !summaryStats.includes(key as StatKey) &&
        key !== elementStat &&
        key.endsWith("dmg_"),
    ) as StatKey[]),
  ];

  return (
    <>
      <Link className="back-link" href="/">
        Character roster
      </Link>
      <section
        className="character-detail section-space"
        data-element={character.element}
      >
        <aside className="detail-art panel">
          <div
            role="tablist"
            aria-label="Character details"
            className="detail-tabs"
          >
            {tabs.map((label, index) => (
              <button
                type="button"
                role="tab"
                id={`character-tab-${index}`}
                key={label}
                aria-selected={tab === index}
                tabIndex={tab === index ? 0 : -1}
                aria-controls="character-panel"
                className={tab === index ? "" : "quiet"}
                onClick={() => setTab(index)}
                onKeyDown={navigate}
              >
                {label}
              </button>
            ))}
          </div>
          <GameIcon
            src={character.art ?? character.icon}
            alt={character.name}
            size={480}
            eager
          />
        </aside>
        <div
          className="panel detail-panel"
          role="tabpanel"
          id="character-panel"
          aria-labelledby={`character-tab-${tab}`}
          tabIndex={0}
        >
          <ElementBadge element={character.element} />
          <h1>{character.name}</h1>
          <p className="muted">
            Lv. {character.level} · Ascension {character.ascension} · C
            {character.constellation}
          </p>
          {tab === 0 && (
            <>
              <h2>Combat stats</h2>
              <dl className="combat-stats">
                {displayStats.map((key) => {
                  const value = character.stats[key];
                  const base = character.base[key];
                  return (
                    <div key={key}>
                      <dt>
                        <span aria-hidden="true">◇</span> {statLabels[key]}
                      </dt>
                      <dd>
                        {value === undefined
                          ? "Unavailable"
                          : formatStat({ key, value })}
                        {base !== undefined && value !== undefined && (
                          <small className="muted">
                            Base {formatStat({ key, value: base })} · Bonus{" "}
                            {formatStat({ key, value: value - base })}
                          </small>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <section className="section-space">
                <h2>Weapon</h2>
                {character.weapon ? (
                  <article className="gear-card">
                    <div className="item-heading">
                      <GameIcon src={character.weapon.icon} alt="" size={64} />
                      <div>
                        <h3>{character.weapon.name}</h3>
                        <p className="muted">
                          {character.weapon.rarity}★ · Lv.{" "}
                          {character.weapon.level} · R
                          {character.weapon.refinement}
                        </p>
                      </div>
                    </div>
                    <ul className="stat-list">
                      {character.weapon.stats.map((stat) => (
                        <li key={stat.key}>
                          <span>{statLabels[stat.key]}</span>
                          <strong>{formatStat(stat)}</strong>
                        </li>
                      ))}
                    </ul>
                    {details?.weaponName && (
                      <p>
                        <strong>{details.weaponName}</strong>
                      </p>
                    )}
                    {details?.weaponText && (
                      <p className="description">{details.weaponText}</p>
                    )}
                  </article>
                ) : (
                  <p className="muted">No weapon is recorded for this build.</p>
                )}
              </section>
            </>
          )}
          {tab === 1 && (
            <>
              <h2>Artifacts</h2>
              {!!sets.length && (
                <div className="set-bonuses">
                  {sets.map(([name, count]) => (
                    <div key={name}>
                      <strong>{name}</strong>
                      <p>
                        <span className="bonus-label">2-piece active</span>{" "}
                        {details?.sets[name]?.effect2Pc}
                      </p>
                      {count >= 4 && (
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
                {slots.map((slot) => (
                  <ArtifactSlot
                    key={slot}
                    slot={slot}
                    artifact={character.artifacts.find(
                      (item) => item.slot === slot,
                    )}
                  />
                ))}
              </div>
            </>
          )}
          {(tab === 0 || tab === 1) && (
            <ArtifactVerdict character={character} />
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
            </>
          )}
        </div>
      </section>
    </>
  );
}
