"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  catalogCharacters,
  catalogWeapon,
  previewCharacter,
} from "@/lib/builds";
import type { Catalog } from "@/lib/enka/catalog";
import { makeArtifact, setOptions } from "@/lib/good";
import { slots, statLabels, type Character, type StatKey } from "@/lib/model";
import {
  templates,
  type Rotation,
  type SimulationResult,
} from "@/lib/sim/estimate";
import { swapGear } from "@/lib/sim/gear";
import { placeCharacter, type Archetype, type Team } from "@/lib/teams";
import { useDashboard } from "./dashboard-state";
import { GameIcon } from "./game-icon";
import { useCatalog } from "./use-catalog";
import { useSimulation } from "./use-simulation";

const number = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const fields: {
  key: keyof Rotation;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "seconds", label: "Rotation length (s)", min: 1, max: 180 },
  { key: "enemyLevel", label: "Enemy level", min: 1, max: 200 },
  { key: "resistance", label: "Enemy resistance (%)", min: -100, max: 200 },
  { key: "uptime", label: "Damage uptime (%)", min: 0, max: 100 },
  { key: "buff", label: "Team DMG buff (%)", min: 0, max: 400 },
  { key: "normalHits", label: "Normal hit count", min: 0, max: 100 },
  { key: "skillHits", label: "Skill hit count", min: 0, max: 100 },
  { key: "burstHits", label: "Burst hit count", min: 0, max: 100 },
  { key: "reactionHits", label: "Reaction events", min: 0, max: 100 },
];

export function CompareScreen() {
  const { draft, saved, characters } = useDashboard();
  const { catalog } = useCatalog();
  const [baselineId, setBaseline] = useState("");
  const base = saved.find((team) => team.id === baselineId) ?? draft;
  const [edited, setEdited] = useState<Team>();
  const variant = edited ?? base;
  const [rotation, setRotation] = useState<Rotation>();
  const effectiveRotation = rotation ?? templates[base.goal.archetype];
  const [picks, setPicks] = useState<string[]>([]);
  const compared = useMemo(
    () => saved.filter((team) => picks.includes(team.id)),
    [saved, picks],
  );
  const requests = useMemo(
    () =>
      [base, variant, ...compared].map((team) => ({
        team,
        rotation: effectiveRotation,
      })),
    [base, variant, compared, effectiveRotation],
  );
  const estimate = useSimulation(requests);
  const results = estimate?.results;
  const options = useMemo(
    () => (catalog ? catalogCharacters(catalog) : []),
    [catalog],
  );
  const [gearSlot, setGearSlot] = useState(0);
  const activeCharacter = variant.slots[gearSlot];

  function replace(index: number, id: string) {
    if (!id) {
      setEdited(placeCharacter(variant, index, null));
      return;
    }
    const character =
      characters.find((item) => item.id === id) ??
      variant.slots.find((item) => item?.id === id) ??
      (catalog && previewCharacter(id, catalog));
    if (character) setEdited(placeCharacter(variant, index, character));
  }

  return (
    <>
      <h1>Compare builds</h1>
      <div className="panel stack">
        <div className="section-heading">
          <h2>What if?</h2>
          <Link href="/teams">Open team builder</Link>
        </div>
        <label className="field narrow-field">
          Baseline team{" "}
          <select
            value={baselineId}
            onChange={(event) => {
              setBaseline(event.target.value);
              setEdited(undefined);
              setRotation(undefined);
            }}
          >
            <option value="">Current team</option>
            {saved.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        {!base.slots.some(Boolean) && (
          <p className="muted">
            Select a saved team or add characters to the baseline in Team
            Builder.
          </p>
        )}
        <h3>Variant lineup</h3>
        <div className="settings-grid">
          {variant.slots.map((character, index) => (
            <label key={index}>
              Slot {index + 1}{" "}
              <select
                value={character?.id ?? ""}
                onChange={(event) => replace(index, event.target.value)}
              >
                <option value="">Empty</option>
                {character &&
                  !characters.some((entry) => entry.id === character.id) && (
                    <option value={character.id}>
                      {character.name} · Current build
                    </option>
                  )}
                {characters.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {entry.source === "preview" ? " · Not owned" : ""}
                  </option>
                ))}
                {options
                  .filter(
                    (entry) =>
                      entry.id !== character?.id &&
                      !characters.some((item) => item.id === entry.id),
                  )
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label} · Not owned
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        {edited && (
          <button
            type="button"
            className="quiet"
            onClick={() => setEdited(undefined)}
          >
            Reset variant
          </button>
        )}
        {variant.slots.some(Boolean) && (
          <details className="gear-card">
            <summary>
              <strong>Edit variant weapon or artifacts</strong>
            </summary>
            <label className="field narrow-field">
              Character slot{" "}
              <select
                value={gearSlot}
                onChange={(event) => setGearSlot(Number(event.target.value))}
              >
                {variant.slots.map((entry, index) => (
                  <option key={index} value={index}>
                    {entry?.name ?? `Slot ${index + 1} (empty)`}
                  </option>
                ))}
              </select>
            </label>
            {catalog && activeCharacter && (
              <GearEditor
                key={`${gearSlot}:${activeCharacter.id}`}
                catalog={catalog}
                character={activeCharacter}
                update={(character) =>
                  setEdited(placeCharacter(variant, gearSlot, character))
                }
              />
            )}
            {!catalog && (
              <p className="muted">
                Game catalog is needed for equipment editing.
              </p>
            )}
          </details>
        )}
      </div>
      <section className="panel section-space stack">
        <h2>Rotation assumptions</h2>
        <label className="field narrow-field">
          Load template{" "}
          <select
            value=""
            onChange={(event) => {
              if (event.target.value)
                setRotation(templates[event.target.value as Archetype]);
            }}
          >
            <option value="">Choose a rotation template</option>
            {Object.keys(templates).map((key) => (
              <option key={key}>{key}</option>
            ))}
          </select>
        </label>
        <div className="settings-grid">
          {fields.map(({ key, label, min, max }) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={min}
                max={max}
                value={effectiveRotation[key]}
                onChange={(event) => {
                  if (
                    event.target.value !== "" &&
                    Number.isFinite(event.target.valueAsNumber)
                  ) {
                    setRotation({
                      ...effectiveRotation,
                      [key]: Math.min(
                        max,
                        Math.max(min, event.target.valueAsNumber),
                      ),
                    });
                  }
                }}
              />
            </label>
          ))}
        </div>
        <p className="muted">
          Both lineups use one enemy, average critical hits, a shared resistance
          value, and generic talent and hit templates. The estimator assigns the
          selected reaction to one eligible trigger and uses the manual buff
          value for team effects.
        </p>
      </section>
      <section
        className="section-space stack"
        aria-labelledby="estimated-heading"
      >
        <h2 id="estimated-heading">Estimated damage</h2>
        {estimate?.error && <p role="alert">{estimate.error}</p>}
        {!estimate && <p role="status">Calculating estimates…</p>}
        {results && (
          <>
            <DpsChart
              rows={[
                { name: "Baseline", value: results[0].dps },
                { name: "Variant", value: results[1].dps },
              ]}
            />
            <p className="muted">
              Variant DPS change{" "}
              <strong>
                {results[1].dps >= results[0].dps ? "+" : ""}
                {number.format(results[1].dps - results[0].dps)}
              </strong>
            </p>
            <div className="compare-grid">
              <DamagePanel name="Baseline" result={results[0]} />
              <DamagePanel name="Variant" result={results[1]} />
            </div>
          </>
        )}
      </section>
      {saved.length >= 2 && (
        <section className="panel section-space stack">
          <h2>Compare saved teams</h2>
          <p className="muted">Select two or three teams.</p>
          <div className="input-row">
            {saved.map((team) => (
              <label className="checkbox-label" key={team.id}>
                <input
                  type="checkbox"
                  checked={picks.includes(team.id)}
                  disabled={picks.length >= 3 && !picks.includes(team.id)}
                  onChange={(event) =>
                    setPicks(
                      event.target.checked
                        ? [...picks, team.id]
                        : picks.filter((id) => team.id !== id),
                    )
                  }
                />
                {team.name}
              </label>
            ))}
          </div>
          {results && compared.length >= 2 && (
            <>
              <DpsChart
                rows={compared.map((team, index) => ({
                  name: team.name,
                  value: results[index + 2].dps,
                }))}
              />
              <div className="compare-grid">
                {compared.map((team, index) => (
                  <DamagePanel
                    name={team.name}
                    result={results[index + 2]}
                    key={team.id}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

function DpsChart({ rows }: { rows: { name: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <figure className="panel dps-chart">
      <figcaption>Estimated team DPS</figcaption>
      {rows.map(({ name, value }, index) => (
        <div key={index} className="chart-row">
          <span>{name}</span>
          <progress
            max={max}
            value={value}
            aria-label={`${name} estimated team DPS`}
          />
          <strong>{number.format(value)}</strong>
        </div>
      ))}
    </figure>
  );
}

function DamagePanel({
  name,
  result,
}: {
  name: string;
  result: SimulationResult;
}) {
  return (
    <article className="panel stack">
      <h3>{name}</h3>
      <p>
        <strong>{number.format(result.dps)} estimated DPS</strong> ·{" "}
        {result.effectiveness}/100 effectiveness
      </p>
      {result.trigger && (
        <p className="muted">Assumed reaction trigger · {result.trigger}</p>
      )}
      {result.characters.map((character) => (
        <div className="damage-share" key={character.id}>
          <div className="section-heading">
            <strong>{character.name}</strong>
            <span>{character.share.toFixed(1)}%</span>
          </div>
          <progress
            max={100}
            value={character.share}
            aria-label={`${character.name} damage share`}
          />
          <p className="muted">
            Normal {number.format(character.normal)} · Skill{" "}
            {number.format(character.skill)} · Burst{" "}
            {number.format(character.burst)}
            {character.reaction > 0 &&
              ` · Reaction ${number.format(character.reaction)}`}
          </p>
        </div>
      ))}
      {!result.characters.length && (
        <p className="muted">No characters in this lineup.</p>
      )}
    </article>
  );
}

function GearEditor({
  catalog,
  character,
  update,
}: {
  catalog: Catalog;
  character: Character;
  update: (character: Character) => void;
}) {
  const [slot, setSlot] = useState<(typeof slots)[number]>("Flower");
  const piece = character.artifacts.find((entry) => entry.slot === slot);
  const validWeapons = Object.entries(catalog.weapons)
    .flatMap(([id, item]) => {
      const name = catalog.loc[String(item.NameTextMapHash)];
      return name && item.WeaponType === character.weaponType
        ? [{ id, name }]
        : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const sets = setOptions(catalog);
  const defaultMainStat =
    slot === "Flower" ? "hp" : slot === "Plume" ? "atk" : "atk_";

  function weaponEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = String(data.get("weapon"));
    const next =
      id && validWeapons.some((entry) => entry.id === id)
        ? catalogWeapon(
            id,
            Number(data.get("level")),
            Number(data.get("ascension")),
            Number(data.get("refinement")),
            catalog,
          )
        : undefined;
    update(swapGear(character, next, character.artifacts));
  }

  function artifactEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const setId = String(data.get("set"));
    const main = data.get("main") as StatKey;
    const updatedKey = data.get("substat") as StatKey;
    const updatedValue = Number(data.get("value"));
    const substats =
      piece?.substats.filter(
        (stat) => stat.key !== updatedKey && stat.key !== main,
      ) ?? [];
    if (updatedValue > 0 && updatedKey !== main)
      substats.unshift({ key: updatedKey, value: updatedValue });
    const artifact = makeArtifact(catalog, {
      id: piece?.id ?? `variant-${slot}`,
      slot,
      setId: setId || undefined,
      rarity: piece?.rarity || 5,
      level: Number(data.get("artifactLevel")),
      main,
      substats: substats.slice(0, 4),
    });
    update(
      swapGear(character, character.weapon, [
        ...character.artifacts.filter((entry) => entry.slot !== slot),
        artifact,
      ]),
    );
  }

  return (
    <div className="stack">
      <form
        className="stack"
        onSubmit={weaponEdit}
        key={character.weapon?.id ?? "empty"}
      >
        <div className="settings-grid">
          <label>
            Variant weapon{" "}
            <select name="weapon" defaultValue={character.weapon?.id ?? ""}>
              <option value="">No weapon</option>
              {validWeapons.map((weapon) => (
                <option key={weapon.id} value={weapon.id}>
                  {weapon.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Weapon level{" "}
            <input
              name="level"
              type="number"
              min={1}
              max={100}
              defaultValue={character.weapon?.level ?? 90}
              required
            />
          </label>
          <label>
            Weapon ascension{" "}
            <input
              name="ascension"
              type="number"
              min={0}
              max={6}
              defaultValue={character.weapon?.ascension ?? 6}
              required
            />
          </label>
          <label>
            Refinement{" "}
            <input
              name="refinement"
              type="number"
              min={1}
              max={5}
              defaultValue={character.weapon?.refinement ?? 1}
              required
            />
          </label>
        </div>
        <button type="submit" className="quiet">
          Apply weapon
        </button>
      </form>
      <label className="field narrow-field">
        Artifact slot{" "}
        <select
          value={slot}
          onChange={(event) => setSlot(event.target.value as typeof slot)}
        >
          {slots.map((entry) => (
            <option key={entry}>{entry}</option>
          ))}
        </select>
      </label>
      <form key={slot} className="stack" onSubmit={artifactEdit}>
        <div className="settings-grid">
          <label>
            Set{" "}
            <select name="set" defaultValue={piece?.setId ?? ""}>
              <option value="">Unspecified</option>
              {sets.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Main stat{" "}
            <select
              name="main"
              defaultValue={piece?.main.key ?? defaultMainStat}
            >
              {(Object.keys(statLabels) as StatKey[])
                .filter((key) =>
                  slot === "Flower"
                    ? key === "hp"
                    : slot === "Plume"
                      ? key === "atk"
                      : key.endsWith("_") || key === "eleMas",
                )
                .map((key) => (
                  <option key={key} value={key}>
                    {statLabels[key]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Artifact level{" "}
            <input
              name="artifactLevel"
              type="number"
              min={0}
              max={20}
              defaultValue={piece?.level ?? 20}
              required
            />
          </label>
          <label>
            Substat to edit{" "}
            <select name="substat" defaultValue="critRate_">
              {(
                [
                  "critRate_",
                  "critDMG_",
                  "enerRech_",
                  "eleMas",
                  "atk_",
                  "hp_",
                  "def_",
                  "atk",
                  "hp",
                  "def",
                ] as const
              ).map((key) => (
                <option key={key} value={key}>
                  {statLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <label>
            New value{" "}
            <input
              name="value"
              type="number"
              min={0}
              max={1000}
              step=".1"
              placeholder="0 removes the selected stat"
              required
            />
          </label>
        </div>
        {piece && (
          <div className="input-row">
            <GameIcon src={piece.icon} alt="" size={38} />
            {piece.substats.map((stat) => (
              <span key={stat.key}>
                {statLabels[stat.key]} {stat.value}
              </span>
            ))}
          </div>
        )}
        <div className="input-row">
          <button type="submit" className="quiet">
            Apply artifact stats
          </button>
          {piece && (
            <button
              type="button"
              className="quiet"
              onClick={() =>
                update(
                  swapGear(
                    character,
                    character.weapon,
                    character.artifacts.filter((entry) => entry.slot !== slot),
                  ),
                )
              }
            >
              Remove artifact
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
