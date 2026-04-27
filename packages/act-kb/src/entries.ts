import federalPacificStabLokPanel from './entries/federal_pacific_stab_lok_panel.json';
import knobAndTubeOpenSplice from './entries/knob_and_tube_open_splice.json';
import aluminumBranchCircuit from './entries/aluminum_branch_circuit.json';
import openNeutralMultiwireBranch from './entries/open_neutral_multiwire_branch.json';
import missingBondSubpanel from './entries/missing_bond_subpanel.json';

import type { KBEntry } from './types';

export const ELECTRICAL_KB_ENTRIES: KBEntry[] = [
  federalPacificStabLokPanel as KBEntry,
  knobAndTubeOpenSplice as KBEntry,
  aluminumBranchCircuit as KBEntry,
  openNeutralMultiwireBranch as KBEntry,
  missingBondSubpanel as KBEntry,
];
