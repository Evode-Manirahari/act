import { ELECTRICAL_SYSTEM_PROMPT } from '../electrical';

describe('ELECTRICAL_SYSTEM_PROMPT', () => {
  it('should be a non-empty string', () => {
    expect(typeof ELECTRICAL_SYSTEM_PROMPT).toBe('string');
    expect(ELECTRICAL_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should be greater than 500 words', () => {
    const wordCount = ELECTRICAL_SYSTEM_PROMPT.split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(500);
  });

  it('should contain key electrical concepts', () => {
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('NEC');
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('GFCI');
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('knob-and-tube');
  });

  it('should contain safety formatting markers', () => {
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('⚠️');
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('✅');
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('🔧');
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('📋');
  });
});
