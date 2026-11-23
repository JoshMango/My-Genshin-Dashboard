"use client";

import { useMemo, useState, type FormEvent } from "react";
import { buildCharacter, catalogCharacters, catalogWeapon } from "@/lib/builds";
import type { Catalog } from "@/lib/enka/catalog";
import { makeArtifact, setOptions } from "@/lib/good";
import {
  slots,
  statLabels,
  type Artifact,
  type Slot,
  type Stat,
  type StatKey,
} from "@/lib/model";
import { useDashboard } from "./dashboard-state";
import { useCatalog } from "./use-catalog";

const mainOptions: Record<Slot, StatKey[]> = {
  Flower: ["hp"],
  Plume: ["atk"],
  Sands: ["atk_", "hp_", "def_", "eleMas", "enerRech_"],
  Goblet: [
    "atk_",
    "hp_",
    "def_",
    "eleMas",
    "pyro_dmg_",
    "hydro_dmg_",
    "cryo_dmg_",
    "electro_dmg_",
    "dendro_dmg_",
    "anemo_dmg_",
    "geo_dmg_",
    "physical_dmg_",
  ],
  Circlet: ["atk_", "hp_", "def_", "eleMas", "critRate_", "critDMG_", "heal_"],
};
const subOptions: StatKey[] = [
  "hp",
  "hp_",
  "atk",
  "atk_",
  "def",
  "def_",
  "critRate_",
  "critDMG_",
  "enerRech_",
  "eleMas",
];

function numberFrom(data: FormData, key: string, fallback: number) {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? Number(value) : fallback;
}

export function ManualBuild() {
  const [opened, setOpened] = useState(false);
  const { catalog, failure, retry } = useCatalog(opened);
  return (
    <details
      className="panel import-panel"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
    >
      <summary>
        <strong>Manual build</strong>
      </summary>
      {opened &&
        (catalog ? (
          <BuildForm catalog={catalog} />
        ) : (
          <p className="muted">
            {failure || "Loading game catalog…"}{" "}
            {failure && (
              <button type="button" className="quiet" onClick={retry}>
                Retry
              </button>
            )}
          </p>
        ))}
    </details>
  );
}

function BuildForm({ catalog }: { catalog: Catalog }) {
  const { addManual } = useDashboard();
  const options = useMemo(() => catalogCharacters(catalog), [catalog]);
  const sets = useMemo(() => setOptions(catalog), [catalog]);
  const [id, setId] = useState("");
  const [notice, setNotice] = useState("");
  const character = options.find((entry) => entry.id === id);
  const weapons = Object.entries(catalog.weapons)
    .flatMap(([key, weapon]) => {
      const name = catalog.loc[String(weapon.NameTextMapHash)];
      return name && character?.weaponType === weapon.WeaponType
        ? [{ key, name }]
        : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!character) return;
    const data = new FormData(event.currentTarget);
    const artifactList: Artifact[] = slots.flatMap((slot) => {
      const setId = String(data.get(`${slot}-set`) ?? "");
      if (!setId) return [];
      const main = data.get(`${slot}-main`) as StatKey;
      const substats: Stat[] = Array.from({ length: 4 }, (_, index) => {
        const key = data.get(`${slot}-sub-${index}`) as StatKey;
        const value = numberFrom(data, `${slot}-value-${index}`, 0);
        return subOptions.includes(key) && key !== main && value > 0
          ? [{ key, value }]
          : [];
      }).flat();
      return [
        makeArtifact(catalog, {
          id: `manual-${id}-${slot}`,
          slot,
          setId,
          rarity: 5,
          level: numberFrom(data, `${slot}-level`, 20),
          main,
          substats: [
            ...new Map(substats.map((stat) => [stat.key, stat])).values(),
          ],
        }),
      ];
    });
    const weaponId = String(data.get("weapon") ?? "");
    const weapon = weapons.some((entry) => entry.key === weaponId)
      ? catalogWeapon(
          weaponId,
          numberFrom(data, "weaponLevel", 90),
          numberFrom(data, "weaponAscension", 6),
          numberFrom(data, "refinement", 1),
          catalog,
        )
      : undefined;
    const build = buildCharacter(id, catalog, {
      source: data.get("owned") === "on" ? "manual" : "preview",
      level: numberFrom(data, "level", 90),
      ascension: numberFrom(data, "ascension", 6),
      constellation: numberFrom(data, "constellation", 0),
      talents: ["normal", "skill", "burst"].map((name) =>
        numberFrom(data, name, 8),
      ),
      weapon,
      artifacts: artifactList,
    });
    setNotice(
      addManual(build)
        ? `${build.name} saved to this browser.`
        : "Browser storage is unavailable or full.",
    );
  }

  return (
    <form onSubmit={submit} className="stack">
      <label className="field">
        Character{" "}
        <select
          value={id}
          onChange={(event) => {
            setId(event.target.value);
            setNotice("");
          }}
          required
        >
          <option value="">Choose a character</option>
          {options.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      {character && (
        <div key={id} className="stack">
          <label className="checkbox-label">
            <input type="checkbox" name="owned" /> I own this character
          </label>
          <div className="settings-grid">
            <label>
              Character level{" "}
              <input
                name="level"
                type="number"
                min={1}
                max={100}
                defaultValue={90}
                required
              />
            </label>
            <label>
              Ascension{" "}
              <input
                name="ascension"
                type="number"
                min={0}
                max={6}
                defaultValue={6}
                required
              />
            </label>
            <label>
              Constellation{" "}
              <input
                name="constellation"
                type="number"
                min={0}
                max={6}
                defaultValue={0}
                required
              />
            </label>
            {["Normal", "Skill", "Burst"].map((label) => (
              <label key={label}>
                {label} Lv.{" "}
                <input
                  name={label.toLowerCase()}
                  type="number"
                  min={1}
                  max={15}
                  defaultValue={8}
                  required
                />
              </label>
            ))}
          </div>
          <div className="settings-grid">
            <label>
              Weapon{" "}
              <select name="weapon">
                <option value="">None</option>
                {weapons.map((entry) => (
                  <option value={entry.key} key={entry.key}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Weapon Lv.{" "}
              <input
                name="weaponLevel"
                type="number"
                min={1}
                max={100}
                defaultValue={90}
                required
              />
            </label>
            <label>
              Weapon ascension{" "}
              <input
                name="weaponAscension"
                type="number"
                min={0}
                max={6}
                defaultValue={6}
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
                defaultValue={1}
                required
              />
            </label>
          </div>
          <div className="artifact-grid">
            {slots.map((slot) => (
              <details key={slot} className="gear-card">
                <summary>
                  <strong>{slot}</strong>
                </summary>
                <label className="field">
                  Set{" "}
                  <select name={`${slot}-set`}>
                    <option value="">Empty</option>
                    {sets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Main stat{" "}
                  <select name={`${slot}-main`}>
                    {mainOptions[slot].map((key) => (
                      <option key={key} value={key}>
                        {statLabels[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Artifact level{" "}
                  <input
                    name={`${slot}-level`}
                    type="number"
                    min={0}
                    max={20}
                    defaultValue={20}
                  />
                </label>
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="substat-fields" key={index}>
                    <label className="field">
                      Substat {index + 1}
                      <select name={`${slot}-sub-${index}`}>
                        <option value="">None</option>
                        {subOptions.map((key) => (
                          <option value={key} key={key}>
                            {statLabels[key]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Value{" "}
                      <input
                        name={`${slot}-value-${index}`}
                        type="number"
                        min={0}
                        max={1000}
                        step=".1"
                        defaultValue={0}
                      />
                    </label>
                  </div>
                ))}
              </details>
            ))}
          </div>
          <button type="submit">Save manual build</button>
        </div>
      )}
      <p role="status">{notice}</p>
    </form>
  );
}
