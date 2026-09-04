/**
 * Northline Mechanical — a fictional shop for demos.
 *
 * Every id starts with `demo-`. None of this is field evidence, none of it is
 * customer usage, and none of it may be written to act-api. It exists so the
 * whole loop (case → commit-first practice → delayed variant → readiness
 * matrix) can be shown end to end before a real shop has produced any of it.
 *
 * Dates are relative to `now` so the variant schedule and "review suggested"
 * flags stay in the same state every time the demo is opened.
 */
import type { KnowledgeCardSource } from './case';
import type { FieldJob, PracticeEvent } from './evidence';
import type { ReadinessLevelRecord, Technician } from './readiness';

export const DEMO_ID_PREFIX = 'demo-';
export const DEMO_SHOP_NAME = 'Northline Mechanical (fictional)';

export function isDemoId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(DEMO_ID_PREFIX);
}

export interface DemoShop {
  shopName: string;
  techs: Technician[];
  /** The manager who set the levels below. */
  managerId: string;
  /** Default learner when the demo opens the practice surface. */
  learnerId: string;
  cards: KnowledgeCardSource[];
  events: PracticeEvent[];
  jobs: FieldJob[];
  levels: ReadinessLevelRecord[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(now: Date, days: number, hour = 14): string {
  const d = new Date(now.getTime() - days * DAY_MS);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

const RAY = 'demo-tech-ray';
const LENA = 'demo-tech-lena';
const MAYA = 'demo-tech-maya';
const JORDAN = 'demo-tech-jordan';

const TECHS: Technician[] = [
  { id: RAY, name: 'Ray Delgado', role: 'senior_tech' },
  { id: MAYA, name: 'Maya Chen', role: 'technician' },
  { id: JORDAN, name: 'Jordan Okafor', role: 'apprentice' },
];

const CASE_AIRFLOW = 'demo-case-airflow-callback';
const CASE_FLAME = 'demo-case-flame-sensor';
const CASE_CAP = 'demo-case-capacitor-discharge';
const CASE_FAN = 'demo-case-fan-motor-substitute';
const CASE_TXV = 'demo-case-txv-subcooling';
const CASE_RTU = 'demo-case-rtu-economizer';

function card(
  now: Date,
  input: Omit<KnowledgeCardSource, 'trade' | 'status' | 'created_at' | 'published_at'> & {
    publishedDaysAgo: number;
  },
): KnowledgeCardSource {
  const { publishedDaysAgo, ...rest } = input;
  return {
    ...rest,
    trade: 'hvac',
    status: 'published',
    created_at: daysAgo(now, publishedDaysAgo + 2, 18),
    published_at: daysAgo(now, publishedDaysAgo, 9),
  };
}

function cards(now: Date): KnowledgeCardSource[] {
  return [
    card(now, {
      id: CASE_AIRFLOW,
      moment_id: 'demo-moment-airflow',
      title: 'Frosted suction line was airflow, not low charge',
      situation:
        'Second visit in nine days on a 3-ton residential split. First visit added a pound of R-410A for a "low charge" call. Customer says it cooled for a week, then stopped again.',
      observable_cue:
        'Suction line frosted back to the compressor within ten minutes. Return grille barely moved a tissue. Filter was clean — the homeowner changed it after visit one.',
      expert_reasoning:
        'Frost plus a weak return says the evaporator is starving for air, not for refrigerant. Adding charge on visit one masked it: the extra refrigerant lifted suction pressure for a while until the coil iced again. A restriction anywhere on the return side gives the same low-suction picture as low charge.',
      decision:
        'Measure total external static before touching the gauges. It read 1.1 in. WC against a 0.5 rated blower. Pulled the blower door: evaporator coil face matted with dog hair behind the clean filter. Cleaned the coil, recovered the overcharge, reset charge by subcooling.',
      novice_trap:
        'Reading a cold, frosted suction line as proof of low charge. Frost tells you the coil is below freezing. It does not tell you why.',
      safety_boundary:
        'Kill power at the disconnect and verify with a meter before opening the blower compartment. Gloves and eye protection when cleaning the coil; fin edges cut.',
      verification:
        'Static back to 0.6 in. WC, 18–20°F split held through a full 15-minute cycle, subcooling within 2°F of nameplate. Called the customer at day ten: still cooling.',
      tags_json: ['callback', 'airflow'],
      system_type: 'residential_split',
      equipment_make: 'Carrier',
      equipment_model: '24ACC636',
      customer_site_label: 'Residential — Maple Ct',
      jurisdiction: null,
      publishedDaysAgo: 24,
    }),
    card(now, {
      id: CASE_FLAME,
      moment_id: 'demo-moment-flame',
      title: 'Furnace lights, runs four seconds, shuts down',
      situation:
        '80% single-stage gas furnace. Igniter glows, burners light, flame drops out after about four seconds, then it retries. Locks out after three tries. Board flashes a flame-fault code.',
      observable_cue:
        'Burners lit clean and blue every try — no lazy flame, no rollout. Dropout came at the same count each time. Flame sensor rod had a dull grey coating.',
      expert_reasoning:
        'Clean ignition that dies on a fixed timer means the board is not seeing flame, not that there is no flame. That points at flame proving, not gas supply and not the pressure switch — a pressure switch fault stops it before ignition. A steady dropout time is the board\u2019s proving window closing with no signal.',
      decision:
        'Meter in series on the flame sensor lead during a trial: 0.4 µA, spec is above 1.0. Cleaned the rod with fine steel wool, no sandpaper. Re-tested at 3.2 µA. Checked the ground path from burner to board while I was in there.',
      novice_trap:
        'Replacing the igniter because "it\u2019s an ignition problem." The igniter did its job every time — the flame lit. The failure is after ignition.',
      safety_boundary:
        'Gas valve off before cleaning anything in the burner compartment. If you ever see flame rollout or soot, stop diagnosing and red-tag it.',
      verification:
        'Three full heat cycles without a dropout, flame current steady above 3 µA, board status light solid.',
      tags_json: ['hard_solve', 'no_heat', 'flame_sensor'],
      system_type: 'gas_furnace',
      equipment_make: 'Goodman',
      equipment_model: 'GMS80805CN',
      customer_site_label: 'Residential — Birch Rd',
      jurisdiction: null,
      publishedDaysAgo: 30,
    }),
    card(now, {
      id: CASE_CAP,
      moment_id: 'demo-moment-capacitor',
      title: 'Run capacitor was still charged after the disconnect was pulled',
      situation:
        'Condenser fan not spinning on a 4-ton split. Compressor humming. Pulled the disconnect and opened the electrical panel to check the dual run capacitor.',
      observable_cue:
        'Meter on the terminals showed 240 VDC sitting on the capacitor two minutes after power was off. The fan motor had been stalling, so the cap never discharged through it.',
      expert_reasoning:
        'Pulling the disconnect stops new power. It does not empty what the capacitor is holding. A stalled fan motor means the usual discharge path is gone, so the cap stays hot. Every capacitor is charged until I have discharged it myself and re-metered it.',
      decision:
        'Discharged across the terminals with a 20 kΩ resistor tool, re-metered to zero, then tested: fan side read 1.8 µF against a 5 µF rating. Replaced the dual cap, spun the fan by hand to confirm it was not seized, restored power.',
      novice_trap:
        'Trusting the disconnect. Power off is not energy gone. Also: shorting the terminals with a screwdriver, which pits the terminals and can take a chunk out of the driver.',
      safety_boundary:
        'Disconnect pulled, meter confirms no AC at the contactor, capacitor discharged through a resistor and confirmed at 0 V before any terminal is touched. A bulging or leaking capacitor is replaced without testing.',
      verification:
        'Fan at rated speed, amp draw within motor nameplate, new capacitor reads 5.0 / 40 µF within 6%.',
      tags_json: ['near_miss', 'safety', 'capacitor', 'electrical'],
      system_type: 'residential_split',
      equipment_make: 'Trane',
      equipment_model: '4TTR4048',
      customer_site_label: 'Residential — Ridge View',
      jurisdiction: null,
      publishedDaysAgo: 18,
    }),
    card(now, {
      id: CASE_FAN,
      moment_id: 'demo-moment-fan',
      title: 'OEM condenser fan motor was three days out; matched a universal',
      situation:
        'Condenser fan motor seized on a 2.5-ton split, Friday afternoon, 96°F. OEM motor not in stock at either supply house until Tuesday. Customer has an infant in the house.',
      observable_cue:
        'Nameplate: 1/4 HP, 825 RPM, 208-230 V, 1.5 A, CCW rotation facing the shaft, 5 µF capacitor. Universal on the truck matched HP, RPM, and voltage but was reversible and called for a 7.5 µF cap.',
      expert_reasoning:
        'The motor has to match HP, RPM, voltage, frame, and rotation. Amps and capacitor follow the motor, not the old part, so a different capacitor rating is normal with a substitute. Rotation on a reversible motor is set by wiring, so it is right only if you confirm it. A substitute checked that way is a real repair, not a stopgap.',
      decision:
        'Installed the universal, wired for CCW per its diagram, replaced the fan capacitor with the 7.5 µF the new motor calls for, set the blade at the original depth. Wrote the substitution on the ticket so the next tech knows why the cap rating does not match the unit label.',
      novice_trap:
        'Reusing the old capacitor because "it\u2019s the same fan." The capacitor rating belongs to the motor. Also: not confirming rotation, so the fan blows down into the unit and head pressure climbs.',
      safety_boundary:
        'Disconnect pulled and verified, capacitor discharged before wiring. If the substitute needs a shaft adapter or a blade modification, stop. A blade thrown at 825 RPM is a projectile.',
      verification:
        'Air discharging up out of the top, motor at 1.4 A against a 1.6 A nameplate, head pressure settled in the normal range for ambient after ten minutes.',
      tags_json: ['adaptation', 'workaround', 'condenser_fan'],
      system_type: 'residential_split',
      equipment_make: 'Lennox',
      equipment_model: '13ACX-030',
      customer_site_label: 'Residential — Elm St',
      jurisdiction: null,
      publishedDaysAgo: 12,
    }),
    card(now, {
      id: CASE_TXV,
      moment_id: 'demo-moment-txv',
      title: 'Charging a TXV system: subcooling, not superheat',
      situation:
        'Start-up on a replaced 3-ton condenser with a TXV at the evaporator. Factory charge covered 15 ft of line set; the run was 42 ft. Needed to add charge and prove it.',
      observable_cue:
        'Superheat held at 10°F while refrigerant went in — the TXV was doing its job. Subcooling climbed from 3°F as charge was added.',
      expert_reasoning:
        'A TXV meters to hold superheat, so superheat tells you the valve works, not whether the charge is right. Subcooling at the condenser outlet is the number that responds to charge on a TXV system. Nameplate target here was 10°F.',
      decision:
        'Weighed in the line-set adder first: 0.6 oz per foot over 15 ft, about 16 oz. Then trimmed by subcooling with the unit stable 15 minutes and indoor airflow verified first. Landed at 10°F.',
      novice_trap:
        'Charging a TXV system to a superheat target. It will not move, so you keep adding until the system is badly overcharged.',
      safety_boundary:
        'Verify indoor airflow and a clean filter before charging anything. A charge set against bad airflow is wrong the day airflow gets fixed. Gloves and eye protection on liquid-line connections.',
      verification:
        'Subcooling 10°F ±1 on two stable readings ten minutes apart, superheat 8–12°F, split 18°F, total charge and line-set length written on the ticket.',
      tags_json: ['proficiency', 'charge', 'txv', 'verification'],
      system_type: 'residential_split',
      equipment_make: 'Rheem',
      equipment_model: 'RA1636AJ1NA',
      customer_site_label: 'Residential — Harbor Ln',
      jurisdiction: null,
      publishedDaysAgo: 9,
    }),
    card(now, {
      id: CASE_RTU,
      moment_id: 'demo-moment-rtu',
      title: 'RTU short cycling was the economizer, not the compressor',
      situation:
        'Callback on a 7.5-ton rooftop unit over a retail space. First visit replaced the compressor contactor for "short cycling." Tenant says it still cycles every few minutes and the space is humid.',
      observable_cue:
        'Outdoor-air damper sat 60% open on a 91°F, humid afternoon. Mixed-air temperature 82°F. Compressor cycled off on low pressure within three minutes of starting.',
      expert_reasoning:
        'Compressor short cycling on low pressure with a warm coil is airflow or load, not the contactor. A stuck-open economizer dumps hot humid outdoor air across the coil, the coil cannot keep up, and you get the humidity complaint at the same time. The contactor swap fixed nothing because nothing was wrong with it.',
      decision:
        'Tested the economizer actuator: no response to the controller\u2019s minimum-position signal. Failed actuator holding the damper open. Replaced it, set minimum position per the ventilation schedule, confirmed the damper closed fully on a call for mechanical cooling with outdoor air above changeover.',
      novice_trap:
        'Chasing the last thing that clicked. The contactor cycling is the symptom. Ask what is making the control circuit cycle.',
      safety_boundary:
        'Lock out the unit disconnect before entering the economizer section; the damper linkage and blower are both in reach. Roof-edge and ladder rules come before any of this.',
      verification:
        'Compressor run time over 12 minutes per cycle, mixed air within 4°F of return on mechanical cooling, space RH down from 68% to 52% by the next morning.',
      tags_json: ['callback', 'rtu', 'economizer', 'commercial'],
      system_type: 'rooftop_unit',
      equipment_make: 'Carrier',
      equipment_model: '48TC-D08',
      customer_site_label: 'Commercial — Northgate Retail',
      jurisdiction: null,
      publishedDaysAgo: 6,
    }),
  ];
}

function commitNote(input: {
  cue: string;
  hypothesis: string;
  next_test: string;
  rationale: string;
  disconfirm: string;
  reflection: string;
}): string {
  return JSON.stringify({ kind: 'hypothesis_committed', ...input });
}

let eventCounter = 0;
function event(
  now: Date,
  input: { caseId: string; userId: string; eventType: string; note: string | null; daysAgo: number; hour?: number },
): PracticeEvent {
  eventCounter += 1;
  return {
    id: `demo-event-${eventCounter}`,
    caseId: input.caseId,
    userId: input.userId,
    eventType: input.eventType,
    note: input.note,
    createdAt: daysAgo(now, input.daysAgo, input.hour ?? 19),
  };
}

function practicePair(
  now: Date,
  input: { caseId: string; userId: string; daysAgo: number; note: string; completed?: boolean },
): PracticeEvent[] {
  const out = [
    event(now, { ...input, eventType: 'quiz_attempted', note: input.note, hour: 19 }),
  ];
  if (input.completed !== false) {
    out.push(event(now, { ...input, eventType: 'completed', note: input.note, hour: 20 }));
  }
  return out;
}

function events(now: Date): PracticeEvent[] {
  eventCounter = 0;
  return [
    // Maya — airflow callback, practiced 12 days ago: variant is due.
    ...practicePair(now, {
      caseId: CASE_AIRFLOW,
      userId: MAYA,
      daysAgo: 12,
      note: commitNote({
        cue: 'Frost on the suction line with almost no air at the return.',
        hypothesis: 'Airflow restriction icing the coil, not a charge problem.',
        next_test: 'Total external static across the air handler.',
        rationale: 'Static separates a starved coil from a starved system before I add anything.',
        disconfirm: 'Normal static and a clean coil face with the frost still there.',
        reflection: 'Frost says the coil is cold. It does not say why. Airflow before charge.',
      }),
    }),
    // Maya — flame sensor, practiced 20 days ago, variant done 10 days ago.
    ...practicePair(now, {
      caseId: CASE_FLAME,
      userId: MAYA,
      daysAgo: 20,
      note: commitNote({
        cue: 'Clean blue flame every attempt, dropout at the same count.',
        hypothesis: 'Flame proving failure — sensor not reading.',
        next_test: 'Microamps in series on the flame sensor lead.',
        rationale: 'If the flame is lit and the board still trips, the board is not seeing it.',
        disconfirm: 'Flame current above 2 µA with the dropout still happening.',
        reflection: 'Separate "did it light" from "did the board see it light."',
      }),
    }),
    event(now, {
      caseId: CASE_FLAME,
      userId: MAYA,
      eventType: 'completed',
      daysAgo: 10,
      note: JSON.stringify({
        kind: 'variant_completed',
        cue: 'Ignites then drops on a timer.',
        hypothesis: 'Proving circuit, not ignition.',
        next_test: 'Flame sensor microamps.',
        rationale: 'Timer-shaped failure is the board waiting for a signal that never comes.',
        disconfirm: 'Good microamps — then look at the board or the ground.',
        reflection: 'Still holds. Fixed-interval dropout after ignition points at proving.',
      }),
    }),
    // Maya — TXV subcooling, practiced 3 days ago: variant waiting.
    ...practicePair(now, {
      caseId: CASE_TXV,
      userId: MAYA,
      daysAgo: 3,
      note: commitNote({
        cue: 'Superheat flat while adding charge.',
        hypothesis: 'TXV is regulating; charge has to be judged by subcooling.',
        next_test: 'Subcooling at the condenser outlet against nameplate.',
        rationale: 'Superheat is the valve. Subcooling is the charge.',
        disconfirm: 'Superheat swinging with charge would mean the valve is not metering.',
        reflection: 'Pick the measurement the component cannot hide.',
      }),
    }),
    // Maya — capacitor near miss, committed yesterday, not finished.
    ...practicePair(now, {
      caseId: CASE_CAP,
      userId: MAYA,
      daysAgo: 1,
      completed: false,
      note: commitNote({
        cue: 'Fan not spinning, compressor humming.',
        hypothesis: 'Failed fan capacitor or seized motor.',
        next_test: 'Discharge and meter the capacitor.',
        rationale: 'Cheapest test that splits the two.',
        disconfirm: 'Capacitor in spec and the motor still will not turn by hand.',
        reflection: '',
      }),
    }),
    // Jordan — airflow callback, practiced 2 days ago.
    ...practicePair(now, {
      caseId: CASE_AIRFLOW,
      userId: JORDAN,
      daysAgo: 2,
      note: commitNote({
        cue: 'Frosted suction line.',
        hypothesis: 'Low on refrigerant.',
        next_test: 'Hook up gauges and check pressures.',
        rationale: 'Frost usually means low charge.',
        disconfirm: 'Pressures normal.',
        reflection: 'I went straight to charge. The expert measured airflow first. Frost is a symptom of a cold coil, not a diagnosis.',
      }),
    }),
    // Jordan — capacitor near miss, practiced 16 days ago: variant overdue.
    ...practicePair(now, {
      caseId: CASE_CAP,
      userId: JORDAN,
      daysAgo: 16,
      note: commitNote({
        cue: 'Fan dead, compressor humming.',
        hypothesis: 'Bad capacitor.',
        next_test: 'Pull disconnect, test the cap.',
        rationale: 'Most common cause.',
        disconfirm: 'Cap tests fine.',
        reflection: 'Disconnect off is not the same as discharged. Meter it first.',
      }),
    }),
  ];
}

let jobCounter = 0;
function job(
  now: Date,
  input: {
    userId: string;
    systemType: string;
    equipmentLabel: string;
    daysAgo: number;
    callback?: boolean;
    diagnosis?: string;
  },
): FieldJob {
  jobCounter += 1;
  return {
    id: `demo-job-${jobCounter}`,
    userId: input.userId,
    systemType: input.systemType,
    equipmentLabel: input.equipmentLabel,
    createdAt: daysAgo(now, input.daysAgo, 15),
    outcome:
      input.diagnosis == null
        ? null
        : { callback: input.callback ?? false, finalDiagnosis: input.diagnosis },
  };
}

function jobs(now: Date): FieldJob[] {
  jobCounter = 0;
  return [
    job(now, { userId: MAYA, systemType: 'residential_split', equipmentLabel: '3-ton split, no cool', daysAgo: 28, diagnosis: 'Failed contactor' }),
    job(now, { userId: MAYA, systemType: 'residential_split', equipmentLabel: '2-ton split, no cool', daysAgo: 23, diagnosis: 'Low charge, leak at Schrader', callback: true }),
    job(now, { userId: MAYA, systemType: 'residential_split', equipmentLabel: '4-ton split, weak cooling', daysAgo: 15, diagnosis: 'Dirty evaporator coil' }),
    job(now, { userId: MAYA, systemType: 'residential_split', equipmentLabel: '3-ton split, no cool', daysAgo: 8, diagnosis: 'Dual run capacitor' }),
    job(now, { userId: MAYA, systemType: 'residential_split', equipmentLabel: '2.5-ton split, icing', daysAgo: 4, diagnosis: 'Return restriction, static 1.0 in. WC' }),
    job(now, { userId: MAYA, systemType: 'gas_furnace', equipmentLabel: '80% furnace, no heat', daysAgo: 25, diagnosis: 'Pressure switch hose blocked' }),
    job(now, { userId: MAYA, systemType: 'gas_furnace', equipmentLabel: '80% furnace, short cycling', daysAgo: 8, diagnosis: 'Flame sensor 0.6 µA, cleaned' }),
    job(now, { userId: MAYA, systemType: 'rooftop_unit', equipmentLabel: '5-ton RTU, assisted Ray', daysAgo: 6 }),
    job(now, { userId: JORDAN, systemType: 'residential_split', equipmentLabel: '3-ton split, assisted Maya', daysAgo: 9, diagnosis: 'Dual run capacitor' }),
    job(now, { userId: JORDAN, systemType: 'residential_split', equipmentLabel: '2-ton split, assisted Ray', daysAgo: 2 }),
    job(now, { userId: RAY, systemType: 'residential_split', equipmentLabel: '3-ton split, callback', daysAgo: 26, diagnosis: 'Airflow restriction, coil cleaned' }),
    job(now, { userId: RAY, systemType: 'gas_furnace', equipmentLabel: '80% furnace, lockout', daysAgo: 22, diagnosis: 'Flame sensor' }),
    job(now, { userId: RAY, systemType: 'residential_split', equipmentLabel: '4-ton split, fan dead', daysAgo: 20, diagnosis: 'Dual run capacitor' }),
    job(now, { userId: RAY, systemType: 'residential_split', equipmentLabel: '2.5-ton split, fan seized', daysAgo: 14, diagnosis: 'Condenser fan motor, universal sub' }),
    job(now, { userId: RAY, systemType: 'residential_split', equipmentLabel: '3-ton condenser replacement', daysAgo: 11, diagnosis: 'Start-up, charged by subcooling' }),
    job(now, { userId: RAY, systemType: 'rooftop_unit', equipmentLabel: '7.5-ton RTU, callback', daysAgo: 8, diagnosis: 'Economizer actuator' }),
    job(now, { userId: RAY, systemType: 'heat_pump', equipmentLabel: '3-ton heat pump, no heat', daysAgo: 5, diagnosis: 'Defrost board' }),
    job(now, { userId: RAY, systemType: 'rooftop_unit', equipmentLabel: '5-ton RTU, PM', daysAgo: 6, diagnosis: 'Preventive maintenance' }),
  ];
}

function level(
  now: Date,
  input: { techId: string; activityId: string; level: ReadinessLevelRecord['level']; daysAgo: number; note?: string },
): ReadinessLevelRecord {
  return {
    techId: input.techId,
    activityId: input.activityId,
    level: input.level,
    setBy: LENA,
    setAt: daysAgo(now, input.daysAgo, 8),
    note: input.note ?? null,
  };
}

function levels(now: Date): ReadinessLevelRecord[] {
  return [
    level(now, { techId: MAYA, activityId: 'no_cool_split', level: 'independent', daysAgo: 20, note: 'Solid on no-cools. Watch the leak-check habit after the Schrader callback.' }),
    level(now, { techId: MAYA, activityId: 'no_heat_furnace', level: 'supervised', daysAgo: 5, note: 'Two furnace calls this month. Ray checks before close through October.' }),
    level(now, { techId: MAYA, activityId: 'electrical_controls', level: 'assist', daysAgo: 30 }),
    level(now, { techId: MAYA, activityId: 'rtu_commercial', level: 'observe', daysAgo: 30 }),
    level(now, { techId: JORDAN, activityId: 'no_cool_split', level: 'assist', daysAgo: 10 }),
    level(now, { techId: JORDAN, activityId: 'electrical_controls', level: 'observe', daysAgo: 30, note: 'Not alone in a live panel yet.' }),
    ...['no_cool_split', 'no_heat_furnace', 'heat_pump', 'refrigerant_charge', 'airflow', 'electrical_controls', 'rtu_commercial'].map(
      (activityId) => level(now, { techId: RAY, activityId, level: 'mentor', daysAgo: 45 }),
    ),
  ];
}

export function demoShop(now: Date = new Date()): DemoShop {
  return {
    shopName: DEMO_SHOP_NAME,
    techs: TECHS,
    managerId: LENA,
    learnerId: MAYA,
    cards: cards(now),
    events: events(now),
    jobs: jobs(now),
    levels: levels(now),
  };
}
