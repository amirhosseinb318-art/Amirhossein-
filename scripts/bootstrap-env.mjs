#!/usr/bin/env node
/** Creates .env.local with strong local secrets if it does not exist. Never overwrites. */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, ".env.local");

if (existsSync(target)) {
  console.log(".env.local already exists — leaving it untouched.");
  process.exit(0);
}

const example = readFileSync(path.join(root, ".env.example"), "utf8");
const demoPassword = `radar-${randomBytes(6).toString("hex")}`;

const content = example
  .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${randomBytes(48).toString("base64url")}`)
  .replace(/^CRON_SECRET=.*$/m, `CRON_SECRET=${randomBytes(24).toString("base64url")}`)
  .replace(/^DEMO_SEED_PASSWORD=.*$/m, `DEMO_SEED_PASSWORD=${demoPassword}`);

writeFileSync(target, content, { mode: 0o600 });
console.log("Created .env.local with generated secrets. Demo password:\n");
console.log(`  admin@demo.local / ${demoPassword}\n`);
console.log("Demo accounts: admin@demo.local, analyst@demo.local, viewer@demo.local");
