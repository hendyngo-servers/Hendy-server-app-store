#!/usr/bin/env node
/** Reports certificate expiry metadata only; it never imports, re-signs, or uploads private keys. */
import { readFile } from "node:fs/promises";
const path = process.argv[2] ?? "cert-metadata.json";
try {
  const records = JSON.parse(await readFile(path, "utf8"));
  const now = Date.now();
  for (const cert of records) {
    if (!cert.label || !cert.expiresAt) continue;
    const days = Math.ceil((Date.parse(cert.expiresAt) - now) / 86400000);
    const status = days < 0 ? "EXPIRED" : days <= 30 ? "RENEW SOON" : "OK";
    console.log(`${status}	${cert.label}	${days} day(s) remaining`);
  }
} catch (error) {
  console.error(`Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
