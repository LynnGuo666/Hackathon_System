const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type RequestOptions = RequestInit & {
  admin?: boolean;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.admin) {
    // 管理端 token 存在 sessionStorage，统一在客户端层注入，页面不直接拼鉴权头。
    const token = typeof window !== "undefined" ? sessionStorage.getItem("admin_token") : null;
    if (token) {
      headers.set("X-Admin-Token", token);
    }
    headers.set("X-Actor-ID", "admin");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // 后端错误统一包在 { error }，这里兜底 HTTP 状态，避免页面散落解析逻辑。
    throw new Error(payload?.error ?? `请求失败：${response.status}`);
  }
  return payload as T;
}
