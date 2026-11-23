import { statLabels, type Character, type StatKey } from "@/lib/model";
import { characterRoles } from "@/lib/teams";

const damageBonusKeys = (Object.keys(statLabels) as StatKey[]).filter((key) =>
  key.endsWith("_dmg_"),
);
const critStats: StatKey[] = ["critRate_", "critDMG_"];
const hpDamage = new Set([
  "Furina",
  "Yelan",
  "Neuvillette",
  "Mualani",
  "Hu Tao",
  "Columbina",
  "Dehya",
]);
const hpSupport = new Set([
  "Barbara",
  "Dahlia",
  "Diona",
  "Dori",
  "Kirara",
  "Layla",
  "Baizhu",
  "Yaoyao",
  "Sigewinne",
  "Zhongli",
  "Mika",
  "Candace",
  "Vodyanitsa",
  "Ifa",
]);
const defDamage = new Set([
  "Albedo",
  "Arataki Itto",
  "Chiori",
  "Kachina",
  "Noelle",
  "Zibai",
]);
const defSupport = new Set(["Gorou", "Xilonen", "Yun Jin", "Linnea", "Illuga"]);
const emDamage = new Set([
  "Alhaitham",
  "Cyno",
  "Nahida",
  "Nefer",
  "Sethos",
  "Tighnari",
]);
const emSupport = new Set([
  "Kaedehara Kazuha",
  "Sucrose",
  "Yumemizuki Mizuki",
  "Citlali",
  "Lauma",
  "Kaveh",
]);
const atkSupport = new Set([
  "Charlotte",
  "Iansan",
  "Jean",
  "Kujou Sara",
  "Lan Yan",
  "Nicole",
  "Qiqi",
  "Shenhe",
  "Xianyun",
  "Sayu",
]);
const physical = new Set(["Eula", "Razor", "Freminet", "Xinyan"]);
const overrides: Record<string, StatKey[]> = {
  Bennett: ["enerRech_", "hp", "atk"],
  "Sangonomiya Kokomi": ["hp", "enerRech_", "heal_"],
  Nilou: ["hp", "eleMas"],
  Chevreuse: ["hp", "enerRech_"],
  "Kuki Shinobu": ["eleMas", "hp"],
  Thoma: ["enerRech_", "hp", "eleMas"],
  "Raiden Shogun": ["enerRech_", ...critStats],
  Xiangling: ["enerRech_", ...critStats],
  Xingqiu: ["enerRech_", ...critStats],
  Beidou: ["enerRech_", ...critStats],
  Mona: ["enerRech_", ...critStats],
  Faruzan: ["enerRech_", "critRate_"],
  Aino: ["enerRech_", "eleMas"],
};

export function combatStatLayout(
  character: Pick<Character, "name" | "element">,
) {
  const main =
    physical.has(character.name) || !character.element
      ? "physical_dmg_"
      : (`${character.element.toLowerCase()}_dmg_` as StatKey);
  return {
    left: ["hp", "atk", "def", "eleMas", "enerRech_"] as StatKey[],
    right: [...critStats, main] as StatKey[],
    secondary: damageBonusKeys.filter((key) => key !== main),
    extra:
      character.name === "Sangonomiya Kokomi" ? ("heal_" as const) : undefined,
  };
}

export function essentialCombatStats(character: Character): StatKey[] {
  const name = character.name;
  if (Object.hasOwn(overrides, name)) return overrides[name];
  if (hpDamage.has(name)) return ["hp", ...critStats];
  if (hpSupport.has(name)) return ["hp", "enerRech_"];
  if (defDamage.has(name)) return ["def", ...critStats];
  if (defSupport.has(name)) return ["def", "enerRech_"];
  if (emDamage.has(name)) return ["eleMas", ...critStats];
  if (emSupport.has(name)) return ["eleMas", "enerRech_"];
  if (atkSupport.has(name)) return ["atk", "enerRech_"];
  const roles = characterRoles(character);
  return roles[0] === "enabler"
    ? ["enerRech_", "eleMas"]
    : ["atk", ...critStats];
}
