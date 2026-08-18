/**
 * Actober AI marketing site.
 *
 * The first viewport must make the product obvious: a field recording becomes
 * verified knowledge on every truck. The guidance techs get is always
 * verified, footage-backed, and lead-tech-approved — never improvised.
 *
 * The hero shows the capture screen and nothing else. It used to sit inside a
 * CSS-drawn rooftop — a div roof, a div RTU with a div fan and coil, div
 * gauges — under three stacked gradients. That is an illustration of HVAC, not
 * evidence of a product, and DESIGN.md rules out gradients and decorative
 * shapes outright. What survives is the one element that shows the real thing.
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
  ['06', 'Measure', 'Callbacks and time-to-diagnosis, tracked per card.'],
] as const;

const users = [
  ['Senior tech', 'Records the job and explains the why in their own words.'],
  ['Lead tech', 'Approves only the moments that match company practice.'],
  ['Apprentice', 'Learns from reviewed cards built from real calls.'],
  ['Ops director', 'Sees whether the library is moving callback and ramp signals.'],
] as const;

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="heroCopy">
          <p className="heroKicker">Actober AI · HVAC field capture</p>
          <h1>Your best techs film the job. Every truck gets their judgment.</h1>
          <p className="lede">
            Your senior techs pass on what they know without writing a word. Actober
            records the real call, asks one sharp question after the job, and turns
            the answer into a reviewed card the rest of your techs learn from — with
            the original footage attached as proof.
          </p>
          <div className="heroActions">
            <a className="pilotCta" href="#pilot">
              Book a 60-day pilot
            </a>
            <StoreBadge href={APP_STORE_URL} small="Download on the" big="App Store" />
            <StoreBadge href={PLAY_STORE_URL} small="Get it on" big="Google Play" />
          </div>
          <div className="trustRail">
            <span>Footage-backed answers, never improvised</span>
            <span>Nothing publishes without a lead tech</span>
          </div>
        </div>

        <div className="phoneMock" aria-hidden="true">
          <div className="phoneTop">
            <span>HVAC CAPTURE</span>
            <span>02:14</span>
          </div>
          <div className="videoFrame">
            <span className="recDot">REC</span>
          </div>
          <div className="markButton">MARK TEACHABLE MOMENT</div>
          <div className="phoneMeta">
            <span>NO-COOL</span>
            <span>AIRFLOW CUE</span>
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
            <span className="objectLabel">EXAMPLE CARD · TEACHABLE MOMENT 2:01</span>
            <h3>Frost on the suction line means airflow first, not charge</h3>
            <span className="costChip">CALLBACK AVOIDED · COMPRESSOR PROTECTED</span>
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
