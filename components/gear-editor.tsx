"use client";

import { useState, type FormEvent } from "react";
import { catalogWeapon } from "@/lib/builds";
import type { Catalog } from "@/lib/enka/catalog";
import { makeArtifact, setOptions } from "@/lib/good";
import { slots, statLabels, type Character, type StatKey } from "@/lib/model";
import { swapGear } from "@/lib/sim/gear";
import { GameIcon } from "./game-icon";

export function GearEditor({
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
