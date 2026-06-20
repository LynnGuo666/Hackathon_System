// 资源相关标签映射，管理端与选手端共用，避免重复定义。
export const resourceTypeLabels: Record<string, string> = {
  code: "Key",
  link: "链接",
  credential: "凭证",
  physical: "实体物资",
};

export const distributionLabels: Record<string, string> = {
  one_per_participant: "每人一次",
  role_based: "按角色",
  manual: "手动发放",
};

export const phaseLabels: Record<string, string> = {
  pre_event: "赛前",
  in_event: "赛中",
  all: "全阶段",
};
