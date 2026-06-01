export const countdown = {
  label: "距离提交截止",
  value: "16:42:09",
  phase: "赛前",
};

export const participant = {
  email: "player@example.com",
  checkinId: "",
  status: "pending",
};

export const tasks = [
  { title: "住宿需求", status: "待审核", tone: "warning" },
  { title: "物资需求", status: "已提交", tone: "primary" },
  { title: "点餐需求", status: "未填写", tone: "default" },
  { title: "AI 兑换码", status: "签到后发放", tone: "secondary" },
];

export const resources = [
  {
    name: "AI 创作平台兑换码",
    status: "待签到",
    code: "签到后可见",
    expiresAt: "2026-06-08",
  },
  {
    name: "云服务额度券",
    status: "已发放",
    code: "CLOUD-HACK-2026-8F2K",
    expiresAt: "2026-07-01",
  },
];

export const emailRows = [
  { to: "player@example.com", subject: "登录验证码", status: "pending", retry: 0 },
  { to: "player@example.com", subject: "AI 兑换码已发放", status: "failed", retry: 2 },
];
