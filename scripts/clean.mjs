import { rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
rmSync("release-artifacts", { recursive: true, force: true });
console.log("Removed generated build and release output.");
