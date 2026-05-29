/**
 * Generátor JWT klíčů pro Supabase Self-Hosted
 * Použití: node scripts/generate-keys.mjs <JWT_SECRET>
 *
 * Výstup zkopíruj do:
 *   - docker/supabase/.env  → ANON_KEY a SERVICE_ROLE_KEY
 *   - .env                  → NEXT_PUBLIC_SUPABASE_ANON_KEY a SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from "crypto";

const secret = process.argv[2];

if (!secret || secret.length < 32) {
  console.error(
    "Chyba: JWT_SECRET musí mít alespoň 32 znaků.\n" +
      "Použití: node scripts/generate-keys.mjs <JWT_SECRET>\n\n" +
      "Tip — vygeneruj náhodný secret:\n" +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
  process.exit(1);
}

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function generateJWT(payload, jwtSecret) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64url(header);
  const payloadB64 = base64url(payload);
  const message = `${headerB64}.${payloadB64}`;
  const signature = crypto
    .createHmac("sha256", jwtSecret)
    .update(message)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${message}.${signature}`;
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 5 * 365 * 24 * 60 * 60; // 5 let

const anonKey = generateJWT(
  { role: "anon", iss: "supabase", iat: now, exp },
  secret
);

const serviceKey = generateJWT(
  { role: "service_role", iss: "supabase", iat: now, exp },
  secret
);

console.log("\n=== Zkopíruj tyto hodnoty do docker/supabase/.env a .env ===\n");
console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
console.log("\n============================================================\n");
