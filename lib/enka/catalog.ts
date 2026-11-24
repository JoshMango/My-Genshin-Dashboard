const origin = "https://enka.network";
const revision = "2a63e0971795bd0d4f8753e61d266b1ab565a417";
const root = `https://raw.githubusercontent.com/EnkaNetwork/API-docs/${revision}/store/gi`;

type Props = Record<string, number>;
export type ProfilePictures = Record<string, { IconPath: string }>;
type AvatarMetadata = {
  Element?: string;
  Consts?: string[];
  SkillOrder?: number[];
  Skills?: Record<string, string>;
  ProudMap?: Props;
  NameTextMapHash?: number | string;
  SideIconName?: string;
  QualityType?: string;
  WeaponType?: string;
  Costumes?: Record<string, { Icon?: string; Art?: string }>;
  BaseProps?: Props;
  PropGrowCurves?: Props;
  PromoteProps?: Props[];
};
type WeaponMetadata = {
  Rarity: number;
  WeaponType: number;
  Icon: string;
  NameTextMapHash: number | string;
  BaseProps: Props;
  PropGrowCurves: Props;
  BasePromote: number[];
  RefineProps?: Record<string, number[]>;
};
type RelicMetadata = {
  Items: Record<
    string,
    { Rarity: number; EquipType: number; Icon: string; SetId: number }
  >;
  Sets: Record<string, { Name: string; AddProps: Props }>;
};
export type Catalog = {
  avatars: Record<string, AvatarMetadata>;
  weapons: Record<string, WeaponMetadata>;
  relics: RelicMetadata;
  loc: Record<string, string>;
  namecards: Record<string, { Icon: string }>;
  affixes: Record<
    string,
    { PropType: number; Efficiency: number; Value: number }
  >;
  curves: Record<string, number[]>;
  relicLevels: Record<string, Record<string, Props>>;
};

async function read<T>(file: string): Promise<T> {
  const response = await fetch(`${root}/${file}.json`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok)
    throw new Error(
      "The game catalog is temporarily unavailable. Please try again.",
    );
  return response.json();
}
let catalog: Promise<Catalog> | undefined;
let profilePictures: Promise<ProfilePictures> | undefined;

export function loadProfilePictures() {
  profilePictures ??= read<ProfilePictures>("pfps").catch(() => {
    profilePictures = undefined;
    return {};
  });
  return profilePictures;
}

export function loadCatalog(locale = "en") {
  catalog ??= Promise.all([
    read<Catalog["avatars"]>("avatars"),
    read<Catalog["weapons"]>("weapons"),
    read<Catalog["relics"]>("relics"),
    read<Record<string, Catalog["loc"]>>("locs"),
    read<Catalog["namecards"]>("namecards"),
    read<Catalog["affixes"]>("affixes"),
    read<Catalog["curves"]>("curves"),
    read<Catalog["relicLevels"]>("relic_levels"),
  ])
    .then(
      ([
        avatars,
        weapons,
        relics,
        locs,
        namecards,
        affixes,
        curves,
        relicLevels,
      ]) => ({
        avatars,
        weapons,
        relics,
        loc: locs[locale] ?? locs.en,
        namecards,
        affixes,
        curves,
        relicLevels,
      }),
    )
    .catch((error: unknown) => {
      catalog = undefined;
      throw error;
    });
  return catalog;
}

export function asset(path?: string) {
  if (!path) return undefined;
  if (/^\/ui\/[A-Za-z0-9_]+\.(png|jpg|webp)$/i.test(path)) return origin + path;
  if (/^[A-Za-z0-9_]+$/.test(path)) return `${origin}/ui/${path}.png`;
  return undefined;
}
