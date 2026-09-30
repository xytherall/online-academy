/**
 * Suggests a temporary password for an admin to share with a student
 * (SPEC §6: admin sets a temporary password, student must change it on first
 * login). Used by "Add student", "Reset password" and "Accept application".
 *
 * Ambiguous glyphs (I, l, 1, O, 0) are left out so the password survives being
 * read off a phone screen and retyped.
 *
 * This only ever suggests a value the admin can overwrite, and the real
 * strength floor is MIN_PASSWORD_LENGTH in ./validation/auth.ts, enforced
 * server-side — so Math.random() is adequate here. It is not used for tokens,
 * signatures or anything else that must be unguessable by a third party.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const LENGTH = 10;

export function generatePassword(): string {
  let result = "";
  for (let i = 0; i < LENGTH; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}
