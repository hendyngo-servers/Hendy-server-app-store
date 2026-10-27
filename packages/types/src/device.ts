export type DevicePlatform = "ios" | "android" | "windows" | "macos" | "linux" | "other";
export type DeviceFormFactor = "mobile" | "tablet" | "desktop" | "unknown";
export interface DeviceInfo { platform: DevicePlatform; formFactor: DeviceFormFactor; userAgent: string; }
export function detectDevice(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();
  let platform: DevicePlatform = "other";
  if (/iphone|ipad|ipod/.test(ua)) platform = "ios";
  else if (/android/.test(ua)) platform = "android";
  else if (/windows/.test(ua)) platform = "windows";
  else if (/macintosh|mac os/.test(ua)) platform = "macos";
  else if (/linux/.test(ua)) platform = "linux";
  const formFactor: DeviceFormFactor = /ipad|tablet/.test(ua) ? "tablet" : /mobile|iphone|ipod|android/.test(ua) ? "mobile" : /windows|macintosh|linux/.test(ua) ? "desktop" : "unknown";
  return { platform, formFactor, userAgent };
}
