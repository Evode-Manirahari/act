import { matchOfflineQuery, OFFLINE_KNOWLEDGE } from '../offline';

describe('matchOfflineQuery', () => {
  it('returns null for unrecognized query', () => {
    expect(matchOfflineQuery('what is the weather like today')).toBeNull();
    expect(matchOfflineQuery('hello how are you')).toBeNull();
  });

  it('matches GFCI query', () => {
    const result = matchOfflineQuery('Where is GFCI required?');
    expect(result).not.toBeNull();
    expect(result).toContain('[OFFLINE — Cached]');
    expect(result).toContain('GFCI');
  });

  it('matches AFCI query', () => {
    const result = matchOfflineQuery('do I need an arc fault breaker here?');
    expect(result).not.toBeNull();
    expect(result).toContain('AFCI');
  });

  it('matches knob and tube query', () => {
    const result = matchOfflineQuery('Is this knob-and-tube wiring safe?');
    expect(result).not.toBeNull();
    expect(result).toContain('KNOB-AND-TUBE');
  });

  it('matches aluminum wiring query', () => {
    const result = matchOfflineQuery('I see aluminum wiring, how do I splice it?');
    expect(result).not.toBeNull();
    expect(result).toContain('ALUMINUM');
  });

  it('matches Federal Pacific panel query', () => {
    const result = matchOfflineQuery('This looks like a Federal Pacific panel');
    expect(result).not.toBeNull();
    expect(result).toContain('FEDERAL PACIFIC');
  });

  it('matches double-tap breaker query', () => {
    const result = matchOfflineQuery('There are two wires in one breaker, is that ok?');
    expect(result).toBeNull(); // "two wires" alone won't match — needs "double tap" etc.
    const result2 = matchOfflineQuery('I see a double-tap on this breaker');
    expect(result2).not.toBeNull();
    expect(result2).toContain('DOUBLE-TAPPED');
  });

  it('matches wire gauge query', () => {
    const result = matchOfflineQuery('How do I identify the wire gauge without tools?');
    expect(result).not.toBeNull();
    expect(result).toContain('WIRE GAUGE');
  });

  it('matches cloth insulated wiring query', () => {
    const result = matchOfflineQuery('The wiring has cloth insulation on it');
    expect(result).not.toBeNull();
    expect(result).toContain('[OFFLINE — Cached]');
  });

  it('matches grounding query', () => {
    const result = matchOfflineQuery('How do I identify the ground wire in this old system?');
    expect(result).not.toBeNull();
    expect(result).toContain('GROUNDING');
  });

  it('matches box fill query', () => {
    const result = matchOfflineQuery('How do I calculate box fill?');
    expect(result).not.toBeNull();
    expect(result).toContain('BOX FILL');
  });

  it('is case-insensitive', () => {
    expect(matchOfflineQuery('GFCI OUTLET REQUIRED')).not.toBeNull();
    expect(matchOfflineQuery('gfci outlet required')).not.toBeNull();
    expect(matchOfflineQuery('Gfci Outlet Required')).not.toBeNull();
  });

  it('all 25 topics have at least one matching keyword', () => {
    expect(OFFLINE_KNOWLEDGE).toHaveLength(25);
    OFFLINE_KNOWLEDGE.forEach((entry) => {
      const result = matchOfflineQuery(entry.keywords[0]);
      expect(result).not.toBeNull();
    });
  });
});

describe('matchOfflineQuery — trade filtering', () => {
  it('returns null for HVAC query when filtering by ELECTRICAL', () => {
    const result = matchOfflineQuery('refrigerant type', 'ELECTRICAL');
    expect(result).toBeNull();
  });

  it('returns HVAC answer when filtering by HVAC', () => {
    const result = matchOfflineQuery('what refrigerant does this use', 'HVAC');
    expect(result).not.toBeNull();
    expect(result).toContain('[OFFLINE — Cached]');
    expect(result).toContain('refrigerant');
  });

  it('matches thermostat wiring for HVAC', () => {
    const result = matchOfflineQuery('c wire missing for thermostat', 'HVAC');
    expect(result).not.toBeNull();
    expect(result).toContain('THERMOSTAT WIRING');
  });

  it('matches capacitor for HVAC', () => {
    const result = matchOfflineQuery('run capacitor looks bulging', 'HVAC');
    expect(result).not.toBeNull();
    expect(result).toContain('CAPACITOR');
  });

  it('matches heat exchanger for HVAC', () => {
    const result = matchOfflineQuery('cracked heat exchanger concern', 'HVAC');
    expect(result).not.toBeNull();
    expect(result).toContain('HEAT EXCHANGER');
  });

  it('matches air filter MERV for HVAC', () => {
    const result = matchOfflineQuery('what merv filter should I use', 'HVAC');
    expect(result).not.toBeNull();
    expect(result).toContain('MERV');
  });

  it('matches P-trap for PLUMBING', () => {
    const result = matchOfflineQuery('sewer smell from p-trap', 'PLUMBING');
    expect(result).not.toBeNull();
    expect(result).toContain('P-TRAP');
  });

  it('matches pipe material identification for PLUMBING', () => {
    const result = matchOfflineQuery('identify this copper pipe type', 'PLUMBING');
    expect(result).not.toBeNull();
    expect(result).toContain('PIPE MATERIAL');
  });

  it('matches soldering copper for PLUMBING', () => {
    const result = matchOfflineQuery('how do I solder this copper fitting', 'PLUMBING');
    expect(result).not.toBeNull();
    expect(result).toContain('SOLDERING COPPER');
  });

  it('matches T&P valve for PLUMBING', () => {
    const result = matchOfflineQuery('tpr valve on water heater', 'PLUMBING');
    expect(result).not.toBeNull();
    expect(result).toContain('T&P RELIEF VALVE');
  });

  it('matches PEX connections for PLUMBING', () => {
    const result = matchOfflineQuery('pex crimp fitting install', 'PLUMBING');
    expect(result).not.toBeNull();
    expect(result).toContain('PEX CONNECTION');
  });

  it('matches preheat for WELDING', () => {
    const result = matchOfflineQuery('do I need to preheat this steel', 'WELDING');
    expect(result).not.toBeNull();
    expect(result).toContain('PREHEAT');
  });

  it('matches electrode selection for WELDING', () => {
    const result = matchOfflineQuery('which welding rod for this joint, 7018 or 6010', 'WELDING');
    expect(result).not.toBeNull();
    expect(result).toContain('ELECTRODE SELECTION');
  });

  it('matches MIG settings for WELDING', () => {
    const result = matchOfflineQuery('what mig settings for 3/16 steel', 'WELDING');
    expect(result).not.toBeNull();
    expect(result).toContain('MIG SETTINGS');
  });

  it('matches weld inspection for WELDING', () => {
    const result = matchOfflineQuery('how do I inspect this weld for undercut', 'WELDING');
    expect(result).not.toBeNull();
    expect(result).toContain('VISUAL WELD INSPECTION');
  });

  it('matches welding PPE for WELDING', () => {
    const result = matchOfflineQuery('what lens shade for my welding helmet', 'WELDING');
    expect(result).not.toBeNull();
    expect(result).toContain('WELDING PPE');
  });

  it('returns PLUMBING answer when no trade filter — finds first keyword match across all', () => {
    const result = matchOfflineQuery('p-trap drain smell');
    expect(result).not.toBeNull();
  });

  it('all 10 ELECTRICAL entries match when filtering by ELECTRICAL', () => {
    const electricalEntries = OFFLINE_KNOWLEDGE.filter((e) => e.trade === 'ELECTRICAL');
    expect(electricalEntries).toHaveLength(10);
    electricalEntries.forEach((entry) => {
      const result = matchOfflineQuery(entry.keywords[0], 'ELECTRICAL');
      expect(result).not.toBeNull();
    });
  });

  it('all 5 HVAC entries match when filtering by HVAC', () => {
    const entries = OFFLINE_KNOWLEDGE.filter((e) => e.trade === 'HVAC');
    expect(entries).toHaveLength(5);
    entries.forEach((entry) => {
      const result = matchOfflineQuery(entry.keywords[0], 'HVAC');
      expect(result).not.toBeNull();
    });
  });

  it('all 5 PLUMBING entries match when filtering by PLUMBING', () => {
    const entries = OFFLINE_KNOWLEDGE.filter((e) => e.trade === 'PLUMBING');
    expect(entries).toHaveLength(5);
    entries.forEach((entry) => {
      const result = matchOfflineQuery(entry.keywords[0], 'PLUMBING');
      expect(result).not.toBeNull();
    });
  });

  it('all 5 WELDING entries match when filtering by WELDING', () => {
    const entries = OFFLINE_KNOWLEDGE.filter((e) => e.trade === 'WELDING');
    expect(entries).toHaveLength(5);
    entries.forEach((entry) => {
      const result = matchOfflineQuery(entry.keywords[0], 'WELDING');
      expect(result).not.toBeNull();
    });
  });
});
