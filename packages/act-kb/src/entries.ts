import dirtyFilterFrozenCoil from './entries/dirty_filter_frozen_coil.json';
import noCWireSmartThermostat from './entries/no_c_wire_smart_thermostat.json';
import badDualRunCapacitor from './entries/bad_dual_run_capacitor.json';
import condensateDrainClog from './entries/condensate_drain_clog.json';
import furnacePressureSwitchTrip from './entries/furnace_pressure_switch_trip.json';

import type { KBEntry } from './types';

export const HVAC_KB_ENTRIES: KBEntry[] = [
  dirtyFilterFrozenCoil as KBEntry,
  noCWireSmartThermostat as KBEntry,
  badDualRunCapacitor as KBEntry,
  condensateDrainClog as KBEntry,
  furnacePressureSwitchTrip as KBEntry,
];
