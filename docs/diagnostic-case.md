# DiagnosticCase

The primary product object. A published lesson card can be *rendered from* a
case. A case cannot be reconstructed from a quiz.

Actober is a company-specific diagnostic apprenticeship and technician-readiness
system for HVAC. It turns real callbacks, hard service calls, and field evidence
into verified diagnostic cases that technicians practice — so they learn to
reason, not just read the answer — and it shows managers which job types each
technician is ready to handle independently.

## This slice

`packages/domain` is the contract. Existing `knowledge_objects` map onto a case
without a backend rewrite. Missing fields stay missing; they are not invented.

**Episode types:** callback, near miss, hard diagnosis, adaptation, proficiency.

**Debrief:** one targeted question at a time, from the first missing field
(cue → hypothesis → discriminating test → causal link → boundary → verification
→ novice trap).

**Practice:** safety gate → learner commit → challenge → expert comparison →
reflection. The model may draft; it does not publish, score readiness, or
diagnose a live job.

**Not in this slice:** readiness matrix, delayed-variant scheduler, API schema
migration, glasses, multi-agent compile.
