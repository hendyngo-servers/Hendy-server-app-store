import { useCallback, useEffect, useState } from "react";
export interface SyncLog { id: string; level: "info" | "warning" | "error"; message: string; createdAt: string; }
export function useSyncLogs(apiBaseUrl: string, enabled = true) {
  const [logs, setLogs] = useState<SyncLog[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError("");
    try { const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/admin/logs?limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error(res.status === 401 ? "Không được phép truy cập nhật ký." : `API trả về ${res.status}`);
      const data = await res.json() as { logs?: SyncLog[] }; setLogs(data.logs ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Lỗi tải nhật ký"); }
    finally { setLoading(false); }
  }, [apiBaseUrl, enabled]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { logs, loading, error, refresh };
}
