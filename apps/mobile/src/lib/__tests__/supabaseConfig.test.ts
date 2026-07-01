import { computeSupabaseConfig } from '../supabaseConfig';

describe('computeSupabaseConfig', () => {
  it('is unconfigured when both env vars are unset (demo flow stays on)', () => {
    expect(computeSupabaseConfig(undefined, undefined)).toBe('unconfigured');
  });

  it('is unconfigured for empty or whitespace-only values', () => {
    expect(computeSupabaseConfig('', '')).toBe('unconfigured');
    expect(computeSupabaseConfig('   ', '  ')).toBe('unconfigured');
  });

  it('is misconfigured when exactly one var is set (typo or forgotten EAS entry)', () => {
    expect(computeSupabaseConfig('https://real.supabase.co', undefined)).toBe('misconfigured');
    expect(computeSupabaseConfig(undefined, 'sb_publishable_real')).toBe('misconfigured');
    expect(computeSupabaseConfig('https://real.supabase.co', '')).toBe('misconfigured');
  });

  it('is misconfigured for an unparseable URL like the .env.example placeholder', () => {
    expect(computeSupabaseConfig('https://<project>.supabase.co', 'sb_publishable_x')).toBe(
      'misconfigured',
    );
    expect(computeSupabaseConfig('not a url', 'sb_publishable_x')).toBe('misconfigured');
  });

  it('is configured when both values are present and the URL parses', () => {
    expect(computeSupabaseConfig('https://real.supabase.co', 'sb_publishable_real')).toBe(
      'configured',
    );
  });
});
