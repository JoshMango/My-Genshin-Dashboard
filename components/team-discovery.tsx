"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { catalogCharacters, previewCharacter } from "@/lib/builds";
import type { Character } from "@/lib/model";
import type {
  DiscoveryRequest,
  DiscoveryResponse,
} from "@/lib/recommend/discovery";
import {
  archetypes,
  defaultGoal,
  reactions,
  roles,
  type Archetype,
  type Goal,
  type Reaction,
  type Team,
} from "@/lib/teams";
import { useOpenCharacter } from "./character-drawer";
import { useDashboard } from "./dashboard-state";
import { GameIcon } from "./game-icon";
import { useCatalog } from "./use-catalog";

type Results = DiscoveryResponse & {
  goal: Goal;
  builds: Map<string, Character>;
};

export function TeamDiscovery() {
  const { characters, setDraft, saved, setSaved } = useDashboard();
  const [goal, setGoal] = useState(defaultGoal);
  const [allow, setAllow] = useState(false);
  const { catalog, failure, retry } = useCatalog(allow);
  const [mustInclude, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [limit, setLimit] = useState(10);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<Results>();
  const worker = useRef<Worker | null>(null);
  const router = useRouter();
  const open = useOpenCharacter();

  useEffect(() => () => worker.current?.terminate(), []);
  const owned = characters.filter(
    (character) => character.source !== "preview",
  );
  const definitions = useMemo(
    () => (catalog ? catalogCharacters(catalog) : []),
    [catalog],
  );
  const options = [
    ...new Map(
      [
        ...(allow
          ? definitions.map(({ id, label }) => ({
              id,
              label: `${label} · Not owned`,
            }))
          : []),
        ...characters
          .filter((character) => allow || character.source !== "preview")
          .map((character) => ({
            id: character.id,
            label:
              character.source === "preview"
                ? `${character.name} · Not owned`
                : character.name,
          })),
      ].map((entry) => [entry.id, entry]),
    ).values(),
  ];

  function stop() {
    worker.current?.terminate();
    worker.current = null;
    setRunning(false);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    stop();
    setResult(undefined);
    setNotice("");
    const known = new Map(
      characters.map((character) => [character.id, character]),
    );
    const previews =
      allow && catalog
        ? definitions.flatMap(({ id }) =>
            known.get(id)?.source === "preview"
              ? [known.get(id)!]
              : known.has(id)
                ? []
                : [previewCharacter(id, catalog)],
          )
        : [];
    const request: DiscoveryRequest = {
      owned,
      previews,
      goal,
      mustInclude,
      exclude,
      allowUnowned: allow,
      limit,
    };
    try {
      const job = new Worker(
        new URL("../lib/recommend/discovery-worker.ts", import.meta.url),
      );
      worker.current = job;
      setRunning(true);
      const builds = new Map(
        [...owned, ...previews].map((character) => [character.id, character]),
      );
      job.onmessage = ({
        data,
      }: MessageEvent<DiscoveryResponse | { error: string }>) => {
        if (worker.current !== job) return;
        stop();
        if ("error" in data) setNotice(data.error);
        else setResult({ ...data, goal, builds });
      };
      job.onerror = () => {
        if (worker.current !== job) return;
        stop();
        setNotice("This browser could not run the team search.");
      };
      job.postMessage(request);
    } catch {
      stop();
      setNotice("This browser could not start the team search.");
    }
  }

  function send(team: Team, path: string) {
    setDraft(team);
    router.push(path);
  }

  function save(team: Team) {
    if (
      saved.length >= 100 ||
      !setSaved([...saved, { ...team, id: crypto.randomUUID() }])
    ) {
      setNotice(
        "The team could not be saved. Browser storage is unavailable or full.",
      );
      return;
    }
    setNotice(`Saved ${team.name}.`);
  }

  return (
    <>
      <h1>Discover teams</h1>
      <section className="panel stack">
        <p className="muted">
          Search your full roster using the builds you imported. Scores estimate
          team fit and investment.
        </p>
        <form className="stack" onSubmit={search}>
          <div className="settings-grid">
            <label>
              Playstyle
              <select
                value={goal.archetype}
                onChange={(event) =>
                  setGoal({
                    ...goal,
                    archetype: event.target.value as Archetype,
                  })
                }
              >
                {archetypes.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            {goal.archetype !== "Hypercarry" && (
              <label>
                Reaction
                <select
                  value={goal.reaction}
                  onChange={(event) =>
                    setGoal({
                      ...goal,
                      reaction: event.target.value as Reaction,
                    })
                  }
                >
                  {Object.keys(reactions).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Ownership
              <select
                value={allow ? "allow" : "owned"}
                onChange={(event) => {
                  setAllow(event.target.value === "allow");
                  setInclude("");
                  setExclude("");
                }}
              >
                <option value="owned">Owned only</option>
                <option value="allow">Allow 1 unowned character</option>
              </select>
            </label>
            <label>
              Must include
              <select
                value={mustInclude}
                onChange={(event) => setInclude(event.target.value)}
              >
                <option value="">Any character</option>
                {options.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Exclude
              <select
                value={exclude}
                onChange={(event) => setExclude(event.target.value)}
              >
                <option value="">No exclusion</option>
                {options.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Results
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </select>
            </label>
          </div>
          {!owned.length && (
            <p className="muted">
              Import characters or add owned manual builds in Roster.
            </p>
          )}
          {allow && !catalog && (
            <p role="status">
              {failure || "Loading catalog candidates…"}{" "}
              {failure && (
                <button type="button" className="quiet" onClick={retry}>
                  Retry
                </button>
              )}
            </p>
          )}
          <div className="input-row">
            <button
              type="submit"
              disabled={
                running || owned.length < (allow ? 3 : 4) || (allow && !catalog)
              }
            >
              Find teams
            </button>
            {running && (
              <button
                className="quiet"
                type="button"
                onClick={() => {
                  stop();
                  setNotice("Search canceled.");
                }}
              >
                Cancel search
              </button>
            )}
          </div>
        </form>
        <p role="status">{running ? "Searching team combinations…" : notice}</p>
      </section>
      {result && (
        <section className="section-space stack">
          <h2>Discovery results</h2>
          <p className="muted">
            {result.evaluated.toLocaleString()} valid combinations scored.
            Surprising picks fall outside the dashboard’s list of common team
            cores.
          </p>
          {!result.results.length && (
            <p className="panel">No eligible team matched these filters.</p>
          )}
          {result.results.map((entry) => {
            const members = entry.ids.map((id) => result.builds.get(id)!);
            const team: Team = {
              id: "",
              name: members
                .map(({ name }) => name)
                .join(" / ")
                .slice(0, 60),
              slots: members,
              goal: result.goal,
            };
            return (
              <article
                className="panel stack discovery-result"
                key={entry.ids.join("-")}
              >
                <div className="section-heading">
                  <strong>{entry.score}/100 estimated team fit</strong>
                  {entry.surprising && (
                    <span className="bonus-label">Surprising pick</span>
                  )}
                </div>
                <div className="discovery-lineup">
                  {members.map((character) => (
                    <button
                      type="button"
                      className="quiet picker-card"
                      key={character.id}
                      onClick={() => open(character, team)}
                    >
                      <GameIcon src={character.icon} size={48} alt="" />
                      <span>
                        {character.name}
                        {entry.unowned === character.id && (
                          <small>Not owned</small>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <p>{entry.reason}</p>
                <dl className="team-feedback">
                  {Object.entries(entry.breakdown).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key[0].toUpperCase() + key.slice(1)}</dt>
                      <dd>{key === "overlap" && value ? -value : value} pts</dd>
                    </div>
                  ))}
                </dl>
                <p className="muted">
                  Missing roles ·{" "}
                  {entry.missing.map((role) => roles[role]).join(", ") ||
                    "All covered"}
                </p>
                <div className="input-row">
                  <button
                    type="button"
                    onClick={() => send(team, "/teams?tab=builder")}
                  >
                    Open in Builder
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => save(team)}
                  >
                    Save team
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => send(team, "/compare?simulate=1")}
                  >
                    Simulate
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
