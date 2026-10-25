import { existsSync, rmSync, statSync } from "node:fs";

for (const file of ["dist/index.html", "dist/_worker.js", "dist/_routes.json"]) {
  if (!existsSync(file) || statSync(file).size === 0) {
    throw new Error(`Missing or empty Pages deployment artifact: ${file}`);
  }
}
rmSync("dist/admin.html", { force: true });
if (existsSync("dist/admin.html")) throw new Error("Admin HTML must not be included in the Pages artifact.");
console.log("Pages output validated; private Admin HTML excluded.");
