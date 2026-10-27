import { useEffect, useMemo, useState } from "react";
import type { AppRelease, ReleasePlatform } from "@hendy/types";
import { useDeviceDetect } from "@hendy/shared-hooks";
import { StatusBadge } from "@hendy/shared-ui";
import { AndroidDirectLink } from "./components/AndroidDirectLink";
import { IOSOtaDownloader } from "./components/IOSOtaDownloader";
import { WindowsSafeInstaller } from "./components/WindowsSafeInstaller";
import { MacOSInstaller } from "./components/MacOSInstaller";
import { MobileAppStoreLayout } from "./layouts/MobileAppStoreLayout";
import { DesktopPortalLayout } from "./layouts/DesktopPortalLayout";

const api = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
export default function App() {
  const device = useDeviceDetect(); const [releases,setReleases] = useState<AppRelease[]>([]); const [busy,setBusy] = useState(true); const [error,setError] = useState(""); const [platform,setPlatform] = useState<ReleasePlatform | "all">("all");
  useEffect(()=>{ let alive=true; if(!api){setError("Chưa cấu hình VITE_API_BASE_URL.");setBusy(false);return;}
    fetch(`${api}/api/releases?published=true`, { credentials:"omit" }).then(async r=>{if(!r.ok) throw new Error(`API lỗi ${r.status}`);return r.json() as Promise<{releases:AppRelease[]}>;})
      .then(d=>alive&&setReleases(d.releases??[])).catch(e=>alive&&setError(e instanceof Error?e.message:"Không thể tải bản phát hành.")).finally(()=>alive&&setBusy(false));
    return ()=>{alive=false;};
  },[]);
  const visible=useMemo(()=>releases.filter(r=>platform==="all"||r.platform===platform),[releases,platform]);
  const releaseAction=(r:AppRelease)=> { switch(r.platform){case "ios": return <IOSOtaDownloader apiBaseUrl={api} release={r}/>; case "android": return <AndroidDirectLink apiBaseUrl={api} release={r}/>; case "windows": return <WindowsSafeInstaller apiBaseUrl={api} release={r}/>; case "macos": return <MacOSInstaller apiBaseUrl={api} release={r}/>; }};
  const content=<>
    <div className="store-hero"><div><span className="eyebrow"><span className="pulse"/> HENDY SOFTWARE DISTRIBUTION</span><h1>Phần mềm bạn cần.<br/><em>Đúng phiên bản.</em></h1><p>Kho phát hành chính thức, liên kết tải có thời hạn và metadata minh bạch cho từng nền tảng.</p><div className="hero-meta"><span>✦ Kiểm soát phiên bản</span><span>⌁ Link tải hết hạn tự động</span></div></div><div className="hero-orbit"><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="orbit-core"><span>H</span></div><div className="orbit-chip chip-a">APK</div><div className="orbit-chip chip-b">EXE</div><div className="orbit-chip chip-c">iOS</div></div></div>
    <div className="section-head"><div><span className="eyebrow">RELEASE LIBRARY</span><h2>Bản phát hành mới nhất</h2></div><StatusBadge status={busy?"warning":error?"error":"success"}>{busy?"Đang tải":error?"Chưa kết nối API":`${releases.length} bản phát hành`}</StatusBadge></div>
    <div className="filter-row">{(["all","android","ios","windows","macos"] as const).map(p=><button key={p} className={platform===p?"filter active":"filter"} onClick={()=>setPlatform(p)}>{({all:"Tất cả",android:"Android",ios:"iOS",windows:"Windows",macos:"macOS"})[p]}</button>)}<span className="device-note">Thiết bị: <b>{device.platform}</b></span></div>
    {error&&!releases.length?<div className="notice"><b>Chưa nhận được dữ liệu từ backend.</b><p>{error} Kiểm tra API URL, CORS và Cloudflare Worker.</p></div>:null}
    {busy?<div className="release-grid">{[1,2,3].map(n=><div className="release-card skeleton" key={n}/>)}</div>:visible.length?<div className="release-grid">{visible.map(r=><article className="release-card" key={r.id}><div className={`app-icon icon-${r.platform}`}>{({android:"A",ios:"●",windows:"⊞",macos:"⌘"})[r.platform]}</div><div className="release-platform">{r.platform.toUpperCase()} · {r.format.toUpperCase()}</div><h3>{r.title}</h3><p className="release-changelog">{r.changelog||"Bản phát hành chính thức."}</p><div className="release-meta"><span>v{r.version}</span><span>{r.sizeBytes?`${(r.sizeBytes/1024/1024).toFixed(1)} MB`:"Dung lượng chưa rõ"}</span></div><div className="release-action">{releaseAction(r)}</div></article>)}</div>:!error?<div className="empty-library"><span>✧</span><h3>Chưa có bản phát hành công khai</h3><p>Khi quản trị viên xuất bản bản build, nó sẽ xuất hiện tại đây.</p></div>:null}
    <footer className="store-footer"><span>© {new Date().getFullYear()} Hendy App Store</span><span>Secure distribution · Cloudflare Edge</span></footer>
  </>;
  return device.formFactor==="mobile"||device.formFactor==="tablet"?<MobileAppStoreLayout>{content}</MobileAppStoreLayout>:<DesktopPortalLayout>{content}</DesktopPortalLayout>;
}
