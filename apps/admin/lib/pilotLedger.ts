'use client';

import {
  emptyLedger,
  isPilot0SlotId,
  type Pilot0Ledger,
  type Pilot0Slot,
  type Pilot0SlotId,
} from '@act/domain';

const KEY = 'act-pilot0-ledger-v1';

function asSlot(id: Pilot0SlotId, raw: unknown): Pilot0Slot {
  const empty = emptyLedger().slots[id];
  if (typeof raw !== 'object' || raw === null) return empty;
  const row = raw as Partial<Pilot0Slot>;
  return {
    ...empty,
    momentId: typeof row.momentId === 'string' ? row.momentId : '',
    cardId: typeof row.cardId === 'string' ? row.cardId : '',
    debriefMinutes:
      typeof row.debriefMinutes === 'number' && Number.isFinite(row.debriefMinutes)
        ? row.debriefMinutes
        : null,
    expertEdits:
      typeof row.expertEdits === 'number' && Number.isFinite(row.expertEdits) ? row.expertEdits : null,
    unsupportedClaims:
      typeof row.unsupportedClaims === 'number' && Number.isFinite(row.unsupportedClaims)
        ? row.unsupportedClaims
        : null,
    friction: typeof row.friction === 'string' ? row.friction : '',
    hiddenJudgment: row.hiddenJudgment === true ? true : row.hiddenJudgment === false ? false : null,
    learnerCommitted: row.learnerCommitted === true,
    variantScheduled: row.variantScheduled === true,
    willingToRepeat: row.willingToRepeat === true ? true : row.willingToRepeat === false ? false : null,
  };
}

export function readPilot0Ledger(): Pilot0Ledger {
  const base = emptyLedger();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return base;
    const row = parsed as Partial<Pilot0Ledger>;
    const slots = { ...base.slots };
    if (row.slots && typeof row.slots === 'object') {
      for (const [id, slot] of Object.entries(row.slots)) {
        if (isPilot0SlotId(id)) slots[id] = asSlot(id, slot);
      }
    }
    return {
      startedOn: typeof row.startedOn === 'string' ? row.startedOn : '',
      operator: typeof row.operator === 'string' ? row.operator : '',
      managerAction: typeof row.managerAction === 'string' ? row.managerAction : '',
      juniorsSayCredible:
        row.juniorsSayCredible === true ? true : row.juniorsSayCredible === false ? false : null,
      commitsDistinguish:
        row.commitsDistinguish === true ? true : row.commitsDistinguish === false ? false : null,
      wantsFollowOn: row.wantsFollowOn === true ? true : row.wantsFollowOn === false ? false : null,
      slots,
    };
  } catch {
    return base;
  }
}

export function writePilot0Ledger(ledger: Pilot0Ledger): void {
  window.localStorage.setItem(KEY, JSON.stringify(ledger));
}
