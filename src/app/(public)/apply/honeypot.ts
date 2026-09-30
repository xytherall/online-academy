/**
 * Name of the application form's honeypot field (SPEC §6).
 *
 * Its own module because both the form and the server action need it, and a
 * "use server" file may only export async functions — a plain constant exported
 * from actions.ts makes the whole module invalid.
 *
 * Deliberately plausible: a form-filling bot is looking for fields worth
 * populating, and "website" looks like one. A real person never sees it.
 */
export const HONEYPOT_FIELD = "website";
