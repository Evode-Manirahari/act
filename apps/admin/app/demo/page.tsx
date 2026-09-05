import Link from 'next/link';

import { DEMO_SHOP_NAME, demoShop, diagnosticCaseFromKnowledgeObject, EPISODE_LABEL } from '@act/domain';

export const dynamic = 'force-dynamic';

/**
 * The walkthrough a founder runs for a prospective shop before that shop has
 * captured anything. Every screen it links to is labelled demo and records
 * nothing.
 */
export default function DemoPage() {
  const shop = demoShop(new Date());
  const cases = shop.cards.map(diagnosticCaseFromKnowledgeObject);
  const learner = shop.techs.find((tech) => tech.id === shop.learnerId);

  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <div className="row between wrap gap-16">
          <div className="col gap-8">
            <h1 className="h1">Demo shop</h1>
            <div className="muted">
              {DEMO_SHOP_NAME}. Six cases a senior tech debriefed, two developing techs practicing
              them, and the manager view that comes out the other end.
            </div>
          </div>
          <span className="pill warn">fictional · records nothing</span>
        </div>
        <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
          The cases were written for this demo, not captured on a job. Names, jobs, and callbacks
          are invented. This page exists to show the loop, not to count as traction.
        </div>
      </header>

      <section className="col gap-16">
        <div className="h2">Run it in this order</div>
        <ol className="col gap-16" style={{ paddingLeft: 20 }}>
          <Step
            title="A callback becomes a case"
            body="Ray's second visit to a frosted suction line. The first tech added refrigerant. Replay the debrief: one question at a time for the first missing field, an answer that gets refused because it is the moment's own labels, and a grounding check every claim has to pass before a lead tech sees it."
            href="/debrief"
            cta="Replay the debrief"
          />
          <Step
            title={`${learner?.name ?? 'The apprentice'} commits before seeing the expert`}
            body="Safety gate, then cue, hypothesis, next test, and why. Then the challenge: what would make you wrong? Only after that does the expert's reasoning appear, side by side with hers. No score."
            href="/learn?demo=1"
            cta="Practice as the learner"
          />
          <Step
            title="A week later the variant is due"
            body="The airflow case comes back 7–14 days after first practice, title hidden. Passing the case once shows she can reason. Passing the variant shows it stuck. Only the second one is evidence of transfer."
            href="/learn?demo=1"
            cta="See the variant due"
          />
          <Step
            title="The manager sees where to look"
            body="Technician × work activity. Each cell counts practice, variants, field jobs, and callbacks. The level in the cell is set by the manager. Orange edges show where evidence moved since she last decided."
            href="/readiness?demo=1"
            cta="Open the readiness matrix"
          />
          <Step
            title="Set a level, with the reason the tech will read"
            body="Open Maya. Refrigerant charge has practice evidence and no level. The manager sets it and writes one line. Nothing in the system picks a level for her."
            href={`/readiness?demo=1&tech=${shop.learnerId}`}
            cta="Open the learner's row"
          />
        </ol>
      </section>

      <section className="col gap-8">
        <div className="h2">Cases in the demo</div>
        <div className="col gap-8">
          {cases.map((diag) => (
            <div key={diag.id} className="card row gap-16">
              <span className="pill">{EPISODE_LABEL[diag.episodeType]}</span>
              <div className="col grow" style={{ gap: 2 }}>
                <strong>{diag.title}</strong>
                <span className="muted" style={{ fontSize: 13 }}>{diag.presentingProblem}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="col gap-8">
        <div className="h2">What the demo does not do</div>
        <ul className="col gap-8" style={{ paddingLeft: 20 }}>
          <li>Diagnose a live job. Ask ACT is hidden in demo mode because the demo cases are not in the published library.</li>
          <li>Write the expert&apos;s answer. The debrief asks; the grounding check refuses anything nobody said.</li>
          <li>Score readiness. Cells count evidence; the manager sets the level.</li>
          <li>Write anything. Demo ids never reach act-api.</li>
        </ul>
      </section>
    </div>
  );
}

function Step({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <li className="col gap-8">
      <strong>{title}</strong>
      <span className="muted" style={{ fontSize: 14 }}>{body}</span>
      <Link href={href} style={{ fontWeight: 600 }}>{cta} ›</Link>
    </li>
  );
}
