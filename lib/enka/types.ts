type EnkaStat = {
  mainPropId?: string;
  appendPropId?: string;
  appendPropID?: string;
  statValue?: number;
  propValue?: number;
};
export type EnkaEquipment = {
  itemId: number;
  weapon?: {
    level?: number;
    promoteLevel?: number;
    affixMap?: Record<string, number>;
  };
  reliquary?: { level?: number; appendPropIdList?: number[] };
  flat?: {
    nameTextMapHash?: string;
    setNameTextMapHash?: string;
    setId?: number;
    rankLevel?: number;
    equipType?: string;
    icon?: string;
    weaponStats?: EnkaStat[];
    reliquaryMainstat?: EnkaStat;
    reliquarySubstats?: EnkaStat[];
  };
};
export type EnkaAvatar = {
  avatarId: number;
  skillDepotId?: number;
  costumeId?: number;
  talentIdList?: number[];
  skillLevelMap?: Record<string, number>;
  proudSkillExtraLevelMap?: Record<string, number>;
  propMap?: Record<string, { val?: string; ival?: string }>;
  fightPropMap?: Record<string, number>;
  equipList?: EnkaEquipment[];
};
export type EnkaResponse = {
  ttl?: number;
  profileUnavailable?: boolean;
  playerInfo?: {
    nickname?: string;
    level?: number;
    signature?: string;
    nameCardId?: number;
    namecardId?: number;
    profilePicture?: { id?: number; avatarId?: number; costumeId?: number };
  };
  avatarInfoList?: EnkaAvatar[];
};
