import "./style.css";
type Platform = "windows" | "android" | "ios";
type Release = { id?: string; name?: string; version: string; build?: number; platform: Platform; channel?: string; releaseDate?: string; fileSize?: number; downloadUrl?: string; sha256?: string; releaseNotes?: string; mandatory?: boolean };
const apps: { id: Platform; name: string; subtitle: string; icon: string; detail: string }[] = [
  {id:"windows",name:"Hendy Tools for Windows",subtitle:"DESKTOP · X64",icon:"▣",detail:"Bộ công cụ tối ưu và quản lý cho máy tính Windows."},
  {id:"android",name:"Hendy Tools Mobile",subtitle:"ANDROID · APK",icon:"◉",detail:"Trải nghiệm công cụ Hendy trên thiết bị Android."},
  {id:"ios",name:"Hendy Tools for iOS",subtitle:"IOS · TESTFLIGHT",icon:"◇",detail:"Thông tin kênh thử nghiệm iOS khi có bản phát hành hợp lệ."}
];
let releases: Release[] = [];
let activeFilter = "all";
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function escapeHtml(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!)); }
function formatSize(bytes?: number): string { if (!bytes || bytes < 1) return "Chưa có gói tải"; const units=["B","KB","MB","GB"]; let n=bytes,i=0; while(n>=1024&&i<units.length-1){n/=1024;i++;} return `${n.toFixed(i?1:0)} ${units[i]}`; }
function renderApps() {
  const filtered = apps.filter(app => activeFilter === "all" || app.id === activeFilter);
  $("#app-grid").innerHTML = filtered.map(app => {
    const release = releases.filter(r => r.platform === app.id).sort((a,b)=>(b.build||0)-(a.build||0))[0];
    const available = Boolean(release?.downloadUrl && /^https:\/\//i.test(release.downloadUrl));
    return `<article class="app-card"><div class="app-card-top"><span class="app-icon">${app.icon}</span><span class="platform-tag">${app.subtitle}</span></div><h3>${app.name}</h3><p>${app.detail}</p><div class="app-version"><span>Phiên bản</span><b>${release ? escapeHtml(release.version) : "Chưa phát hành"}</b></div><div class="app-card-bottom"><span class="file-size">${formatSize(release?.fileSize)}</span>${available ? `<a class="button button-small button-primary" href="${escapeHtml(release!.downloadUrl)}" rel="noopener noreferrer">Tải xuống ↗</a>` : `<button class="button button-small button-disabled" disabled>Chưa có tệp</button>`}</div>${release?.sha256 ? `<details class="hash-details"><summary>SHA-256</summary><code>${escapeHtml(release.sha256)}</code></details>` : ""}</article>`;
  }).join("");
}
async function loadData() {
  const status = $("#api-status"); status.textContent = "Đang kiểm tra…";
  try {
    const [health, releaseResponse] = await Promise.all([fetch("/api/health",{headers:{accept:"application/json"}}),fetch("/api/releases",{headers:{accept:"application/json"}})]);
    if (!health.ok || !releaseResponse.ok) throw new Error("API response error");
    const releaseData = await releaseResponse.json() as { releases?: Release[] };
    releases = Array.isArray(releaseData.releases) ? releaseData.releases : [];
    status.textContent = "Đang hoạt động"; status.classList.add("healthy");
    $("#admin-summary").textContent = `${releases.length} bản phát hành được API trả về · ${new Set(releases.map(r=>r.platform)).size} nền tảng`;
  } catch {
    releases = []; status.textContent = "Chưa kết nối API"; status.classList.remove("healthy");
    $("#admin-summary").textContent = "Không lấy được dữ liệu API. Hãy kiểm tra triển khai backend và /api/health.";
  }
  renderApps();
}
document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
  button.classList.add("active"); activeFilter = button.dataset.filter || "all"; renderApps();
}));
$("#refresh-status").addEventListener("click", () => void loadData());
$("#admin-toggle").addEventListener("click", () => { $("#admin-panel").hidden = false; $("#admin-panel").scrollIntoView({behavior:"smooth"}); });
$("#close-admin").addEventListener("click", () => { $("#admin-panel").hidden = true; });
$("#year").textContent = String(new Date().getFullYear());
renderApps(); void loadData();
