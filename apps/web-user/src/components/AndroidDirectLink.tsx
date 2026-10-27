import type { AppRelease } from "@hendy/types"; import { DownloadButton } from "./DownloadButton";
export function AndroidDirectLink({apiBaseUrl,release}:{apiBaseUrl:string;release:AppRelease}){return <DownloadButton apiBaseUrl={apiBaseUrl} release={release} label={release.format==="aab"?"Tải AAB":"Tải APK đã ký"}/>}
