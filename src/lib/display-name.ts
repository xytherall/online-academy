/**
 * A profile's display name wherever a person is greeted or identified:
 * `full_name` when set, otherwise the email. Never both, never invented
 * (CLAUDE.md: no fake data) — `full_name` already comes from the
 * application on accept or the required "Add student" field.
 */
export function displayName(profile: { full_name: string | null; email: string }): string {
  return profile.full_name?.trim() || profile.email;
}
