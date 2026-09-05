/**
 * Work activities: the unit a manager entrusts. A readiness level is set per
 * technician per activity, never per case. Cases and field jobs are bucketed
 * into activities so practice evidence and field evidence land in the same cell.
 *
 * This is a starting HVAC taxonomy, not a schema. A shop will rename and split
 * these; the ids only need to be stable within one account.
 */
export interface WorkActivity {
  id: string;
  label: string;
}

export const HVAC_ACTIVITIES: readonly WorkActivity[] = [
  { id: 'no_cool_split', label: 'No-cool, residential split' },
  { id: 'no_heat_furnace', label: 'No-heat, gas furnace' },
  { id: 'heat_pump', label: 'Heat pump & defrost' },
  { id: 'refrigerant_charge', label: 'Refrigerant charge diagnosis' },
  { id: 'airflow', label: 'Airflow & static pressure' },
  { id: 'electrical_controls', label: 'Electrical & controls' },
  { id: 'rtu_commercial', label: 'Commercial rooftop unit' },
  { id: 'refrigeration', label: 'Refrigeration (walk-in / reach-in)' },
  { id: 'general', label: 'General diagnosis' },
] as const;

export const GENERAL_ACTIVITY_ID = 'general';

const ACTIVITY_ALIASES: Record<string, string> = {
  no_cool: 'no_cool_split',
  'no-cool': 'no_cool_split',
  nocool: 'no_cool_split',
  split: 'no_cool_split',
  split_system: 'no_cool_split',
  residential_split: 'no_cool_split',
  ac: 'no_cool_split',
  air_conditioner: 'no_cool_split',
  no_heat: 'no_heat_furnace',
  'no-heat': 'no_heat_furnace',
  noheat: 'no_heat_furnace',
  furnace: 'no_heat_furnace',
  gas_furnace: 'no_heat_furnace',
  ignition: 'no_heat_furnace',
  flame_sensor: 'no_heat_furnace',
  heat_pump: 'heat_pump',
  'heat-pump': 'heat_pump',
  heatpump: 'heat_pump',
  defrost: 'heat_pump',
  reversing_valve: 'heat_pump',
  charge: 'refrigerant_charge',
  refrigerant: 'refrigerant_charge',
  refrigerant_charge: 'refrigerant_charge',
  subcooling: 'refrigerant_charge',
  superheat: 'refrigerant_charge',
  txv: 'refrigerant_charge',
  airflow: 'airflow',
  static_pressure: 'airflow',
  static: 'airflow',
  blower: 'airflow',
  ductwork: 'airflow',
  filter: 'airflow',
  electrical: 'electrical_controls',
  controls: 'electrical_controls',
  control_board: 'electrical_controls',
  capacitor: 'electrical_controls',
  contactor: 'electrical_controls',
  wiring: 'electrical_controls',
  thermostat: 'electrical_controls',
  rtu: 'rtu_commercial',
  rooftop: 'rtu_commercial',
  rooftop_unit: 'rtu_commercial',
  commercial: 'rtu_commercial',
  economizer: 'rtu_commercial',
  refrigeration: 'refrigeration',
  walk_in: 'refrigeration',
  'walk-in': 'refrigeration',
  reach_in: 'refrigeration',
  'reach-in': 'refrigeration',
  cooler: 'refrigeration',
  freezer: 'refrigeration',
};

const KNOWN_IDS = new Set(HVAC_ACTIVITIES.map((activity) => activity.id));

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isActivityId(value: unknown): value is string {
  return typeof value === 'string' && KNOWN_IDS.has(value);
}

export function activityById(id: string): WorkActivity {
  return (
    HVAC_ACTIVITIES.find((activity) => activity.id === id) ??
    { id, label: id.replace(/_/g, ' ') }
  );
}

/**
 * Bucket free text (tags, system_type, equipment_label) into an activity.
 * Explicit activity ids win; otherwise the first alias hit; otherwise general.
 */
export function inferActivityId(input: {
  tags?: readonly string[] | null;
  systemType?: string | null;
  equipmentLabel?: string | null;
  explicit?: string | null;
}): string {
  if (isActivityId(input.explicit)) return input.explicit;
  const candidates = [
    ...(input.tags ?? []),
    input.systemType ?? '',
    input.equipmentLabel ?? '',
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const key = normalize(raw);
    if (KNOWN_IDS.has(key)) return key;
    if (ACTIVITY_ALIASES[key]) return ACTIVITY_ALIASES[key];
  }
  // Second pass on individual words so "Carrier 3-ton split, low charge" still lands.
  for (const raw of candidates) {
    for (const word of normalize(raw).split(/[^a-z0-9]+/)) {
      if (ACTIVITY_ALIASES[word]) return ACTIVITY_ALIASES[word];
    }
  }
  return GENERAL_ACTIVITY_ID;
}

/** Stable display order: taxonomy order first, unknown ids after, alphabetical. */
export function sortActivityIds(ids: Iterable<string>): string[] {
  const order = new Map(HVAC_ACTIVITIES.map((activity, index) => [activity.id, index]));
  return Array.from(new Set(ids)).sort((a, b) => {
    const ai = order.get(a);
    const bi = order.get(b);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.localeCompare(b);
  });
}
