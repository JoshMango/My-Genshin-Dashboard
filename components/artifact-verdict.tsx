"use client";

import { useMemo } from "react";
import { normalizeGood } from "@/lib/good";
import { slots, statLabels, type Character } from "@/lib/model";
import {
  artifactScore,
  artifactUpgrades,
  recommendBuild,
} from "@/lib/recommend/artifacts";
import { roles } from "@/lib/teams";
import { useDashboard } from "./dashboard-state";
import { GameIcon } from "./game-icon";
import { useCatalog } from "./use-catalog";

export function ArtifactVerdict({ character }: { character: Character }) {
  const { draft, good } = useDashboard();
  const { catalog } = useCatalog(!!good);
  const profile = recommendBuild(character, draft);
  const inventory = useMemo(
    () => (good && catalog ? normalizeGood(good, catalog).artifacts : []),
    [good, catalog],
  );
  const upgrades = artifactUpgrades(character, inventory, profile);
  return (
    <section className="section-space stack">
      <div>
        <h2>Artifact verdict</h2>
        <p className="muted">
          {profile.role === "trigger"
            ? "Reaction trigger"
            : roles[profile.role]}{" "}
          · {draft.goal.archetype}
          {draft.goal.archetype !== "Hypercarry" && ` · ${draft.goal.reaction}`}
        </p>
      </div>
      <div className="gear-card">
        <h3>Recommended sets</h3>
        <ul className="chip-list">
          {profile.sets.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <dl className="stat-list">
          {slots.map((slot) => (
            <div className="recommend-stat" key={slot}>
              <dt>{slot}</dt>
              <dd>
                {profile.main[slot].map((stat) => statLabels[stat]).join(" / ")}
              </dd>
            </div>
          ))}
        </dl>
        <p>
          <strong>Substats</strong> ·{" "}
          {profile.priority.map((key) => statLabels[key]).join(" › ")}
        </p>
        <p>
          <strong>Estimated targets</strong> · {profile.er.join("–")}% ER ·{" "}
          {profile.em.join("–")} EM · {profile.crit.join("/")} CRIT
        </p>
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
                  <strong>{artifact.slot}</strong>
                  <small className="muted">
                    {main
                      ? artifact.setName
                      : `Look for ${statLabels[profile.main[artifact.slot][0]]}`}
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
                  {artifact.slot} · {artifact.setName}
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
