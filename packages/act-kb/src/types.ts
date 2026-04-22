export type EquipmentType =
  | 'furnace'
  | 'air-handler'
  | 'ac-condenser'
  | 'heat-pump'
  | 'mini-split'
  | 'thermostat'
  | 'package-unit';

export interface KBEntry {
  id: string;
  brand: string;
  model: string;
  equipment_type: EquipmentType | string;
  symptom: string;
  diagnosis: string;
  part_number: string | null;
  procedure: string[];
  safety_notes: string[];
  estimated_minutes: number;
  tags: string[];
}

export interface KBSearchHit extends KBEntry {
  score: number;
}
