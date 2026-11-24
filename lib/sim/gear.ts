import type { Artifact, Character, StatKey, Stats, Weapon } from "@/lib/model";

function bonuses(artifacts: Artifact[], weapon?: Weapon): Stats {
  const stats: Stats = {};
  for (const { key, value } of [
    ...(weapon?.stats ?? []).filter((stat) => stat.key !== "atk"),
    ...artifacts.flatMap((artifact) => [artifact.main, ...artifact.substats]),
  ]) {
    stats[key] = (stats[key] ?? 0) + value;
  }
  return stats;
}

export function swapGear(
  build: Character,
  weapon: Weapon | undefined,
  artifacts: Artifact[],
): Character {
  const before = bonuses(build.artifacts, build.weapon);
  const after = bonuses(artifacts, weapon);
  const stats = { ...build.stats };
  const base = { ...build.base };
  const attack = (item?: Weapon) =>
    item?.stats.find((stat) => stat.key === "atk")?.value ?? 0;
  const weaponDelta = attack(weapon) - attack(build.weapon);
  const changed = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ] as StatKey[]);
  for (const key of changed) {
    if (key === "hp" || key === "atk" || key === "def") continue;
    stats[key] = (stats[key] ?? 0) + (after[key] ?? 0) - (before[key] ?? 0);
  }
  for (const key of ["hp", "atk", "def"] as const) {
    const baseBefore = base[key] ?? 0;
    const nextBase = baseBefore + (key === "atk" ? weaponDelta : 0);
    const percentage = build.stats[`${key}_`] ?? before[`${key}_`] ?? 0;
    const percentageDelta = (after[`${key}_`] ?? 0) - (before[`${key}_`] ?? 0);
    const flatDelta = (after[key] ?? 0) - (before[key] ?? 0);
    const statDelta =
      (nextBase - baseBefore) * (1 + percentage / 100) +
      (nextBase * percentageDelta) / 100 +
      flatDelta;
    stats[key] = Math.max(0, (stats[key] ?? 0) + statDelta);
    base[key] = nextBase;
  }
  return { ...build, weapon, artifacts, base, stats };
}
