import { hash, verify } from "@node-rs/argon2";

export const hashSecret = (secret: string): Promise<string> => hash(secret, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

export async function verifySecret(stored: string, secret: string): Promise<boolean> {
  try {
    return await verify(stored, secret);
  } catch {
    return false;
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function newFamilyCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3).join("")}`;
}

export function normalizeFamilyCode(code: string): string {
  const raw = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 6 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
}
