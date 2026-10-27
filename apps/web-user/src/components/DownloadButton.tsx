import { useState } from "react"; import type { AppRelease } from "@hendy/types";
export function DownloadButton({apiBaseUrl,release,label="Tải bản phát hành"}:{apiBaseUrl:string;release:AppRelease;label?:string}) {
 const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 async function download(){setBusy(true);setError("");try{const res=await fetch(`${apiBaseUrl}/api/releases/${encodeURIComponent(release.id)}/signed-url`,{credentials:"omit"});if(!res.ok)throw new Error(res.status===404?"Bản phát hành không tồn tại hoặc chưa được công khai.":`Không thể tạo link tải (${res.status}).`);const data=await res.json() as {url:string};window.location.assign(data.url);}catch(e){setError(e instanceof Error?e.message:"Có lỗi khi tạo link tải.");}finally{setBusy(false);}}
 return <div className="download-wrap"><button className="download-button" onClick={download} disabled={busy}>{busy?"Đang tạo link…":label}<span>↗</span></button>{error&&<small className="inline-error">{error}</small>}</div>;
}
