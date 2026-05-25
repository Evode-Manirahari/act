export type Trade = 'hvac' | 'electrical';

export type ElectricalEquipmentType =
  | 'panel'
  | 'breaker'
  | 'branch-circuit'
  | 'junction-box'
  | 'service-equipment'
  | 'subpanel'
  | 'device'
  | 'conduit'
  | 'legacy-wiring';

export type HVACEquipmentType =
  | 'condenser'
  | 'evaporator-coil'
  | 'air-handler'
  | 'furnace'
  | 'heat-pump'
  | 'thermostat'
  | 'refrigerant-circuit'
  | 'capacitor'
  | 'contactor'
  | 'ductwork'
  | 'metering-device';

export type EquipmentType = ElectricalEquipmentType | HVACEquipmentType | string;

export interface KBEntry {
  id: string;
  trade: Trade;
  brand: string;
  model: string;
  equipment_type: EquipmentType;
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
