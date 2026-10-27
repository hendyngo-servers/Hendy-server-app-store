import { useMemo } from "react";
import { detectDevice } from "@hendy/types";
export function useDeviceDetect() {
  return useMemo(() => detectDevice(typeof navigator === "undefined" ? "" : navigator.userAgent), []);
}
