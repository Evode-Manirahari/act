/**
 * Field Instrument design-system invariants.
 *
 * A static guard (fs scan — no RN/expo imports, runs under the node test env)
 * for the rules that are easy to violate by habit and invisible until someone
 * looks at a device:
 *  - No `fontWeight` on app text. RN does not synthesize weight for the custom
 *    Geist family, so `fontWeight` silently renders the wrong weight/font — you
 *    must pick the weight by named family (fonts.bold / ActText weight="bold").
 *  - Radii stay squared (md=6 default, chips sm=4); full 999 is toggle-only.
 *  - The type scale keeps its named variants with numeric sizes.
 */
import * as fs from 'fs';
import * as path from 'path';

import { radii } from '../tokens/radii';
import * as typo from '../tokens/typography';

const SRC = path.resolve(__dirname, '../../');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

describe('Field Instrument design invariants', () => {
  it('no app style uses fontWeight (RN does not synthesize weight for Geist)', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/fontWeight\s*:/.test(line)) offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('radii stay squared — md default 6, chips sm 4, full reserved for toggles', () => {
    expect(radii.sm).toBe(4);
    expect(radii.md).toBe(6);
    expect(radii.lg).toBe(8);
    expect(radii.full).toBe(999);
  });

  it('type scale exposes the named variants with numeric sizes', () => {
    for (const key of ['display', 'h1', 'h2', 'bodyStrong', 'body', 'small'] as const) {
      expect(typeof typo.type[key].fontSize).toBe('number');
    }
  });
});
