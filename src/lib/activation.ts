import crypto from "crypto";

/** Znaky bez záměnných (0/O, 1/I/L) pro snadné přepsání člověkem. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUP = 4;
const GROUPS = 3;

/** Vygeneruje aktivační kód ve formátu XXXX-XXXX-XXXX. */
export function generateActivationCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let part = "";
    for (let i = 0; i < GROUP; i++) {
      const idx = crypto.randomInt(0, ALPHABET.length);
      part += ALPHABET[idx];
    }
    groups.push(part);
  }
  return groups.join("-");
}

/** Normalizuje uživatelský vstup kódu (velká písmena, jednotné pomlčky). */
export function normalizeActivationCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** Platnost aktivačního kódu od teď. */
export function activationExpiry(days = 14): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
