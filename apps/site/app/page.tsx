/**
 * ACT Capture marketing site.
 *
 * The first viewport must make the product obvious: a field recording becomes
 * a reviewed HVAC lesson. Keep the buyer promise concrete and do not drift into
 * live-copilot positioning.
 */
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL;
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL;
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'maniraharie075@gmail.com';

function StoreBadge({
  href,
  small,
  big,
}: {
  href: string | undefined;
  small: string;
  big: string;
}) {
  if (!href) {
    return (
      <span className="storeBadge soon" aria-disabled>
        <small>{small}</small>
        <strong>{big} soon</strong>
      </span>
    );
  }
  return (
    <a className="storeBadge" href={href}>
      <small>{small}</small>
      <strong>{big}</strong>
    </a>
  );
}

const pipeline = [
  ['01', 'Record', 'Senior tech captures a real diagnostic call.'],
  ['02', 'Mark', 'One tap when company-specific judgment shows up.'],
  ['03', 'Debrief', 'ACT asks the expert after the job, never during it.'],
  ['04', 'Review', 'Lead tech approves the moment and the lesson.'],
  ['05', 'Learn', 'Apprentices study the cue, reasoning, trap, and safety line.'],
  ['06', 'Measure', 'Outcomes tie training back to callbacks and ramp.'],
] as const;

const users = [
  ['Senior tech', 'Records the job and explains the why in their own words.'],
  ['Lead tech', 'Approves only the moments that match company practice.'],
  ['Apprentice', 'Learns from reviewed cards built from real calls.'],
  ['Ops director', 'Sees whether the library is moving callback and ramp signals.'],
] as const;

const agents = [
  ['Moment detection', 'Marks + transcript + frames surface candidate teaching moments.'],
  ['Debrief question', 'One sharp question captures the expert reasoning.'],
  ['Training compiler', 'Turns evidence and answers into a structured lesson card.'],
  ['Safety reviewer', 'Flags unsafe or unsupported claims before publish.'],
  ['Ask ACT', 'Answers from published cards only, with citations.'],
  ['Weekly report', 'Summarizes pilot output and operating signals.'],
] as const;

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="heroScene" aria-hidden="true">
          <div className="phoneMock">
            <div className="phoneTop">
              <span>HVAC CAPTURE</span>
              <span>02:14</span>
            </div>
            <div className="videoFrame">
              <div className="roofLine" />
              <div className="rtu">
                <div className="fan" />
                <div className="coil" />
              </div>
              <div className="gaugeCluster">
                <span />
                <span />
              </div>
            </div>
            <div className="markButton">MARK TEACHABLE MOMENT</div>
            <div className="phoneMeta">
              <span>NO-COOL</span>
              <span>AIRFLOW CUE</span>
            </div>
          </div>

          <div className="lessonObject">
            <span className="objectLabel">REVIEWED LESSON</span>
            <strong>Warm return + frosted suction line</strong>
            <div className="objectRule">Check airflow before charge.</div>
            <div className="objectTrap">Novice trap: adding refrigerant first.</div>
            <div className="objectSafety">Safety: recover before opening the line.</div>
          </div>
        </div>

        <div className="heroCopy">
          <p className="heroKicker">ACT Capture for HVAC operators</p>
          <h1>Capture how your best techs think on real calls.</h1>
          <p className="lede">
            ACT turns senior technician ride-alongs into reviewed, company-specific
            training cards for new techs. The product happens after the job:
            capture, debrief, review, publish, measure.
          </p>
          <div className="heroActions">
            <a className="pilotCta" href="#pilot">
              Book a 60-day pilot
            </a>
            <StoreBadge href={APP_STORE_URL} small="Download on the" big="App Store" />
            <StoreBadge href={PLAY_STORE_URL} small="Get it on" big="Google Play" />
          </div>
          <div className="trustRail">
            <span>Not a live diagnostic copilot</span>
            <span>Lead-tech publish gate</span>
            <span>Built around callback reduction</span>
          </div>
        </div>
      </section>

      <section className="section pipelineSection" id="how">
        <div className="sectionHead">
          <p className="sectionLabel">Pilot loop</p>
          <h2>One field call becomes one reusable training object.</h2>
        </div>
        <div className="pipeline">
          {pipeline.map(([num, title, body]) => (
            <div className="pipeStep" key={title}>
              <span>{num}</span>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section objectSection" id="library">
        <div className="sectionHead">
          <p className="sectionLabel">The training object</p>
          <h2>Generic catalogs teach the textbook. ACT captures the tribal layer.</h2>
          <p className="sectionCopy">
            Each card is anchored to a real job: what the expert noticed, what a
            newer tech would misread, what safety boundary matters, and how to check
            transfer with a quick quiz.
          </p>
        </div>

        <div className="trainingObject">
          <div className="objectHeader">
            <span className="objectLabel">EXAMPLE CARD - TEACHABLE MOMENT 2:01</span>
            <h3>Frost on the suction line means airflow first, not charge</h3>
            <span className="costChip">CALLBACK AVOIDED - COMPRESSOR PROTECTED</span>
          </div>
          <div className="objectGrid">
            <Field label="Observable cue" value="Warm return air, frost at suction line, blower sounds strained." />
            <Field label="Expert reasoning" value="Low charge can frost too, but warm return points to starved airflow. Verify filter and static pressure before refrigerant." />
            <Field label="Decision" value="Stop the charge path. Prove airflow first." />
            <Field label="Verification" value="Check filter, blower wheel, static pressure, then re-check split." />
          </div>
          <div className="trapBand">
            <span className="blockLabel">Novice trap</span>
            Adding refrigerant to a starved coil can overcharge the system and damage the compressor.
          </div>
          <div className="lockout">
            <span className="blockLabel">Safety boundary</span>
            Recover refrigerant before opening a line. Do not vent. Follow EPA 608.
          </div>
        </div>
      </section>

      <section className="section peopleSection">
        <div className="sectionHead">
          <p className="sectionLabel">Who uses it</p>
          <h2>Designed for the branch, not for a solo shop.</h2>
        </div>
        <div className="peopleGrid">
          {users.map(([title, body]) => (
            <div className="personCard" key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionHead">
          <p className="sectionLabel">Behind the scenes</p>
          <h2>AI agents do the paperwork. Your people keep the judgment.</h2>
        </div>
        <div className="agentStrip">
          {agents.map(([title, body]) => (
            <div className="agentItem" key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="pilot" className="pilotWrap">
        <div className="pilotPanel">
          <p className="sectionLabel">60-day concierge pilot</p>
          <h2>Start with one HVAC branch, one senior tech, and real callback pain.</h2>
          <p>
            We help your team capture 20 jobs, publish 50 reviewed cards, and run a
            learner readout against the operating metrics you already track.
          </p>
          <a className="pilotCta" href={`mailto:${CONTACT}?subject=ACT%20Capture%20HVAC%20pilot`}>
            Book a pilot
          </a>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="objectField">
      <span className="blockLabel">{label}</span>
      <p>{value}</p>
    </div>
  );
}
