"use client";

import { useMemo, useState } from "react";
import type { Catalog } from "@/lib/enka/catalog";
import { previewCharacter } from "@/lib/builds";
import type { Character } from "@/lib/model";
import {
  effectiveness,
  suggest,
  type Candidate,
  type Suggestion,
} from "@/lib/recommend/team";
import { placeCharacter, type Team } from "@/lib/teams";
import { useOpenCharacter } from "./character-drawer";
import { GameIcon } from "./game-icon";

export function TeamRecommendations({
  team,
  catalog,
  entries,
  roster,
  update,
}: {
  team: Team;
  catalog?: Catalog;
  entries: Candidate[];
  roster: Character[];
  update: (team: Team) => void;
}) {
  const openCharacter = useOpenCharacter();
  const [requestedSlot, setSlot] = useState<number>();
  const open = team.slots.flatMap((entry, index) => (entry ? [] : [index]));
  const slot =
    requestedSlot !== undefined && open.includes(requestedSlot)
      ? requestedSlot
      : open[0];
  const owned = useMemo(
    () => roster.filter((character) => character.source !== "preview"),
    [roster],
  );
  const options = useMemo(() => {
    const ids = new Set(owned.map((character) => character.id));
    return entries.filter((entry) => !ids.has(entry.id));
  }, [entries, owned]);
  if (slot === undefined || !team.slots.some(Boolean)) return null;

  const preview = (candidate: Candidate) => {
    const build =
      roster.find((entry) => entry.id === candidate.id) ??
      (catalog && previewCharacter(candidate.id, catalog));
    return build && { build, lineup: placeCharacter(team, slot, build) };
  };
  const add = (candidate: Candidate) => {
    const result = preview(candidate);
    if (result) update(result.lineup);
  };
  const inspect = (candidate: Candidate) => {
    const result = preview(candidate);
    if (result) openCharacter(result.build, result.lineup);
  };
  const seen = new Set<string>();
  const previews = suggest(team, slot, options).filter(({ candidate }) => {
    const key = `${candidate.name}:${candidate.element ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <section className="recommendations stack">
      <div className="section-heading">
        <h2>Slot recommendations</h2>
        <span className="muted">
          Estimated effectiveness · {effectiveness(team)}/100
        </span>
      </div>
      <label className="field narrow-field">
        Open slot{" "}
        <select
          value={slot}
          onChange={(event) => setSlot(Number(event.target.value))}
        >
          {open.map((index) => (
            <option key={index} value={index}>
              Slot {index + 1}
            </option>
          ))}
        </select>
      </label>
      <div className="recommend-grid">
        <Results
          title="From your roster"
          suggestions={suggest(team, slot, owned).slice(0, 4)}
          choose={add}
          inspect={inspect}
        />
        <Results
          title="Worth pulling / not owned"
          suggestions={previews.slice(0, 4)}
          choose={add}
          inspect={inspect}
        />
      </div>
      <p className="muted">
        Effectiveness scores role coverage and reaction fit. Ownership comes
        from the builds you add.
      </p>
    </section>
  );
}

function Results({
  title,
  suggestions,
  choose,
  inspect,
}: {
  title: string;
  suggestions: Suggestion[];
  choose: (candidate: Candidate) => void;
  inspect: (candidate: Candidate) => void;
}) {
  return (
    <div className="stack">
      <h3>{title}</h3>
      {!suggestions.length && <p className="muted">No available candidates.</p>}
      {suggestions.map(({ candidate, delta, reason }) => (
        <article className="recommend-card" key={candidate.id}>
          <button
            className="quiet compact"
            type="button"
            aria-label={`Inspect ${candidate.name}`}
            onClick={() => inspect(candidate)}
          >
            <GameIcon src={candidate.icon} alt="" size={45} />
          </button>
          <div>
            <strong>{candidate.name}</strong>
            <span className="score-delta">
              {" "}
              {delta >= 0 ? "+" : ""}
              {delta} pts
            </span>
            <p>{reason}</p>
          </div>
          <button
            className="quiet compact"
            type="button"
            aria-label={`Add ${candidate.name} to selected slot`}
            onClick={() => choose(candidate)}
          >
            Add
          </button>
        </article>
      ))}
    </div>
  );
}
