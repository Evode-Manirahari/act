import federalPacificStabLokPanel from './entries/federal_pacific_stab_lok_panel.json';
import knobAndTubeOpenSplice from './entries/knob_and_tube_open_splice.json';
import aluminumBranchCircuit from './entries/aluminum_branch_circuit.json';
import openNeutralMultiwireBranch from './entries/open_neutral_multiwire_branch.json';
import missingBondSubpanel from './entries/missing_bond_subpanel.json';

import r410aLowChargeFrostSuction from './entries/r410a_low_charge_frost_suction.json';
import lockedRotorFailedRunCapacitor from './entries/locked_rotor_failed_run_capacitor.json';
import restrictedAirflowMimicsLowCharge from './entries/restricted_airflow_mimics_low_charge.json';
import txvDiagnoseWithSubcooling from './entries/txv_diagnose_with_subcooling.json';
import thermostatMissingCWire from './entries/thermostat_missing_c_wire.json';

import type { KBEntry, Trade } from './types';

export const ELECTRICAL_KB_ENTRIES: KBEntry[] = [
  federalPacificStabLokPanel as KBEntry,
  knobAndTubeOpenSplice as KBEntry,
  aluminumBranchCircuit as KBEntry,
  openNeutralMultiwireBranch as KBEntry,
  missingBondSubpanel as KBEntry,
];

export const HVAC_KB_ENTRIES: KBEntry[] = [
  r410aLowChargeFrostSuction as KBEntry,
  lockedRotorFailedRunCapacitor as KBEntry,
  restrictedAirflowMimicsLowCharge as KBEntry,
  txvDiagnoseWithSubcooling as KBEntry,
  thermostatMissingCWire as KBEntry,
];

export const ALL_KB_ENTRIES: KBEntry[] = [...HVAC_KB_ENTRIES, ...ELECTRICAL_KB_ENTRIES];

export function entriesForTrade(trade: Trade): KBEntry[] {
  switch (trade) {
    case 'hvac':
      return HVAC_KB_ENTRIES;
    case 'electrical':
      return ELECTRICAL_KB_ENTRIES;
  }
}
