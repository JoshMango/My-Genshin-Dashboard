import {
  buildCharacter,
  catalogCharacters,
  catalogWeapon,
  inRange,
  isStatKey,
  record,
} from "@/lib/builds";
import { asset, type Catalog } from "@/lib/enka/catalog";
import { gameDataKey } from "@/lib/enka/descriptions";
import { metadataStat } from "@/lib/enka/normalize";
import {
  slots,
  type Artifact,
  type Character,
  type Slot,
  type StatKey,
} from "@/lib/model";

const goodSlots = {
  flower: "Flower",
  plume: "Plume",
  sands: "Sands",
  goblet: "Goblet",
  circlet: "Circlet",
} as const;
const mainCodes: Record<StatKey, number> = {
  hp: 2,
  hp_: 3,
  atk: 5,
  atk_: 6,
  def: 8,
  def_: 9,
  eleMas: 28,
  critRate_: 20,
  critDMG_: 22,
  enerRech_: 23,
  heal_: 26,
  physical_dmg_: 30,
  pyro_dmg_: 40,
  electro_dmg_: 41,
  hydro_dmg_: 42,
  dendro_dmg_: 43,
  anemo_dmg_: 44,
  geo_dmg_: 45,
  cryo_dmg_: 46,
};
type Entry = { key: string; level: number; ascension: number };
type GoodCharacter = Entry & {
  constellation: number;
  talent: { auto: number; skill: number; burst: number };
  element?: string;
};
type GoodWeapon = Entry & { refinement: number; location: string };
type GoodArtifact = {
  setKey: string;
  slotKey: keyof typeof goodSlots;
  mainStatKey: StatKey;
  location: string;
  rarity: number;
  level: number;
  lock?: boolean;
  substats: { key: StatKey | ""; value: number }[];
};
export type Good = {
  format: "GOOD";
  version: 1 | 2 | 3;
  source: string;
  characters?: GoodCharacter[];
  weapons?: GoodWeapon[];
  artifacts?: GoodArtifact[];
};

function validEntry(value: unknown): value is Entry {
  return (
    record(value) &&
    typeof value.key === "string" &&
    inRange(value.level, 1, 100) &&
    Number.isInteger(value.level) &&
    inRange(value.ascension, 0, 6) &&
    Number.isInteger(value.ascension)
  );
}
function validCharacter(value: unknown) {
  if (!record(value) || !record(value.talent)) return false;
  return (
    inRange(value.constellation, 0, 6) &&
    [value.talent.auto, value.talent.skill, value.talent.burst].every(
      (level) => inRange(level, 1, 15) && Number.isInteger(level),
    ) &&
    validEntry(value)
  );
}
function validWeapon(value: unknown) {
  return (
    record(value) &&
    typeof value.location === "string" &&
    inRange(value.refinement, 1, 5) &&
    Number.isInteger(value.refinement) &&
    validEntry(value)
  );
}
function validArtifact(value: unknown) {
  return (
    record(value) &&
    typeof value.setKey === "string" &&
    typeof value.location === "string" &&
    typeof value.slotKey === "string" &&
    Object.hasOwn(goodSlots, value.slotKey) &&
    isStatKey(value.mainStatKey) &&
    inRange(value.rarity, 1, 5) &&
    Number.isInteger(value.rarity) &&
    inRange(value.level, 0, 20) &&
    Number.isInteger(value.level) &&
    Array.isArray(value.substats) &&
    value.substats.length <= 4 &&
    value.substats.every(
      (stat) =>
        record(stat) &&
        (isStatKey(stat.key) || stat.key === "") &&
        inRange(stat.value, 0, 10000),
    )
  );
}

export function parseGood(value: unknown): Good | undefined {
  if (
    !record(value) ||
    value.format !== "GOOD" ||
    ![1, 2, 3].some((version) => version === value.version) ||
    typeof value.source !== "string"
  )
    return;
  const fields = [
    ["characters", validCharacter, 500],
    ["weapons", validWeapon, 12_000],
    ["artifacts", validArtifact, 12_000],
  ] as const;
  for (const [key, validate, max] of fields) {
    const items = value[key];
    if (
      items !== undefined &&
      (!Array.isArray(items) || items.length > max || !items.every(validate))
    )
      return;
  }
  return value as Good;
}

export function setOptions(catalog: Catalog) {
  return Object.entries(catalog.relics.Sets)
    .flatMap(([id, set]) => {
      const name = catalog.loc[set.Name];
      return name ? [{ id, name, icon: artifactIcon(catalog, id, 0) }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const itemsBySet = new WeakMap<Catalog, Map<string, string>>();

function artifactIcon(
  catalog: Catalog,
  setId: string,
  type: number,
  rarity?: number,
) {
  let index = itemsBySet.get(catalog);
  if (!index) {
    index = new Map();
    for (const entry of Object.values(catalog.relics.Items)) {
      index.set(
        `${entry.SetId}:${entry.EquipType}:${entry.Rarity}`,
        entry.Icon,
      );
      index.set(`${entry.SetId}:${entry.EquipType}`, entry.Icon);
      index.set(entry.SetId.toString(), entry.Icon);
    }
    itemsBySet.set(catalog, index);
  }
  return asset(
    index.get(`${setId}:${type}:${rarity}`) ??
      index.get(`${setId}:${type}`) ??
      index.get(setId),
  );
}

export function makeArtifact(
  catalog: Catalog,
  info: {
    id: string;
    setId?: string;
    slot: Slot;
    rarity: number;
    level: number;
    main: StatKey;
    substats: Artifact["substats"];
    lock?: boolean;
  },
): Artifact {
  const metadata = info.setId && catalog.relics.Sets[info.setId];
  const type = slots.indexOf(info.slot);
  const code = mainCodes[info.main];
  const raw = catalog.relicLevels[info.rarity]?.[info.level + 1]?.[code] ?? 0;
  return {
    id: info.id,
    setId: info.setId,
    setName: metadata
      ? (catalog.loc[metadata.Name] ?? "Unknown set")
      : "Unknown set",
    slot: info.slot,
    rarity: info.rarity,
    level: info.level,
    icon: info.setId
      ? artifactIcon(catalog, info.setId, type, info.rarity)
      : undefined,
    main: metadataStat(code, raw) ?? { key: info.main, value: 0 },
    substats: info.substats,
    lock: info.lock,
  };
}

export function normalizeGood(data: Good, catalog: Catalog) {
  const definitions = catalogCharacters(catalog);
  const weaponIndex = new Map(
    Object.entries(catalog.weapons).map(([id, meta]) => [
      gameDataKey(catalog.loc[String(meta.NameTextMapHash)] ?? ""),
      id,
    ]),
  );
  const setIndex = new Map(
    setOptions(catalog).map(({ id, name }) => [gameDataKey(name), id]),
  );
  const result: Character[] = [];
  const artifacts: Artifact[] = [];
  const equipped = new Map<string, Artifact[]>();
  const weapons = new Map<string, ReturnType<typeof catalogWeapon>>();
  (data.weapons ?? []).forEach((weapon) => {
    if (weapon.location)
      weapons.set(
        weapon.location,
        catalogWeapon(
          weaponIndex.get(gameDataKey(weapon.key)) ?? "",
          weapon.level,
          weapon.ascension,
          weapon.refinement,
          catalog,
        ),
      );
  });
  (data.artifacts ?? []).forEach((item, index) => {
    const piece = makeArtifact(catalog, {
      id: `good-${index}`,
      setId: setIndex.get(gameDataKey(item.setKey)),
      slot: goodSlots[item.slotKey],
      rarity: item.rarity,
      level: item.level,
      main: item.mainStatKey,
      lock: item.lock,
      substats: item.substats.flatMap(({ key, value }) =>
        key ? [{ key, value }] : [],
      ),
    });
    if (!piece.setId) piece.setName = item.setKey;
    artifacts.push(piece);
    if (item.location) {
      const items = equipped.get(item.location) ?? [];
      if (!items.some((entry) => entry.slot === piece.slot)) items.push(piece);
      equipped.set(item.location, items);
    }
  });
  for (const item of data.characters ?? []) {
    const key = gameDataKey(item.key);
    const entry = definitions.find((candidate) =>
      candidate.name === "Traveler"
        ? [
            `traveler${candidate.element?.toLowerCase()}`,
            `${candidate.element?.toLowerCase()}traveler`,
          ].includes(key) ||
          ((key === "traveler" || key === "travelerm" || key === "travelerf") &&
            candidate.element?.toLowerCase() === item.element?.toLowerCase())
        : gameDataKey(candidate.name) === key,
    );
    if (!entry || result.some((character) => character.id === entry.id))
      continue;
    result.push(
      buildCharacter(entry.id, catalog, {
        source: "good",
        level: item.level,
        ascension: item.ascension,
        constellation: item.constellation,
        talents: [item.talent.auto, item.talent.skill, item.talent.burst],
        weapon: weapons.get(item.key),
        artifacts: equipped.get(item.key),
      }),
    );
  }
  return {
    characters: result,
    artifacts,
    unmatched: (data.characters?.length ?? 0) - result.length,
  };
}
