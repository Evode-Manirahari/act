export interface OfflineEntry {
  trade: string;
  keywords: string[];
  topic: string;
  answer: string;
}

export const OFFLINE_KNOWLEDGE: OfflineEntry[] = [
  {
    trade: 'ELECTRICAL',
    topic: 'Knob and tube wiring identification and safety assessment',
    keywords: ['knob', 'tube', 'knob-and-tube', 'old wiring', 'pre-1940', 'cloth insulated'],
    answer: `[OFFLINE — Cached] ⚠️ KNOB-AND-TUBE WIRING IDENTIFIED

This is pre-1940s two-wire ungrounded wiring. No ground conductor present.

Safety assessment:
⚠️ DO NOT splice into or extend this circuit.
⚠️ If insulation is brittle, cracked, or charred — treat as live and dangerous.
⚠️ Check for insulation contact (insulation added around it traps heat).
✅ If intact and undisturbed, it can remain in use with GFCI protection.

📋 NEC 2023 Section 394: Knob-and-tube permitted only for extensions where already installed.
🔧 Recommend: Document locations, test with non-contact tester before any work.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'Aluminum branch circuit splicing and pigtail procedure',
    keywords: ['aluminum', 'aluminium', 'al wire', 'aluminum wiring', 'pigtail', 'splice'],
    answer: `[OFFLINE — Cached] ⚠️ ALUMINUM BRANCH CIRCUIT WIRING

Common in homes built 1965–1973. Identified by silver color and AL marking on sheath.

Safety assessment:
⚠️ Aluminum expands/contracts more than copper — connections loosen over time.
⚠️ Look for discoloration, warm outlets/switches — signs of arcing.
🔧 Pigtail procedure: Use CO/ALR-rated devices + AlumiConn or Ideal 65 connectors.
🔧 Connect short copper pigtail to aluminum with listed connector, then to device.
✅ Do NOT use standard wire nuts — not rated for aluminum.

📋 NEC 2023 Section 310.15: Conductor ampacity ratings for aluminum.
📋 Use only CO/ALR-rated receptacles and switches on 15A/20A aluminum circuits.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'Federal Pacific Stab-Lok panel risk assessment and recommendation',
    keywords: ['federal pacific', 'stab-lok', 'stab lok', 'fpe', 'federal pacific panel'],
    answer: `[OFFLINE — Cached] ⚠️ FEDERAL PACIFIC STAB-LOK PANEL — HIGH RISK

This panel model has a documented history of breaker failure.

Risk assessment:
⚠️ Breakers may fail to trip on overload or short circuit — fire risk.
⚠️ Do not rely on this panel for AFCI or GFCI protection.
⚠️ Double-tapped breakers are common in these panels — additional hazard.
✅ The panel can remain energized for now but should be scheduled for replacement.

🔧 Immediate action: Do not add new circuits. Do not increase loads.
🔧 Recommend full panel replacement with listed manufacturer equipment.
📋 Document findings and advise property owner in writing.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'GFCI outlet where code requires them',
    keywords: ['gfci', 'ground fault', 'gfi', 'bathroom outlet', 'kitchen outlet', 'garage outlet', 'outdoor outlet'],
    answer: `[OFFLINE — Cached] 📋 GFCI REQUIRED LOCATIONS — NEC 2023

GFCI protection is required at:
✅ Bathrooms — all receptacles
✅ Garages and accessory buildings
✅ Outdoors — all receptacles
✅ Kitchen countertops within 6 ft of sink
✅ Unfinished basements and crawl spaces
✅ Boat houses and pool/spa areas
✅ Rooftops
✅ Dishwasher circuit (new in NEC 2023)
✅ Laundry areas (new in NEC 2023 — within 6 ft of sink)

🔧 GFCI outlet protects all downstream outlets on same circuit.
🔧 Test monthly: press TEST button → outlet should go dead. RESET restores.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'AFCI breaker where code requires them',
    keywords: ['afci', 'arc fault', 'arc-fault', 'afci breaker', 'arc fault breaker'],
    answer: `[OFFLINE — Cached] 📋 AFCI REQUIRED LOCATIONS — NEC 2023

AFCI protection required for ALL 120V 15A and 20A branch circuits in:
✅ Bedrooms
✅ Living rooms, family rooms, dens, parlors
✅ Sunrooms, recreation rooms, closets, hallways
✅ Kitchens and laundry areas
✅ Dining rooms
✅ Libraries, studies

⚠️ Basically all habitable rooms in a dwelling require AFCI.
✅ Combination-type AFCI breaker satisfies the requirement.
🔧 AFCI + GFCI dual-function breakers available for locations requiring both.
📋 NEC 2023 Section 210.12.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'Wire gauge visual identification without tools',
    keywords: ['gauge', 'wire size', 'wire gauge', 'awg', '14 gauge', '12 gauge', '10 gauge', 'identify wire'],
    answer: `[OFFLINE — Cached] 🔧 WIRE GAUGE VISUAL IDENTIFICATION

Without a gauge tool, compare to known references:

14 AWG — Same diameter as a toothpick tip. Used on 15A circuits.
12 AWG — Slightly thicker. Stiffer to bend. Used on 20A circuits.
10 AWG — Noticeably thicker, difficult to bend sharply. Used on 30A circuits.
8 AWG — Very thick, requires effort to strip. Used on 40-50A circuits.

Quick check on NM-B cable sheathing:
✅ White sheath = 14 AWG (15A)
✅ Yellow sheath = 12 AWG (20A)
✅ Orange sheath = 10 AWG (30A)
✅ Black sheath = 8 or 6 AWG

⚠️ Old wiring may not follow color coding — verify with markings on sheath.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'Box fill calculation method',
    keywords: ['box fill', 'box fill calculation', 'how many wires', 'wire fill', 'junction box', 'outlet box'],
    answer: `[OFFLINE — Cached] 📋 BOX FILL CALCULATION — NEC 2023 TABLE 314.16(B)

Each conductor volume allowance:
14 AWG = 2.0 cu in per conductor
12 AWG = 2.25 cu in per conductor
10 AWG = 2.5 cu in per conductor

Count rules:
🔧 Each hot/neutral entering box = 1 conductor each
🔧 All grounds combined = 1 conductor (same size as largest)
🔧 Each device (switch/outlet) = 2 conductors
🔧 Each clamp inside box = 1 conductor (same size as largest)
🔧 Wires passing through = 1 conductor each

Example: 4 × 14 AWG wires + 1 device + 1 ground clamp
= (4 × 2.0) + (2 × 2.0) + (1 × 2.0) = 14.0 cu in minimum box

✅ Check cubic inch marking stamped inside box.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'Grounding wire identification in old systems',
    keywords: ['ground wire', 'grounding', 'green wire', 'bare wire', 'no ground', 'ungrounded', 'two prong'],
    answer: `[OFFLINE — Cached] 🔧 GROUNDING WIRE IDENTIFICATION

Modern systems (post-1960s):
✅ Bare copper wire = equipment ground
✅ Green insulated wire = equipment ground (flex conduit, appliances)
✅ Three-prong outlets indicate grounded circuit (verify with tester)

Old/ungrounded systems:
⚠️ Two-wire cable (black + white only) = no ground
⚠️ Knob-and-tube = no ground
⚠️ Two-prong outlets = ungrounded circuit

Options for ungrounded circuits (NEC 2023 Section 406.4):
📋 Option 1: Run new grounding conductor back to panel
📋 Option 2: Replace with GFCI outlet, marked "No Equipment Ground"
📋 Option 3: Replace with GFCI breaker at panel

⚠️ Do NOT connect ground to neutral at outlet — code violation, safety hazard.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'Double-tapped breaker safety and fix',
    keywords: ['double tap', 'double-tap', 'double tapped', 'two wires breaker', 'two wires in breaker', 'tandem breaker'],
    answer: `[OFFLINE — Cached] ⚠️ DOUBLE-TAPPED BREAKER IDENTIFIED

A double-tap means two conductors are connected to a breaker designed for one.

Risk assessment:
⚠️ Poor connection → arcing → fire risk
⚠️ One circuit can affect the other when breaker trips
⚠️ Most breakers are NOT rated for two conductors

Exceptions (check breaker label):
✅ Some breakers are listed for two conductors — marked on the breaker
✅ Square D QO and Homeline have some dual-rated models

🔧 Fix options:
Option 1: Add a tandem (duplex) breaker if panel has space and it's listed
Option 2: Add a sub-panel or circuit
Option 3: Use a listed two-wire lug kit if available for that breaker model

📋 NEC 2023 Section 408.55: Only listed conductors per termination allowed.`,
  },
  {
    trade: 'ELECTRICAL',
    topic: 'Cloth insulated wire safety assessment',
    keywords: ['cloth wire', 'cloth insulation', 'cloth insulated', 'fabric wire', 'rubberized cloth', 'old insulation'],
    answer: `[OFFLINE — Cached] ⚠️ CLOTH-INSULATED WIRING ASSESSMENT

Cloth (rubber/cotton) insulated wire was common from 1920s–1960s.

Safety assessment:
⚠️ Insulation becomes brittle with age — can crack or crumble when disturbed.
⚠️ If insulation is missing or damaged, treat all conductors as energized.
⚠️ Do not pull, bend, or disturb this wiring without de-energizing.

Serviceability check:
✅ If insulation is intact and flexible → generally still serviceable
⚠️ If cracked, hardened, or missing sections → must be replaced
⚠️ If discolored (brown/black carbonization) → signs of heat damage, replace immediately

🔧 Test for energization with non-contact tester before any contact.
📋 NEC 2023 Section 310.15: Conductors must have adequate insulation for the application.
🔧 Recommend: Document condition with photos. Schedule replacement if degraded.`,
  },

  // ── HVAC ─────────────────────────────────────────────────────────────────────
  {
    trade: 'HVAC',
    topic: 'Refrigerant types and identification',
    keywords: ['refrigerant', 'r-22', 'r-410a', 'r410a', 'freon', 'coolant', 'refrigerant type'],
    answer: `[OFFLINE — Cached] 📋 REFRIGERANT IDENTIFICATION

Common refrigerants by equipment age:
🔧 R-22 (Freon): Pre-2010 residential. Phased out. Silver/gray cylinder. Requires EPA 608.
🔧 R-410A (Puron): 2006–2025 standard. Rose/pink cylinder. High pressure — 400+ PSI on liquid side.
🔧 R-32: Newer mini-splits. Blue cylinder. A2L — mildly flammable, ensure ventilation.
🔧 R-454B: Newest R-410A replacement. Green cylinder. A2L mildly flammable.

⚠️ Never mix refrigerants. Identify from nameplate before connecting gauges.
⚠️ Venting refrigerant is illegal under EPA 608. Recover first.
📋 Manifold gauges must be rated for the system's operating pressure.`,
  },
  {
    trade: 'HVAC',
    topic: 'Thermostat wiring identification and C-wire',
    keywords: ['thermostat', 'thermostat wiring', 'c wire', 'common wire', 'r wire', 'no c wire', 'thermostat not working'],
    answer: `[OFFLINE — Cached] 🔧 THERMOSTAT WIRING — 24VAC

Standard 5-wire color coding:
🔧 R (Red) — 24VAC power from transformer
🔧 C (Blue/Black) — Common, completes circuit. Required for smart/WiFi stats.
🔧 Y (Yellow) — Cooling call to compressor
🔧 G (Green) — Fan/blower call
🔧 W (White) — Heating call (furnace, heat pump)
🔧 O/B (Orange) — Heat pump reversing valve

No C-wire? Options:
📋 Option 1: Run new 18/5 thermostat wire
📋 Option 2: Use C-wire adapter kit (available for most systems)
📋 Option 3: Jumper from G terminal (disables fan-only mode)

⚠️ If stat shows no power — check 3A fuse on air handler control board first.`,
  },
  {
    trade: 'HVAC',
    topic: 'Capacitor discharge and replacement procedure',
    keywords: ['capacitor', 'start capacitor', 'run capacitor', 'capacitor discharge', 'capacitor bad', 'capacitor bulging'],
    answer: `[OFFLINE — Cached] ⚠️ CAPACITOR SAFETY

Capacitors store lethal voltage even when power is OFF.

Discharge procedure:
🔧 Use a 20,000 ohm (20kΩ), 10W resistor across capacitor terminals.
🔧 Do NOT short terminals with a screwdriver — spike can damage compressor and fan.
🔧 Verify discharged with voltmeter before touching.

Capacitor failure signs:
⚠️ Bulging top, oil leaking, burning smell = failed. Replace.
🔧 Test capacitance with capacitor-capable meter. ±6% of rated value is acceptable.
🔧 Dual-run capacitor: two sections (HERM for compressor, FAN for fan motor, COM for common).

⚠️ Confirm replacement is same µF rating and voltage rating or higher.`,
  },
  {
    trade: 'HVAC',
    topic: 'HVAC air filter MERV rating selection',
    keywords: ['air filter', 'merv', 'filter rating', 'hvac filter', 'replace filter', 'filter size', 'filter blocked'],
    answer: `[OFFLINE — Cached] 🔧 AIR FILTER — MERV RATINGS

MERV 1–4: Fiberglass spun. Minimal filtration. Protects equipment only.
MERV 8: Standard pleated. Removes dust, pollen, mold spores, pet dander. ✅ Best default for most systems.
MERV 11: Premium residential. Removes fine particles and some bacteria.
MERV 13: Near-HEPA. Excellent filtration. ⚠️ Can restrict airflow in standard systems.

🔧 Check static pressure rating before using MERV 13. Low-static blowers will short-cycle.
🔧 Replace standard filters every 60–90 days. Every 30 days in high-dust environments.
🔧 Dirty filter = cause #1 of high static pressure, reduced airflow, system failures.

✅ When in doubt, MERV 8 is the right call for residential.`,
  },
  {
    trade: 'HVAC',
    topic: 'Heat exchanger inspection for cracks and CO risk',
    keywords: ['heat exchanger', 'cracked heat exchanger', 'carbon monoxide', 'co leak', 'furnace crack', 'cracked furnace'],
    answer: `[OFFLINE — Cached] ⚠️ HEAT EXCHANGER — LIFE SAFETY

A cracked heat exchanger allows combustion gases (including CO) into living spaces.

Inspection procedure:
🔧 Visually inspect with flashlight or borescope camera for cracks, rust-through, burn spots.
🔧 Combustion spillage test: hold smoke pencil at draft diverter while furnace runs. Should draw inward. Spillage = cracked exchanger or blocked flue.
🔧 CO test: check CO levels in supply air at register. Any elevated CO = shut down immediately.

⚠️ If CO detected in supply air — shut furnace down. Do not restart.
⚠️ Notify occupants to leave until building is cleared.
⚠️ Cracked heat exchanger = condemned furnace. Must replace before any return to service.
📋 Document findings in writing. Notify homeowner.`,
  },

  // ── PLUMBING ──────────────────────────────────────────────────────────────────
  {
    trade: 'PLUMBING',
    topic: 'P-trap function and installation requirements',
    keywords: ['p-trap', 'ptrap', 'drain smell', 'sewer smell', 'trap', 'sewer gas', 'drain gas'],
    answer: `[OFFLINE — Cached] 🔧 P-TRAP — FUNCTION AND REQUIREMENTS

The P-trap holds a water seal that blocks sewer gas from entering the building.

Key rules:
✅ Every fixture connecting to the drain system must have a P-trap.
🔧 Trap arm (horizontal run to vent): max 6× pipe diameter. Typically max 6 ft for 1.5" pipe.
⚠️ No S-traps allowed. S-traps self-siphon. Illegal under current IPC and UPC.
⚠️ Dry trap = no water seal = sewer gas enters building. Pour water down unused drains.

Installation:
🔧 Trap outlet must be lower than trap arm entry to maintain the water seal.
🔧 Use slip-joint P-trap for accessible locations. Glued ABS/PVC for concealed.
📋 IPC Section 1002: trap requirements. UPC Section 1001: similar.`,
  },
  {
    trade: 'PLUMBING',
    topic: 'Pipe material identification — copper, PEX, CPVC, galvanized',
    keywords: ['copper pipe', 'pex pipe', 'cpvc', 'galvanized pipe', 'pipe material', 'identify pipe', 'pipe type'],
    answer: `[OFFLINE — Cached] 🔧 PIPE MATERIAL IDENTIFICATION

Copper: Bright orange-red (new), green patina (aged). Rigid. Labeled K, L, or M on side.
PEX: Flexible plastic. Red = hot, Blue = cold, White = either. Cannot be outdoors (UV damage).
CPVC: Rigid plastic, cream/yellow-white. For hot and cold supply. Uses CPVC-specific solvent cement.
Galvanized steel: Gray, threaded metal fittings. Pre-1970. Corrodes internally — check for flow restriction.
Cast iron: Heavy gray pipe. DWV systems. Hub-and-spigot (old) or no-hub (modern) connections.
ABS/PVC: Black (ABS) or white/gray (PVC). DWV systems. Glued fittings.

⚠️ Never connect copper directly to galvanized — use dielectric union to prevent galvanic corrosion.
⚠️ CPVC and PVC use different solvents. Do not substitute.`,
  },
  {
    trade: 'PLUMBING',
    topic: 'Soldering copper pipe — procedure and safety',
    keywords: ['solder', 'sweat fitting', 'sweat joint', 'flux', 'copper fitting', 'soldering copper', 'solder joint'],
    answer: `[OFFLINE — Cached] 🔧 SOLDERING COPPER PIPE

Prep:
🔧 Cut with tubing cutter. Deburr inside edge.
🔧 Polish pipe OD with emery cloth. Clean fitting socket with wire brush.
🔧 Apply lead-free flux to both surfaces. Push together.

Soldering:
🔧 Heat the fitting, not the pipe. Move flame around joint — 1/2" fitting = ~10 seconds.
🔧 Touch solder to joint (not flame). When it flows freely, fitting is ready.
🔧 Feed 3/4" of solder for 1/2" fitting. Let capillary action pull it in.
🔧 Wipe with damp rag while hot to remove excess.

⚠️ Lead-free solder required for potable water (since 1986). Use 95/5 tin-antimony or silver-bearing.
⚠️ Do not overheat — flux burns off, solder balls up, joint fails.
⚠️ Drain all water from pipe before soldering. Steam causes blow-holes.`,
  },
  {
    trade: 'PLUMBING',
    topic: 'Water heater T&P relief valve safety and testing',
    keywords: ['pressure relief', 'tpr valve', 'temperature relief', 'water heater valve', 'relief valve', 't&p valve', 'tp valve'],
    answer: `[OFFLINE — Cached] ⚠️ T&P RELIEF VALVE — LIFE SAFETY

The temperature and pressure relief (T&P) valve is a mandatory safety device on every water heater.

⚠️ Water heater without functional T&P valve = pressure vessel with no relief. Explosion risk.

Testing:
🔧 Lift lever briefly — water should flow from discharge pipe. Release — should reseat and stop flowing.
🔧 If valve won't open, won't flow, or won't reseat → replace immediately.

Installation rules:
🔧 Discharge pipe must run downward to within 6" of floor or to drain. Cannot terminate where someone can be burned.
🔧 Discharge pipe must be same diameter as valve outlet. No reducers.
🔧 Do NOT cap or plug the discharge pipe. Ever.

📋 IPC Section 504.6: relief valve discharge requirements.
🔧 Replace T&P valve every 6 years or sooner if it fails test.`,
  },
  {
    trade: 'PLUMBING',
    topic: 'PEX connection methods — crimp, clamp, push-fit',
    keywords: ['pex', 'pex fitting', 'crimp ring', 'clamp ring', 'sharkbite', 'push fit', 'pex connection', 'pex crimp'],
    answer: `[OFFLINE — Cached] 🔧 PEX CONNECTION METHODS

Crimp (most common):
🔧 Slide crimp ring onto PEX. Insert brass insert fitting. Crimp with calibrated crimp tool.
🔧 Verify with go/no-go gauge. Under-crimped = leak under pressure.
✅ Works with PEX-B and PEX-C.

Clamp / Oetiker:
🔧 Slide clamp ring onto PEX, insert fitting, position ear at center, clamp with ear tool.
✅ Easier visual inspection — can see if ear is fully closed.

Expansion (PEX-A only):
🔧 Expand PEX end with expansion tool, insert fitting, PEX shrinks back to seal.
✅ Best cold-weather performance.

Push-fit / SharkBite:
✅ No tools needed. For repairs and accessible locations.
⚠️ Not permitted inside walls in all jurisdictions. Check local code.
🔧 Mark insertion depth before pushing to confirm full insertion.`,
  },

  // ── WELDING ──────────────────────────────────────────────────────────────────
  {
    trade: 'WELDING',
    topic: 'Preheat requirements for structural steel welding',
    keywords: ['preheat', 'pre-heat', 'interpass temperature', 'preheat temperature', 'cold cracking', 'hydrogen cracking'],
    answer: `[OFFLINE — Cached] 📋 PREHEAT REQUIREMENTS

Preheat prevents hydrogen-induced (cold) cracking in hardenable steels.

General guides (verify against WPS and AWS D1.1 Table 4.5):
✅ A36 mild steel under 1.5" thick, above 32°F ambient: typically no preheat required.
🔧 Higher carbon steel (A572 Gr50 thick sections), alloy steel, or cold conditions: minimum 150–300°F preheat.
🔧 Measure preheat with tempil stick (thermal crayon) or contact pyrometer at least 3" from joint.

⚠️ Do not weld on frozen metal. Bring base metal above 50°F minimum.
⚠️ Do not weld on wet metal. Heat until all surface moisture is driven off.
🔧 Interpass temperature: maximum temp between passes per WPS. Do not exceed — affects HAZ properties.
📋 AWS D1.1 Section 4.2: preheat and interpass temperature requirements.`,
  },
  {
    trade: 'WELDING',
    topic: 'Stick welding electrode selection guide',
    keywords: ['electrode', '7018', '6010', '6011', '6013', 'rod selection', 'welding rod', 'stick electrode', 'e7018', 'e6010'],
    answer: `[OFFLINE — Cached] 🔧 STICK ELECTRODE SELECTION

E6010: DC+ only. Deep penetration. Digs through rust and mill scale. Excellent for root passes in pipe. Requires skill — fast-freeze slag.
E6011: AC or DC. Similar to 6010. More forgiving. Use when DC not available.
E6013: AC or DC. Easy slag. Light penetration. For sheet metal and thin material. Good for beginners.
E7018: DC+ preferred. Low-hydrogen. MUST store in rod oven at 250–300°F. X-ray quality. For structural and critical work.

Reading the number:
📋 E = electrode. 60/70 = tensile strength × 1000 PSI. 1 = all-position. 0/8 = flux type.

⚠️ E7018 exposed to humidity for more than 4 hours → re-bake at 700°F for 1 hour, or discard.
🔧 Amperage: roughly 1A per 0.001" of electrode diameter. 1/8" = 90–140A typical.`,
  },
  {
    trade: 'WELDING',
    topic: 'MIG welder settings for mild steel',
    keywords: ['mig', 'gmaw', 'wire feed', 'mig settings', 'voltage wire speed', 'mig welding', 'wire speed', 'mig setup'],
    answer: `[OFFLINE — Cached] 🔧 MIG SETTINGS — MILD STEEL

Shielding gas: C25 (75% Ar / 25% CO2) for most work. Flow rate: 20–25 CFH.
Wire: ER70S-6 for mill scale or dirty steel. ER70S-3 for clean base metal.

Starting point guide (short circuit transfer):
0.030" wire, 1/8" plate: 16–18V, 200–250 IPM
0.035" wire, 3/16" plate: 18–20V, 220–280 IPM
0.045" wire, 1/4" plate: 20–23V, 260–320 IPM

Tuning:
🔧 Voltage too low → stubbing, spatter, incomplete fusion.
🔧 Voltage too high → excessive spatter, wide flat bead, burn-through on thin material.
🔧 WFS too low → narrow bead, insufficient fill. Too high → wire burns back to tip.

⚠️ MIG outdoors: wind kills shielding gas coverage. Use wind screens or switch to SMAW/FCAW-S.
🔧 Check tip-to-work distance: 3/8"–1/2" for short circuit. Keep consistent.`,
  },
  {
    trade: 'WELDING',
    topic: 'Weld visual inspection and common defects',
    keywords: ['weld inspection', 'undercut', 'porosity', 'slag inclusion', 'weld defect', 'inspect weld', 'weld quality', 'cold lap'],
    answer: `[OFFLINE — Cached] 🔧 VISUAL WELD INSPECTION

Check in order:
1. Cracks (worst defect — always reject and investigate cause before repair)
2. Undercut — groove at weld toe. Stress concentrator. Max 1/32" per AWS D1.1.
3. Overlap / cold lap — weld metal rolled over base without fusion. Reject.
4. Porosity — gas holes. Caused by contamination, moisture, shielding gas loss.
5. Slag inclusion — trapped flux. From insufficient inter-pass cleaning.
6. Incomplete fusion — visible gap or unfused edge, especially at fillet weld roots.

🔧 Clean each pass to bright metal before next pass. Wire brush minimum, grind if needed.
🔧 Inspect at correct angle and lighting. Straight-on viewing misses toe defects.
📋 AWS D1.1 Section 6: structural steel visual acceptance criteria.

⚠️ Any crack = stop welding. Find root cause. Preheat? Electrode? Base metal chemistry?`,
  },
  {
    trade: 'WELDING',
    topic: 'Welding PPE and safety requirements',
    keywords: ['welding helmet', 'lens shade', 'welding ppe', 'arc flash welding', 'welding safety', 'auto darkening', 'helmet shade'],
    answer: `[OFFLINE — Cached] ⚠️ WELDING PPE — NON-NEGOTIABLE

Helmet:
🔧 MIG/Stick: minimum shade 10. Heavy amperage: shade 12–14.
🔧 TIG thin material: shade 8–10. Gas welding: shade 5–6.
✅ Auto-darkening helmets: verify sensitivity and switching speed (1/25,000s or faster).

Body protection:
🔧 Leather or FR cotton jacket/sleeves. No synthetics — they melt.
🔧 Leather welding gloves. Heavier for MIG/stick, thinner for TIG.
🔧 Leather boots. No exposed laces. No sneakers.

Fume control:
⚠️ Zinc from galvanized → metal fume fever. Hexavalent chromium from stainless → carcinogen.
🔧 Work with exhaust behind you, pulling fumes away from breathing zone.
🔧 Respirator required for galvanized, stainless, coated metals, and confined spaces.

⚠️ Bystanders: 35-foot arc flash zone. Everyone within range needs protection.
🔧 Fire watch required 30 minutes after welding stops in high-risk areas.`,
  },
];

/**
 * Match a user message to a cached offline answer.
 * Optionally filters by trade — when trade is provided, only that trade's entries are searched.
 * Returns the cached answer string, or null if no match.
 */
export function matchOfflineQuery(userMessage: string, trade?: string): string | null {
  const lower = userMessage.toLowerCase();
  const entries = trade
    ? OFFLINE_KNOWLEDGE.filter((e) => e.trade === trade)
    : OFFLINE_KNOWLEDGE;

  for (const entry of entries) {
    const matched = entry.keywords.some((kw) => lower.includes(kw.toLowerCase()));
    if (matched) return entry.answer;
  }

  return null;
}
