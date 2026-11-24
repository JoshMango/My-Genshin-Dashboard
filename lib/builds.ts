import { asset, type Catalog } from "@/lib/enka/catalog";
import { characterMetadata, metadataStat } from "@/lib/enka/normalize";
import {
  elements,
  slots,
  statLabels,
  type Artifact,
  type Character,
  type Stat,
  type StatKey,
  type Stats,
  type Weapon,
} from "@/lib/model";

export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function inRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}
export function isStatKey(key: unknown): key is StatKey {
  return typeof key === "string" && Object.hasOwn(statLabels, key);
}
function isStat(value: unknown): value is Stat {
  return (
    record(value) &&
    isStatKey(value.key) &&
    inRange(value.value, -100000, 1000000) &&
    (value.rolls === undefined ||
      (Array.isArray(value.rolls) &&
        value.rolls.every((roll) => inRange(roll, 0, 1.01))))
  );
}
function isStats(value: unknown): value is Stats {
  return (
    record(value) &&
    Object.entries(value).every(([key, number]) =>
      isStat({ key, value: number }),
    )
  );
}
export function isArtifact(value: unknown): value is Artifact {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.setName === "string" &&
    slots.some((slot) => slot === value.slot) &&
    inRange(value.rarity, 0, 5) &&
    inRange(value.level, 0, 20) &&
    isStat(value.main) &&
    Array.isArray(value.substats) &&
    value.substats.length <= 4 &&
    value.substats.every(isStat)
  );
}
function isWeapon(value: unknown): value is Weapon {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    inRange(value.rarity, 0, 5) &&
    inRange(value.level, 1, 100) &&
    inRange(value.refinement, 1, 5) &&
    inRange(value.ascension, 0, 6) &&
    Array.isArray(value.stats) &&
    value.stats.every(isStat)
  );
}

export function isCharacter(value: unknown): value is Character {
  return (
    record(value) &&
    typeof value.id === "string" &&
    /^\d+(?:-\d+)?$/.test(value.id) &&
    typeof value.name === "string" &&
    value.name.length <= 120 &&
    (value.element === undefined ||
      elements.some((element) => element === value.element)) &&
    ["showcase", "manual", "good", "preview"].some(
      (source) => source === value.source,
    ) &&
    inRange(value.rarity, 0, 5) &&
    inRange(value.level, 1, 100) &&
    inRange(value.ascension, 0, 6) &&
    inRange(value.constellation, 0, 6) &&
    isStats(value.stats) &&
    isStats(value.base) &&
    Array.isArray(value.talents) &&
    value.talents.length <= 3 &&
    value.talents.every(
      (talent) =>
        record(talent) &&
        typeof talent.name === "string" &&
        inRange(talent.level, 1, 15) &&
        inRange(talent.bonus, 0, 8),
    ) &&
    Array.isArray(value.constellations) &&
    value.constellations.length <= 6 &&
    value.constellations.every(
      (item) => record(item) && typeof item.name === "string",
    ) &&
    (value.weapon === undefined || isWeapon(value.weapon)) &&
    Array.isArray(value.artifacts) &&
    value.artifacts.length <= 5 &&
    value.artifacts.every(isArtifact)
  );
}

export const characterGroup = (id: string) => id.split("-")[0];

export function catalogCharacters(catalog: Catalog) {
  return Object.keys(catalog.avatars)
    .flatMap((id) => {
      const meta = characterMetadata(id, catalog);
      if (!meta.element || !meta.rarity || meta.name.startsWith("Character "))
        return [];
      return [
        {
          id,
          ...meta,
          label:
            meta.name === "Traveler"
              ? `${meta.name} · ${meta.element}`
              : meta.name,
        },
      ];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function catalogWeapon(
  id: string,
  level: number,
  ascension: number,
  refinement: number,
  catalog: Catalog,
): Weapon | undefined {
  const weapon = catalog.weapons[id];
  if (!weapon) return;
  return {
    id,
    name: catalog.loc[String(weapon.NameTextMapHash)] ?? `Weapon ${id}`,
    icon: asset(weapon.Icon),
    rarity: weapon.Rarity,
    level,
    ascension,
    refinement,
    stats: Object.entries(weapon.BaseProps).flatMap(([code, value]) => {
      const growth =
        catalog.curves[weapon.PropGrowCurves[code]]?.[level - 1] ?? 1;
      const bonus = code === "4" ? (weapon.BasePromote[ascension] ?? 0) : 0;
      return metadataStat(Number(code), value * growth + bonus) ?? [];
    }),
  };
}

export function equipmentStats(
  stats: Stats,
  base: Stats,
  artifacts: Artifact[],
  weapon?: Weapon,
) {
  const result = { ...stats };
  const totals: Stats = {};
  const equipped = [
    ...(weapon?.stats ?? []),
    ...artifacts.flatMap((item) => [item.main, ...item.substats]),
  ];
  for (const { key, value } of equipped)
    totals[key] = (totals[key] ?? 0) + value;
  for (const [key, value] of Object.entries(totals) as [StatKey, number][])
    result[key] = (result[key] ?? 0) + value;
  for (const key of ["hp", "atk", "def"] as const)
    result[key] =
      (result[key] ?? 0) + ((base[key] ?? 0) * (result[`${key}_`] ?? 0)) / 100;
  return result;
}

export function buildCharacter(
  id: string,
  catalog: Catalog,
  options: {
    source: Character["source"];
    level: number;
    ascension: number;
    constellation?: number;
    weapon?: Weapon;
    artifacts?: Artifact[];
    talents?: number[];
  },
): Character {
  const identity = characterMetadata(id, catalog);
  const meta = catalog.avatars[id];
  const stats: Stats = { critRate_: 5, critDMG_: 50, enerRech_: 100 };
  const base: Stats = {};
  const codes = new Set([
    ...Object.keys(meta?.BaseProps ?? {}),
    ...Object.keys(meta?.PromoteProps?.[options.ascension] ?? {}),
  ]);
  for (const code of codes) {
    const growth =
      catalog.curves[meta.PropGrowCurves?.[code] ?? 0]?.[options.level - 1] ??
      1;
    const val =
      (meta.BaseProps?.[code] ?? 0) * growth +
      (meta.PromoteProps?.[options.ascension]?.[code] ?? 0);
    const stat = metadataStat(Number(code), val);
    if (stat) {
      stats[stat.key] =
        (["critRate_", "critDMG_"].includes(stat.key)
          ? 0
          : (stats[stat.key] ?? 0)) + stat.value;
      if ([1, 4, 7].includes(Number(code))) base[stat.key] = stat.value;
    }
  }
  base.atk =
    (base.atk ?? 0) +
    (options.weapon?.stats.find((stat) => stat.key === "atk")?.value ?? 0);
  const artifacts = options.artifacts ?? [];
  return {
    ...identity,
    id,
    level: options.level,
    ascension: options.ascension,
    constellation: options.constellation ?? 0,
    source: options.source,
    artifacts,
    weapon: options.weapon,
    base,
    stats: equipmentStats(stats, base, artifacts, options.weapon),
    talents: identity.talents.map((talent, index) => ({
      ...talent,
      level: options.talents?.[index] ?? 1,
    })),
  };
}

export function previewCharacter(id: string, catalog: Catalog): Character {
  const weaponType = characterMetadata(id, catalog).weaponType;
  const defaults: Record<number, string> = {
    1: "11401",
    2: "12401",
    3: "15401",
    4: "13407",
    5: "14401",
  };
  const weapon = catalogWeapon(
    defaults[weaponType ?? 0] ?? "",
    90,
    6,
    1,
    catalog,
  );
  const build = buildCharacter(id, catalog, {
    source: "preview",
    level: 90,
    ascension: 6,
    weapon,
    talents: [8, 8, 8],
  });
  return {
    ...build,
    stats: {
      ...build.stats,
      atk: (build.stats.atk ?? 700) * 1.45 + 311,
      hp: (build.stats.hp ?? 10000) + 4780,
      eleMas: (build.stats.eleMas ?? 0) + 100,
      critRate_: (build.stats.critRate_ ?? 5) + 45,
      critDMG_: (build.stats.critDMG_ ?? 50) + 60,
      enerRech_: (build.stats.enerRech_ ?? 100) + 20,
    },
  };
}
