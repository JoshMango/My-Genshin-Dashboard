import type {
  Artifact,
  Character,
  Element,
  Profile,
  Slot,
  Stat,
  StatKey,
  Stats,
  Weapon,
} from "@/lib/model";
import { asset, type Catalog } from "./catalog";
import type { EnkaAvatar, EnkaEquipment, EnkaResponse } from "./types";

const elements: Record<string, Element> = {
  Fire: "Pyro",
  Water: "Hydro",
  Electric: "Electro",
  Ice: "Cryo",
  Grass: "Dendro",
  Wind: "Anemo",
  Rock: "Geo",
};
const weaponTypes: Record<string, number> = {
  WEAPON_SWORD_ONE_HAND: 1,
  WEAPON_CLAYMORE: 2,
  WEAPON_POLE: 4,
  WEAPON_CATALYST: 5,
  WEAPON_BOW: 3,
};
const slotCodes: Record<string, Slot> = {
  EQUIP_BRACER: "Flower",
  EQUIP_NECKLACE: "Plume",
  EQUIP_SHOES: "Sands",
  EQUIP_RING: "Goblet",
  EQUIP_DRESS: "Circlet",
};
const talentNames = ["Normal Attack", "Elemental Skill", "Elemental Burst"];
const numericProps: Record<number, StatKey> = {
  1: "hp",
  2: "hp",
  3: "hp_",
  4: "atk",
  5: "atk",
  6: "atk_",
  7: "def",
  8: "def",
  9: "def_",
  20: "critRate_",
  22: "critDMG_",
  23: "enerRech_",
  26: "heal_",
  28: "eleMas",
  30: "physical_dmg_",
  40: "pyro_dmg_",
  41: "electro_dmg_",
  42: "hydro_dmg_",
  43: "dendro_dmg_",
  44: "anemo_dmg_",
  45: "geo_dmg_",
  46: "cryo_dmg_",
  2000: "hp",
  2001: "atk",
  2002: "def",
};
const namedProps: Record<string, number> = {
  BASE_ATTACK: 4,
  HP: 2,
  HP_PERCENT: 3,
  ATTACK: 5,
  ATTACK_PERCENT: 6,
  DEFENSE: 8,
  DEFENSE_PERCENT: 9,
  CRITICAL: 20,
  CRITICAL_HURT: 22,
  CHARGE_EFFICIENCY: 23,
  HEAL_ADD: 26,
  ELEMENT_MASTERY: 28,
  PHYSICAL_ADD_HURT: 30,
  FIRE_ADD_HURT: 40,
  ELEC_ADD_HURT: 41,
  WATER_ADD_HURT: 42,
  GRASS_ADD_HURT: 43,
  WIND_ADD_HURT: 44,
  ROCK_ADD_HURT: 45,
  ICE_ADD_HURT: 46,
};

export function fromRatio(key: StatKey, value: number) {
  return value * (key.endsWith("_") ? 100 : 1);
}

export function metadataStat(id: number, value: number): Stat | undefined {
  const key = numericProps[id];
  if (key && Number.isFinite(value))
    return { key, value: fromRatio(key, value) };
}

function equipmentStat(
  prop: string | undefined,
  value: number,
): Stat | undefined {
  const key = numericProps[namedProps[prop?.replace(/^FIGHT_PROP_/, "") ?? ""]];
  if (key && Number.isFinite(value)) return { key, value };
}

export function normalizeWeapon(
  entry: EnkaEquipment,
  catalog: Catalog,
): Weapon {
  const meta = catalog.weapons[entry.itemId];
  return {
    id: String(entry.itemId),
    name:
      catalog.loc[
        String(entry.flat?.nameTextMapHash ?? meta?.NameTextMapHash)
      ] ?? "Unknown weapon",
    icon: asset(entry.flat?.icon ?? meta?.Icon),
    rarity: entry.flat?.rankLevel ?? meta?.Rarity ?? 0,
    level: entry.weapon?.level ?? 1,
    ascension: entry.weapon?.promoteLevel ?? 0,
    refinement: (Object.values(entry.weapon?.affixMap ?? {})[0] ?? 0) + 1,
    stats: (entry.flat?.weaponStats ?? []).flatMap(
      (stat) => equipmentStat(stat.mainPropId, stat.propValue) ?? [],
    ),
  };
}

function normalizeArtifact(
  entry: EnkaEquipment,
  catalog: Catalog,
  owner: string,
): Artifact | undefined {
  const raw = entry.flat?.reliquaryMainstat;
  const slot = slotCodes[entry.flat?.equipType ?? ""];
  const main = raw && equipmentStat(raw.mainPropId, raw.propValue);
  if (!slot || !main) return;
  const item = catalog.relics.Items[entry.itemId];
  const set = item && catalog.relics.Sets[item.SetId];
  const rolls = (entry.reliquary?.appendPropIdList ?? []).flatMap(
    (id) => catalog.affixes[id] ?? [],
  );
  return {
    id: `${owner}-${slot}`,
    setId: item?.SetId ? String(item.SetId) : undefined,
    setName:
      catalog.loc[String(entry.flat?.setNameTextMapHash ?? set?.Name)] ??
      "Unknown set",
    icon: asset(entry.flat?.icon ?? item?.Icon),
    slot,
    rarity: entry.flat?.rankLevel ?? item?.Rarity ?? 0,
    level: Math.max(0, (entry.reliquary?.level ?? 1) - 1),
    main,
    substats: (entry.flat?.reliquarySubstats ?? []).flatMap((rawStat) => {
      const stat = equipmentStat(rawStat.appendPropId, rawStat.propValue);
      if (!stat) return [];
      const matching = rolls.filter(
        (roll) => numericProps[roll.PropType] === stat.key,
      );
      return {
        ...stat,
        rolls: matching.length
          ? matching.map((roll) => roll.Efficiency)
          : undefined,
      };
    }),
  };
}

function avatarMeta(id: string, catalog: Catalog) {
  return catalog.avatars[id] ?? catalog.avatars[id.split("-")[0]];
}

export function characterMetadata(id: string, catalog: Catalog) {
  const meta = avatarMeta(id, catalog);
  const icon = meta?.SideIconName?.replace(
    "UI_AvatarIcon_Side_",
    "UI_AvatarIcon_",
  );
  return {
    name:
      catalog.loc[String(meta?.NameTextMapHash)] ??
      `Character ${id.split("-")[0]}`,
    element: elements[meta?.Element ?? ""],
    icon: asset(icon),
    art: asset(icon?.replace("UI_AvatarIcon_", "UI_Gacha_AvatarImg_")),
    rarity: meta?.QualityType?.startsWith("QUALITY_ORANGE")
      ? 5
      : meta?.QualityType === "QUALITY_PURPLE"
        ? 4
        : 0,
    weaponType: weaponTypes[meta?.WeaponType ?? ""],
    talents: (meta?.SkillOrder ?? []).slice(0, 3).map((skill, index) => ({
      name: talentNames[index],
      icon: asset(meta?.Skills?.[skill]),
      level: 1,
      bonus: 0,
    })),
    constellations: (meta?.Consts ?? []).map((icon, index) => ({
      name: `Constellation ${index + 1}`,
      icon: asset(icon),
    })),
  };
}

export function normalizeCharacter(
  avatar: EnkaAvatar,
  catalog: Catalog,
): Character {
  const variant = `${avatar.avatarId}-${avatar.skillDepotId ?? ""}`;
  const id = catalog.avatars[variant] ? variant : String(avatar.avatarId);
  const meta = avatarMeta(id, catalog);
  const identity = characterMetadata(id, catalog);
  const costume = meta?.Costumes?.[avatar.costumeId ?? 0];
  const stats: Stats = {};
  const base: Stats = {};
  for (const [code, value] of Object.entries(avatar.fightPropMap ?? {})) {
    const prop = Number(code);
    const stat = metadataStat(prop, value);
    if (!stat) continue;
    if ([1, 4, 7].includes(prop)) base[stat.key] = stat.value;
    else if (![2, 5, 8].includes(prop) || stats[stat.key] === undefined)
      stats[stat.key] = stat.value;
  }
  const weapon = avatar.equipList?.find((entry) => entry.weapon);
  return {
    ...identity,
    id,
    icon: asset(costume?.Icon) ?? identity.icon,
    art: asset(costume?.Art) ?? identity.art,
    source: "showcase",
    level: Number(
      avatar.propMap?.[4001]?.val ?? avatar.propMap?.[4001]?.ival ?? 1,
    ),
    ascension: Number(
      avatar.propMap?.[1002]?.val ?? avatar.propMap?.[1002]?.ival ?? 0,
    ),
    constellation: Math.min(6, avatar.talentIdList?.length ?? 0),
    talents: identity.talents.map((talent, index) => {
      const skill = meta?.SkillOrder?.[index] ?? 0;
      return {
        ...talent,
        level: avatar.skillLevelMap?.[skill] ?? 1,
        bonus:
          avatar.proudSkillExtraLevelMap?.[meta?.ProudMap?.[skill] ?? 0] ?? 0,
      };
    }),
    stats,
    base,
    weapon: weapon && normalizeWeapon(weapon, catalog),
    artifacts: (avatar.equipList ?? []).flatMap((entry) =>
      entry.reliquary ? (normalizeArtifact(entry, catalog, id) ?? []) : [],
    ),
  };
}

export function normalizeProfile(
  uid: string,
  data: EnkaResponse,
  catalog: Catalog,
): Profile {
  const player = data.profileUnavailable ? undefined : data.playerInfo;
  return {
    uid,
    nickname: player?.nickname,
    rank: player?.level,
    signature: player?.signature,
    namecard: asset(
      catalog.namecards[player?.nameCardId ?? player?.namecardId ?? 0]?.Icon,
    ),
    characters: (data.avatarInfoList ?? []).map((avatar) =>
      normalizeCharacter(avatar, catalog),
    ),
  };
}
