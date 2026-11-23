import keys from "@/data/gcsim-keys.json";
import { gameDataKey } from "@/lib/enka/descriptions";
import type { Character, StatKey } from "@/lib/model";
import { characterRoles, type Team } from "@/lib/teams";
import type { Rotation } from "./estimate";

const supported = {
  characters: new Set(keys.characters),
  weapons: new Set(keys.weapons),
  sets: new Set(keys.sets),
};
const names: Record<StatKey, string> = {
  hp: "hp",
  hp_: "hp%",
  atk: "atk",
  atk_: "atk%",
  def: "def",
  def_: "def%",
  eleMas: "em",
  critRate_: "cr",
  critDMG_: "cd",
  enerRech_: "er",
  heal_: "heal",
  physical_dmg_: "phys%",
  pyro_dmg_: "pyro%",
  hydro_dmg_: "hydro%",
  electro_dmg_: "electro%",
  cryo_dmg_: "cryo%",
  dendro_dmg_: "dendro%",
  anemo_dmg_: "anemo%",
  geo_dmg_: "geo%",
};

function characterKey(character: Character) {
  if (character.name === "Traveler") {
    const twin = character.id.startsWith("10000007") ? "lumine" : "aether";
    return twin + (character.element?.toLowerCase() ?? "");
  }
  return gameDataKey(character.name);
}

function level(value: number, ascension: number) {
  return `${value}/${Math.max(value, [20, 40, 50, 60, 70, 80, 90][ascension] ?? value)}`;
}

export function buildGcsimConfig(team: Team, rotation: Rotation) {
  const members = team.slots.filter(
    (character): character is Character => character !== null,
  );
  if (!members.length) throw new Error("Add a character before running gcsim.");
  const lines: string[] = [
    `options iteration=20 duration=${Math.min(180, Math.max(6, Math.round(rotation.seconds)))} swap_delay=12;`,
  ];
  const lineup = members.map((character) => {
    const key = characterKey(character);
    if (!supported.characters.has(key))
      throw new Error(
        `${character.name} is unavailable in this pinned gcsim version.`,
      );
    const weapon = character.weapon;
    if (!weapon)
      throw new Error(`Equip a weapon on ${character.name} to run gcsim.`);
    const weaponKey = gameDataKey(weapon.name);
    if (!supported.weapons.has(weaponKey))
      throw new Error(
        `${weapon.name} is unavailable in this pinned gcsim version.`,
      );
    const talents = [0, 1, 2].map((index) =>
      Math.min(10, character.talents[index]?.level ?? 1),
    );
    lines.push(
      `${key} char lvl=${level(character.level, character.ascension)} cons=${character.constellation} talent=${talents.join(",")};`,
      `${key} add weapon="${weaponKey}" refine=${weapon.refinement} lvl=${level(weapon.level, weapon.ascension)};`,
    );
    const sets = new Map<string, number>();
    const stats = new Map<StatKey, number>();
    for (const artifact of character.artifacts) {
      const set = gameDataKey(artifact.setName);
      sets.set(set, (sets.get(set) ?? 0) + 1);
      for (const { key, value } of [artifact.main, ...artifact.substats])
        stats.set(key, (stats.get(key) ?? 0) + value);
    }
    for (const [set, pieces] of sets) {
      if (pieces < 2) continue;
      if (!supported.sets.has(set))
        throw new Error(
          `${character.name} has an active artifact set unsupported by this gcsim version.`,
        );
      lines.push(`${key} add set="${set}" count=${pieces >= 4 ? 4 : 2};`);
    }
    if (stats.size)
      lines.push(
        `${key} add stats ${[...stats]
          .map(
            ([stat, value]) =>
              `${names[stat]}=${Number((value / (stat.endsWith("_") ? 100 : 1)).toFixed(5))}`,
          )
          .join(" ")};`,
      );
    return {
      key,
      name: character.name,
      onField: characterRoles(character).includes("carry"),
    };
  });
  const carry = lineup.find((member) => member.onField) ?? lineup[0];
  const order = [...lineup.filter((member) => member !== carry), carry];
  const attacks = Math.min(20, Math.max(1, Math.round(rotation.normalHits)));
  lines.push(
    `target lvl=${Math.round(rotation.enemyLevel)} resist=${Number((rotation.resistance / 100).toFixed(3))};`,
    `active ${order[0].key};`,
    "",
    "while 1 {",
    ...order.map(
      ({ key }) =>
        `  ${key} skill, burst${key === carry.key ? `, attack:${attacks}` : ""};`,
    ),
    "  wait(60);",
    "}",
  );
  return { config: lines.join("\n"), names: lineup.map(({ name }) => name) };
}
