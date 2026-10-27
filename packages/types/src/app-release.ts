export type ReleasePlatform = "android" | "ios" | "windows" | "macos";
export type ReleaseFormat = "apk" | "aab" | "ipa" | "exe" | "msix" | "dmg" | "pkg";
export interface AppRelease {
  id: string; appId: string; title: string; version: string; platform: ReleasePlatform;
  format: ReleaseFormat; objectKey: string; sizeBytes: number; sha256: string;
  changelog: string; minOsVersion?: string; createdAt: string; published: boolean;
}
export interface SignedDownload { url: string; expiresAt: string; ttlSeconds: number; }
