#!/usr/bin/env node
/** Export D1 SQL, upload it to a private R2 backup bucket, then remove the local temp file. */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const bucket = process.env.BACKUP_BUCKET ?? "hendyappstore-backups";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const filename = `hendy-d1-backup-${stamp}.sql`;
const tempDir = await mkdtemp(join(tmpdir(), "hendy-d1-backup-"));
const exportPath = join(tempDir, filename);
const config = "workers/backend-api/wrangler.toml";

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "wrangler", ...args], {
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`wrangler exited with code ${code}`)));
  });
}

try {
  await run(["d1", "export", "hendy-appstore-db", "--remote", "--skip-confirmation", "--output", exportPath, "--config", config]);
  const objectKey = `db-backups/${basename(exportPath)}`;
  await run(["r2", "object", "put", `${bucket}/${objectKey}`, "--file", exportPath, "--remote", "--content-type", "application/sql", "--config", config]);
  console.log(`Backup uploaded to private R2 object: ${bucket}/${objectKey}`);
} catch (error) {
  console.error(`D1 backup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
