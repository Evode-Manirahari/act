import {
  ELECTRICAL_SYSTEM_PROMPT,
  HVAC_SYSTEM_PROMPT,
  PLUMBING_SYSTEM_PROMPT,
  WELDING_SYSTEM_PROMPT,
} from '../index';

describe('System Prompts — exports', () => {
  it('ELECTRICAL_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof ELECTRICAL_SYSTEM_PROMPT).toBe('string');
    expect(ELECTRICAL_SYSTEM_PROMPT.length).toBeGreaterThan(500);
  });

  it('HVAC_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof HVAC_SYSTEM_PROMPT).toBe('string');
    expect(HVAC_SYSTEM_PROMPT.length).toBeGreaterThan(500);
  });

  it('PLUMBING_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof PLUMBING_SYSTEM_PROMPT).toBe('string');
    expect(PLUMBING_SYSTEM_PROMPT.length).toBeGreaterThan(500);
  });

  it('WELDING_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof WELDING_SYSTEM_PROMPT).toBe('string');
    expect(WELDING_SYSTEM_PROMPT.length).toBeGreaterThan(500);
  });

  it('ELECTRICAL prompt includes safety markers', () => {
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('⚠️');
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('🔧');
    expect(ELECTRICAL_SYSTEM_PROMPT).toContain('📋');
  });

  it('HVAC prompt includes refrigerant guidance', () => {
    expect(HVAC_SYSTEM_PROMPT).toContain('EPA 608');
    expect(HVAC_SYSTEM_PROMPT).toContain('R-410A');
    expect(HVAC_SYSTEM_PROMPT).toContain('capacitor');
  });

  it('PLUMBING prompt includes pipe materials and safety', () => {
    expect(PLUMBING_SYSTEM_PROMPT).toContain('PEX');
    expect(PLUMBING_SYSTEM_PROMPT).toContain('P-trap');
    expect(PLUMBING_SYSTEM_PROMPT).toContain('T&P');
  });

  it('WELDING prompt includes process and safety guidance', () => {
    expect(WELDING_SYSTEM_PROMPT).toContain('E7018');
    expect(WELDING_SYSTEM_PROMPT).toContain('preheat');
    expect(WELDING_SYSTEM_PROMPT).toContain('Arc flash');
  });

  it('all prompts contain ACT persona header', () => {
    [ELECTRICAL_SYSTEM_PROMPT, HVAC_SYSTEM_PROMPT, PLUMBING_SYSTEM_PROMPT, WELDING_SYSTEM_PROMPT].forEach((prompt) => {
      expect(prompt).toContain('You are ACT');
      expect(prompt).toContain('ACT is with you');
    });
  });

  it('all prompts are distinct from each other', () => {
    const prompts = [ELECTRICAL_SYSTEM_PROMPT, HVAC_SYSTEM_PROMPT, PLUMBING_SYSTEM_PROMPT, WELDING_SYSTEM_PROMPT];
    const unique = new Set(prompts);
    expect(unique.size).toBe(4);
  });
});
