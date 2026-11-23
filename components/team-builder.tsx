"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { saveJson } from "@/lib/browser-state";
import {
  catalogCharacters,
  characterGroup,
  previewCharacter,
} from "@/lib/builds";
import {
  archetypes,
  blankTeam,
  characterRoles,
  parseTeams,
  placeCharacter,
  reactions,
  roles,
  teamInfo,
  type Archetype,
  type Reaction,
  type Team,
} from "@/lib/teams";
import type { Character } from "@/lib/model";
import { useDashboard } from "./dashboard-state";
import { ElementBadge, GameIcon } from "./game-icon";
import { useCatalog } from "./use-catalog";
import { useOpenCharacter } from "./character-drawer";
import { TeamRecommendations } from "./team-recommendations";

export function TeamFeedback({ team }: { team: Team }) {
  const result = teamInfo(team.slots);
  return (
    <dl className="team-feedback">
      <div>
        <dt>Elemental resonance</dt>
        <dd>
          {result.resonance.join(", ") ||
            (team.slots.every(Boolean) ? "None" : "Requires a full team")}
        </dd>
      </div>
      <div>
        <dt>Possible reactions</dt>
        <dd>{result.reactions.join(", ") || "None yet"}</dd>
      </div>
      <div>
        <dt>Covered roles</dt>
        <dd>
          {result.covered.map((role) => roles[role]).join(", ") || "None yet"}
        </dd>
      </div>
      <div>
        <dt>Missing roles</dt>
        <dd>
          {result.missing.map((role) => roles[role]).join(", ") ||
            "All covered"}
        </dd>
      </div>
    </dl>
  );
}

export function TeamBuilder() {
  const openCharacter = useOpenCharacter();
  const { characters, draft, setDraft, saved, setSaved } = useDashboard();
  const { catalog, failure, retry } = useCatalog();
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const entries = useMemo(
    () => (catalog ? catalogCharacters(catalog) : []),
    [catalog],
  );
  const visible = search.trim().toLowerCase();
  const ownedIds = new Set(
    characters
      .filter((item) => item.source !== "preview")
      .map((item) => item.id),
  );
  const roster = characters.filter((item) =>
    item.name.toLowerCase().includes(visible),
  );
  const candidates = entries.filter(
    (item) =>
      !characters.some((entry) => entry.id === item.id) &&
      item.label.toLowerCase().includes(visible),
  );

  function choose(character: Character | null) {
    if (selected === null) return;
    setDraft(placeCharacter(draft, selected, character));
    setSelected(null);
    setSearch("");
  }

  function save() {
    if (!draft.name.trim() || !draft.slots.some(Boolean)) {
      setNotice("Name the team and add at least one character.");
      return;
    }
    const team = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      name: draft.name.trim(),
    };
    const next = [...saved.filter((entry) => entry.id !== team.id), team];
    if (next.length > 100 || !setSaved(next)) {
      setNotice(
        "The team could not be saved. Browser storage is unavailable or full.",
      );
      return;
    }
    setDraft(team);
    setNotice(`Saved ${team.name}.`);
  }

  function duplicate(team: Team) {
    const copy = {
      ...team,
      id: crypto.randomUUID(),
      name: `${team.name.slice(0, 53)} (copy)`,
    };
    setNotice(
      saved.length < 100 && setSaved([...saved, copy])
        ? `Saved ${copy.name}.`
        : "The copy could not be saved.",
    );
  }

  async function importTeams(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error();
      const imported = parseTeams(JSON.parse(await file.text()));
      if (!imported) throw new Error();
      const merged = new Map(saved.map((team) => [team.id, team]));
      for (const team of imported) {
        const id = merged.has(team.id) ? crypto.randomUUID() : team.id;
        merged.set(id, { ...team, id });
      }
      const teams = [...merged.values()];
      if (teams.length > 100 || !setSaved(teams)) {
        setNotice("Browser storage could not hold the imported teams.");
        return;
      }
      setNotice(`Imported ${imported.length} teams.`);
    } catch {
      setNotice("This file does not contain valid dashboard teams.");
    }
  }

  return (
    <>
      <h1>Team builder</h1>
      <section className="panel stack" aria-label="Current team">
        <div className="settings-grid">
          <label>
            Team name{" "}
            <input
              value={draft.name}
              maxLength={60}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Name your team"
            />
          </label>
          <label>
            Playstyle{" "}
            <select
              value={draft.goal.archetype}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  goal: {
                    ...draft.goal,
                    archetype: event.target.value as Archetype,
                  },
                })
              }
            >
              {archetypes.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          {draft.goal.archetype !== "Hypercarry" && (
            <label>
              Reaction{" "}
              <select
                value={draft.goal.reaction}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    goal: {
                      ...draft.goal,
                      reaction: event.target.value as Reaction,
                    },
                  })
                }
              >
                {Object.keys(reactions).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="team-composition">
          <div className="team-slots">
            {draft.slots.map((character, index) => (
              <div
                className="team-slot"
                key={index}
                data-element={character?.element}
              >
                <button
                  className="quiet slot-button"
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => {
                    setSelected(selected === index ? null : index);
                    setSearch("");
                  }}
                >
                  <GameIcon src={character?.icon} alt="" size={70} />
                  <strong>
                    {character?.name ?? `Choose slot ${index + 1}`}
                  </strong>
                  {character && (
                    <span className="muted">
                      {character.source === "preview"
                        ? "Not owned · Preview"
                        : `Lv. ${character.level} · C${character.constellation}`}
                    </span>
                  )}
                </button>
                {character && (
                  <div className="slot-actions">
                    <button
                      type="button"
                      className="quiet compact"
                      onClick={() => openCharacter(character, draft)}
                      aria-label={`Inspect ${character.name}`}
                    >
                      Details
                    </button>
                    <ElementBadge element={character.element} />
                    <button
                      className="quiet compact"
                      type="button"
                      aria-label={`Remove ${character.name}`}
                      onClick={() =>
                        setDraft(placeCharacter(draft, index, null))
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {selected !== null && (
            <section
              className="picker"
              aria-label={`Choose character for slot ${selected + 1}`}
            >
              <h2>Choose character for slot {selected + 1}</h2>
              <label className="field">
                Search characters{" "}
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              {roster.length > 0 && (
                <>
                  <h3>From your roster</h3>
                  <div className="picker-grid">
                    {roster.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className="quiet picker-card"
                        onClick={() => choose(entry)}
                      >
                        <GameIcon src={entry.icon} alt="" size={40} />
                        <span>
                          {entry.name}
                          <small>
                            {entry.source === "preview"
                              ? "Not owned · Manual preview"
                              : characterRoles(entry)
                                  .map((role) => roles[role])
                                  .join(", ") || entry.element}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {failure && (
                <p role="status">
                  {failure}{" "}
                  <button className="quiet" type="button" onClick={retry}>
                    Retry
                  </button>
                </p>
              )}
              {!catalog && !failure && (
                <p role="status">Loading character catalog…</p>
              )}
              {catalog && (
                <>
                  <h3>Catalog previews</h3>
                  <p className="muted">
                    Catalog characters outside your roster are treated as not
                    owned. Import GOOD data or add an owned manual build to
                    update ownership.
                  </p>
                  <div className="picker-grid picker-scroll">
                    {candidates.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className="quiet picker-card"
                        onClick={() =>
                          choose(previewCharacter(entry.id, catalog))
                        }
                      >
                        <GameIcon src={entry.icon} alt="" size={40} />
                        <span>
                          {entry.label}
                          <small>
                            {ownedIds.has(entry.id) ? "Owned" : "Not owned"} ·{" "}
                            {entry.element}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {!candidates.length && (
                    <p className="muted">No matching catalog characters.</p>
                  )}
                </>
              )}
            </section>
          )}
          <TeamFeedback team={draft} />
        </div>
        <TeamRecommendations
          team={draft}
          catalog={catalog}
          entries={entries}
          roster={characters}
          update={setDraft}
        />
        <div className="input-row">
          <button type="button" onClick={save}>
            Save team
          </button>
          <button
            type="button"
            className="quiet"
            onClick={() => {
              setDraft(blankTeam);
              setSelected(null);
              setNotice("");
            }}
          >
            New team
          </button>
        </div>
        <p role="status">{notice}</p>
      </section>
      <section className="section-space">
        <div className="section-heading">
          <h2>Saved teams</h2>
          {saved.length > 0 && (
            <button
              className="quiet"
              type="button"
              onClick={() => saveJson("genshin-teams.json", saved)}
            >
              Export teams
            </button>
          )}
        </div>
        <label className="file-upload">
          Import teams{" "}
          <input
            type="file"
            accept=".json,application/json"
            onChange={importTeams}
          />
        </label>
        {!saved.length && (
          <p className="muted">Saved teams will appear here.</p>
        )}
        <div className="saved-grid section-space">
          {saved.map((team) => (
            <article className="panel stack" key={team.id}>
              <h3>{team.name}</h3>
              <div className="input-row">
                {team.slots.flatMap((character) =>
                  character ? (
                    <button
                      key={characterGroup(character.id)}
                      type="button"
                      className="quiet"
                      aria-label={`Inspect ${character.name}`}
                      onClick={() => openCharacter(character, team)}
                    >
                      <GameIcon src={character.icon} alt="" size={40} />
                    </button>
                  ) : (
                    []
                  ),
                )}
              </div>
              <p className="muted">
                {team.goal.archetype}
                {team.goal.archetype !== "Hypercarry" &&
                  ` · ${team.goal.reaction}`}
              </p>
              <div className="input-row">
                <button
                  type="button"
                  className="quiet"
                  onClick={() => {
                    setDraft(team);
                    setSelected(null);
                    setNotice(`Loaded ${team.name}.`);
                  }}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="quiet"
                  onClick={() => duplicate(team)}
                >
                  Duplicate
                </button>
                <Link href={`/compare?team=${encodeURIComponent(team.id)}`}>
                  Open in Compare
                </Link>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={compare.includes(team.id)}
                  disabled={compare.length >= 3 && !compare.includes(team.id)}
                  onChange={(event) =>
                    setCompare(
                      event.target.checked
                        ? [...compare, team.id]
                        : compare.filter((id) => id !== team.id),
                    )
                  }
                />{" "}
                Compare {team.name}
              </label>
            </article>
          ))}
        </div>
        {compare.length >= 2 && (
          <section className="section-space">
            <h2>Team comparison</h2>
            <div className="saved-grid">
              {saved
                .filter((team) => compare.includes(team.id))
                .map((team) => (
                  <article key={team.id} className="panel">
                    <h3>{team.name}</h3>
                    <TeamFeedback team={team} />
                  </article>
                ))}
            </div>
          </section>
        )}
      </section>
      <p className="muted section-space">
        <Link href="/">
          Import a showcase, upload GOOD JSON, or create a manual build
        </Link>{" "}
        to add characters to your roster.
      </p>
    </>
  );
}
