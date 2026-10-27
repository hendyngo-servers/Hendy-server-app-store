import { useEffect, useState } from "react";
export type AuthState = { status: "checking" | "authenticated" | "unauthenticated"; message?: string };
/** Access validates the assertion at the Worker edge. This hook asks the protected API; it does not store tokens. */
export function useAuth(apiBaseUrl: string) {
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });
  useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/admin/session`, { credentials: "include" })
      .then(async (res) => {
        if (!active) return;
        setAuth(res.ok ? { status: "authenticated" } : { status: "unauthenticated", message: "Hãy đăng nhập bằng Cloudflare Access." });
      }).catch(() => active && setAuth({ status: "unauthenticated", message: "Không thể kết nối API quản trị." }));
    return () => { active = false; };
  }, [apiBaseUrl]);
  return auth;
}
