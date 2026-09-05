/**
 * Technician names for live mode, until act-api has a users roster.
 *
 * ACT_TECH_ROSTER is a JSON object keyed by act-api user id:
 *   {"b167e8de-…": {"name": "Ray Mercado", "role": "senior_tech"}}
 * or, shorter, {"b167e8de-…": "Ray Mercado"}. Set by the ops lead, read on
 * the server only. Anyone missing shows as an id prefix.
 */
export interface RosterEntry {
  name: string;
  role: string | null;
}

export function rosterFromEnv(raw: string | undefined): Map<string, RosterEntry> {
  const roster = new Map<string, RosterEntry>();
  if (!raw?.trim()) return roster;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return roster;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return roster;
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      roster.set(id, { name: value.trim(), role: null });
    } else if (typeof value === 'object' && value !== null) {
      const name = (value as { name?: unknown }).name;
      const role = (value as { role?: unknown }).role;
      if (typeof name === 'string' && name.trim()) {
        roster.set(id, { name: name.trim(), role: typeof role === 'string' && role ? role : null });
      }
    }
  }
  return roster;
}
