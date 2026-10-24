#!/usr/bin/env node
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

if (!process.argv.includes("--confirm")) {
  console.error("Refusing to delete demo data without --confirm.");
  process.exit(1);
}

const dir = process.env.LOCAL_DATA_DIR?.trim() || path.join(process.cwd(), ".data");
const file = path.join(dir, "store.json");
if (existsSync(file)) {
  rmSync(file);
  console.log(`Removed ${file}. The next request will reseed demo data.`);
} else {
  console.log("No local demo store found.");
}
