export { ACT_SYSTEM_PROMPT } from './system';
export { ACT_ELECTRICAL_SYSTEM_PROMPT } from './electrical';
export { ACT_HVAC_SYSTEM_PROMPT } from './hvac';

import { ACT_HVAC_SYSTEM_PROMPT } from './hvac';
import { ACT_ELECTRICAL_SYSTEM_PROMPT } from './electrical';

export type ActTrade = 'hvac' | 'electrical';

const TRADE_PROMPTS: Record<ActTrade, string> = {
  hvac: ACT_HVAC_SYSTEM_PROMPT,
  electrical: ACT_ELECTRICAL_SYSTEM_PROMPT,
};

/** Return the ACT field-copilot prompt for `trade`. Falls back to HVAC for unknown trades. */
export function getActPromptForTrade(trade: string): string {
  return TRADE_PROMPTS[trade.toLowerCase() as ActTrade] ?? ACT_HVAC_SYSTEM_PROMPT;
}
