import Link from 'next/link';

import DebriefReplay from '@/components/DebriefReplay';
import { DEMO_DEBRIEF, DEMO_SHOP_NAME } from '@act/domain';

export const dynamic = 'force-dynamic';

/**
 * Demo only. Live debriefs happen on the moment page, where act-api drafts
 * the question and records the expert's answer against a real recording.
 */
export default function DebriefDemoPage() {
  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <div className="row between wrap gap-16">
          <div className="col gap-8">
            <h1 className="h1">A callback becomes a case</h1>
            <div className="muted">
              After the job, one question at a time, for the first thing the case is missing. The
              expert talks. Nothing is written that nobody said.
            </div>
          </div>
          <span className="pill warn">demo · {DEMO_SHOP_NAME}</span>
        </div>
        <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
          Replay of a fictional debrief. The transcript and answers were written for the demo.
          Nothing here is recorded. Live debriefs run from the <Link href="/">review queue</Link>.
        </div>
      </header>
      <DebriefReplay script={DEMO_DEBRIEF} />
    </div>
  );
}
