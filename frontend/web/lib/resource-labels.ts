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

export const claimModeLabels: Record<string, string> = {
  self_claim: "自助领取",
  self_apply_review: "自助申请审核",
  admin_only: "仅管理员发放",
};

export const participantTagLabels: Record<string, string> = {
  approved: "已通过审核",
  checked_in: "已签到",
};

export const resourceRequestStatusLabels: Record<string, string> = {
  pending: "审核中",
  approved: "已通过",
  rejected: "已拒绝",
};
