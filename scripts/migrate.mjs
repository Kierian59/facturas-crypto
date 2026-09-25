// Applique les migrations Prisma pendant le build (Vercel).
// Utilise la connexion directe Neon si elle existe (les migrations passent mal par le pooler).
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] Pas de DATABASE_URL : migrations ignorées.");
  process.exit(0);
}
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});
