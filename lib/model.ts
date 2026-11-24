export const elements = [
  "Pyro",
  "Hydro",
  "Electro",
  "Cryo",
  "Dendro",
  "Anemo",
  "Geo",
] as const;
export type Element = (typeof elements)[number];
export const slots = ["Flower", "Plume", "Sands", "Goblet", "Circlet"] as const;
export type Slot = (typeof slots)[number];

export const statLabels = {
  hp: "HP",
  hp_: "HP%",
  atk: "ATK",
  atk_: "ATK%",
  def: "DEF",
  def_: "DEF%",
  eleMas: "Elemental Mastery",
  critRate_: "CRIT Rate",
  critDMG_: "CRIT DMG",
  enerRech_: "Energy Recharge",
  heal_: "Healing Bonus",
  physical_dmg_: "Physical DMG",
  pyro_dmg_: "Pyro DMG",
  hydro_dmg_: "Hydro DMG",
  electro_dmg_: "Electro DMG",
  cryo_dmg_: "Cryo DMG",
  dendro_dmg_: "Dendro DMG",
  anemo_dmg_: "Anemo DMG",
  geo_dmg_: "Geo DMG",
} as const;
export type StatKey = keyof typeof statLabels;
export type Stats = Partial<Record<StatKey, number>>;
export type Stat = { key: StatKey; value: number; rolls?: number[] };
export type Weapon = {
  id: string;
  name: string;
  icon?: string;
  rarity: number;
  level: number;
  ascension: number;
  refinement: number;
  stats: Stat[];
};
export type Artifact = {
  id: string;
  name?: string;
  setId?: string;
  setName: string;
  icon?: string;
  slot: Slot;
  rarity: number;
  level: number;
  main: Stat;
  substats: Stat[];
  lock?: boolean;
};
export type Talent = {
  name: string;
  icon?: string;
  level: number;
  bonus: number;
  description?: string;
};
export type Constellation = {
  name: string;
  icon?: string;
  description?: string;
};
export type Character = {
  id: string;
  name: string;
  element?: Element;
  icon?: string;
  art?: string;
  rarity: number;
  weaponType?: number;
  level: number;
  ascension: number;
  constellation: number;
  talents: Talent[];
  constellations: Constellation[];
  stats: Stats;
  base: Stats;
  weapon?: Weapon;
  artifacts: Artifact[];
  source: "showcase" | "manual" | "good" | "preview";
};
export type Profile = {
  uid: string;
  nickname?: string;
  rank?: number;
  signature?: string;
  namecard?: string;
  avatar?: string;
  characters: Character[];
};

export function formatStat({ key, value }: Stat) {
  return key.endsWith("_")
    ? `${value.toFixed(1)}%`
    : Math.round(value).toLocaleString("en");
}
