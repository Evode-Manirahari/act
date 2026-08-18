/**
 * Field Instrument design-system invariants.
 *
 * A static guard (fs scan — no RN/expo imports, runs under the node test env)
 * for the rules that are easy to violate by habit and invisible until someone
 * looks at a device:
 *  - No `fontWeight` on app text. RN does not synthesize weight for the custom
 *    Geist family, so `fontWeight` silently renders the wrong weight/font — you
 *    must pick the weight by named family (fonts.bold / ActText weight="bold").
 *  - Radii stay squared (md=6 default, chips sm=4); there is no pill token.
 *  - The type scale keeps its named variants with numeric sizes.
 *  - No raw hex outside theme/colors — every semantic family is a full ramp
 *    (base/Light/Border/Ink) there, so components never invent a shade.
 *  - Nothing renders below the one micro-label size; sub-10px mono is
 *    unreadable on a bright roof, which is the point of the whole system.
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

  it('radii stay squared — md default 6, chips sm 4, lg 8 is the largest', () => {
    expect(radii.sm).toBe(4);
    expect(radii.md).toBe(6);
    expect(radii.lg).toBe(8);
    // No pill token exists at all, so `radii.full` can't be reached for by habit.
    expect(Math.max(...Object.values(radii))).toBe(8);
  });

  it('no raw hex color outside the palette — semantics live in theme/colors', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (/theme\/colors\.ts$/.test(file)) continue;
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/'#[0-9A-Fa-f]{3,8}'/.test(line)) offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('no type is smaller than the one micro-label size (sunlight legibility)', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const m = /fontSize: (\d+(?:\.\d+)?)/.exec(line);
          if (m && Number(m[1]) < typo.labelSmallStyle.fontSize!) {
            offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });

  it('type scale exposes the named variants with numeric sizes', () => {
    for (const key of ['display', 'h1', 'h2', 'bodyStrong', 'body', 'small'] as const) {
      expect(typeof typo.type[key].fontSize).toBe('number');
    }
  });
});
