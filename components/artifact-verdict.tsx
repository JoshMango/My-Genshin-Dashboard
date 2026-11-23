"use client";

import { useMemo } from "react";
import { normalizeGood, setOptions } from "@/lib/good";
import { slots, statLabels, type Character } from "@/lib/model";
import {
  artifactScore,
  artifactUpgrades,
  recommendBuild,
} from "@/lib/recommend/artifacts";
import { roles, type Team } from "@/lib/teams";
import { useDashboard } from "./dashboard-state";
import { GameIcon } from "./game-icon";
import { useCatalog } from "./use-catalog";

export function ArtifactVerdict({
  character,
  team,
}: {
  character: Character;
  team?: Team;
}) {
  const { draft, good } = useDashboard();
  const { catalog } = useCatalog();
  const lineup = team ?? draft;
  const profile = recommendBuild(character, lineup);
  const setIcons = useMemo(
    () =>
      new Map(
        catalog
          ? setOptions(catalog).map(({ name, icon }) => [name, icon])
          : [],
      ),
    [catalog],
  );
  const inventory = useMemo(
    () => (good && catalog ? normalizeGood(good, catalog).artifacts : []),
    [good, catalog],
  );
  const upgrades = artifactUpgrades(character, inventory, profile);
  return (
    <section className="section-space panel stack">
      <div>
        <h2>Artifact verdict</h2>
        <p className="muted">
          {profile.role === "trigger"
            ? "Reaction trigger"
            : roles[profile.role]}{" "}
          · {lineup.goal.archetype}
          {lineup.goal.archetype !== "Hypercarry" &&
            ` · ${lineup.goal.reaction}`}
        </p>
      </div>
      <div className="verdict-grid">
        <div className="gear-card">
          <h3>{profile.guideUrl ? "Recommended sets" : "Sets to consider"}</h3>
          <ul className="artifact-set-list">
            {profile.sets.map((name) => (
              <li key={name} className="item-heading">
                <GameIcon src={setIcons.get(name)} alt="" size={42} />
                <div>
                  <strong>{name}</strong>
                  {profile.setNotes?.[name] && (
                    <p className="muted">{profile.setNotes[name]}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="muted">
            {profile.guideUrl ? (
              <a href={profile.guideUrl} target="_blank" rel="noreferrer">
                KeqingMains character guide
              </a>
            ) : (
              <>
                Starting points from the dashboard build profile.{" "}
                <a
                  href="https://keqingmains.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Browse character guides
                </a>
                .
              </>
            )}
          </p>
        </div>
        <div className="gear-card">
          <h3>Main stats</h3>
          <dl className="stat-list">
            {slots.map((slot) => (
              <div className="recommend-stat" key={slot}>
                <dt>{slot}</dt>
                <dd>
                  {profile.main[slot]
                    .map((stat) => statLabels[stat])
                    .join(" / ")}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            <strong>Substats</strong> ·{" "}
            {profile.priority.map((key) => statLabels[key]).join(" › ")}
          </p>
          {profile.er.length === 0 && (
            <p className="muted">
              This build does not prioritize Energy Recharge.
            </p>
          )}
          <p className="muted">
            <strong>Starting targets</strong> ·{" "}
            {[
              profile.er.length ? `${profile.er.join("–")}% ER` : "",
              profile.priority.includes("eleMas")
                ? `${profile.em.join("–")} EM`
                : "",
              profile.priority.some(
                (key) => key === "critRate_" || key === "critDMG_",
              ) && profile.role !== "trigger"
                ? `${profile.crit.join("/")} CRIT Rate/DMG`
                : "",
            ]
              .filter(Boolean)
              .join(" · ") || "Depends on the build."}
          </p>
        </div>
      </div>
      {character.artifacts.length > 0 && (
        <div className="gear-card">
          <h3>Equipped pieces</h3>
          {character.artifacts.map((artifact) => {
            const score = artifactScore(artifact, profile);
            const main = profile.main[artifact.slot].includes(
              artifact.main.key,
            );
            return (
              <div className="verdict-row" key={artifact.id}>
                <GameIcon src={artifact.icon} alt="" size={35} />
                <span>
                  <strong>{artifact.name ?? artifact.slot}</strong>
                  <small className="muted">
                    {artifact.setName}
                    {!main &&
                      ` · Try ${statLabels[profile.main[artifact.slot][0]]} main stat`}
                  </small>
                </span>
                <span className="score-delta">{score}/100</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="gear-card">
        <h3>Inventory upgrades</h3>
        {upgrades.length ? (
          upgrades.map(({ artifact, delta }) => (
            <div className="verdict-row" key={artifact.id}>
              <GameIcon src={artifact.icon} alt="" size={35} />
              <span>
                <strong>
                  {artifact.name ?? artifact.slot} · {artifact.setName}
                </strong>
                <small className="muted">
                  {statLabels[artifact.main.key]} · +{artifact.level}
                </small>
              </span>
              <span className="score-delta">+{delta} pts</span>
            </div>
          ))
        ) : (
          <p className="muted">
            {good
              ? catalog
                ? "No imported pieces score higher for this build."
                : "Checking the imported inventory…"
              : "Import a GOOD inventory to find stronger pieces for this build."}
          </p>
        )}
      </div>
    </section>
  );
}
