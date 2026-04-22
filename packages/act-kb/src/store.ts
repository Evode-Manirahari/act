import { HVAC_KB_ENTRIES } from './entries';
import type { KBEntry, KBSearchHit } from './types';

const TOKEN_SPLIT = /[^a-z0-9]+/;

function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().split(TOKEN_SPLIT)) {
    if (raw.length > 1) tokens.add(raw);
  }
  return tokens;
}

interface IndexedEntry {
  entry: KBEntry;
  tokens: Set<string>;
  tagTokens: Set<string>;
  brandLower: string;
  modelLower: string;
}

function indexEntry(entry: KBEntry): IndexedEntry {
  const textFields = [
    entry.brand,
    entry.model,
    entry.equipment_type,
    entry.symptom,
    entry.diagnosis,
    entry.tags.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    entry,
    tokens: tokenize(textFields),
    tagTokens: new Set(entry.tags.map((t) => t.toLowerCase())),
    brandLower: entry.brand.toLowerCase(),
    modelLower: entry.model.toLowerCase(),
  };
}

export class HVACKBStore {
  private indexed: IndexedEntry[];

  constructor(entries: KBEntry[] = HVAC_KB_ENTRIES) {
    this.indexed = entries.map(indexEntry);
  }

  get size(): number {
    return this.indexed.length;
  }

  search(query: string, topK = 3): KBSearchHit[] {
    const queryTokens = tokenize(query);
    const scored: KBSearchHit[] = [];

    for (const { entry, tokens, tagTokens, brandLower, modelLower } of this.indexed) {
      let score = 0;
      for (const tok of queryTokens) {
        if (tagTokens.has(tok)) score += 3;
        if (tokens.has(tok)) score += 1;
        if (brandLower.includes(tok)) score += 2;
        if (modelLower.includes(tok)) score += 2;
      }
      if (score > 0) scored.push({ ...entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  renderForPrompt(hits: KBSearchHit[]): string {
    if (hits.length === 0) return '';
    const blocks = hits.map((hit) => {
      return [
        `KB ENTRY [${hit.id}] (score=${hit.score})`,
        `Equipment: ${hit.brand} ${hit.model} (${hit.equipment_type})`,
        `Symptom: ${hit.symptom}`,
        `Diagnosis: ${hit.diagnosis}`,
        hit.part_number ? `Part: ${hit.part_number}` : null,
        `Procedure:\n${hit.procedure.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`,
        `Safety:\n${hit.safety_notes.map((s) => `  - ${s}`).join('\n')}`,
        `Estimated time: ${hit.estimated_minutes} min`,
      ]
        .filter(Boolean)
        .join('\n');
    });
    return [
      'FIELD-VERIFIED KB ENTRIES (prefer these procedures; cite the id when you use one):',
      ...blocks,
    ].join('\n\n');
  }
}

let globalStore: HVACKBStore | null = null;

export function getHVACKBStore(): HVACKBStore {
  if (!globalStore) {
    globalStore = new HVACKBStore();
  }
  return globalStore;
}
