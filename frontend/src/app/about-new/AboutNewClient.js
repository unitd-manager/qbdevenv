'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WP_UPLOADS = `${(process.env.NEXT_PUBLIC_WP_URL || 'https://qbadevadmin.unitdtechnologies.com').trim().replace(/\/+$/, '')}/wp-content/uploads`;

// Photos: existing About page photos, cut out and placed on a shared gray background. LinkedIn links come from the existing About page (WordPress 'about_team_section'), matched by name.
// tier 1 = founder, 2 = executive team, 3 = leadership team. Add a 'quote' when the approved quotes arrive.
const leaders = [
  { name: 'Mahesh Vinayagam', title: 'CEO and Founder', tier: 1, photo: '/assets/images/leaders/mahesh-vinayagam.webp', linkedin: 'https://www.linkedin.com/in/maheshvinayagam/' },
  { name: 'Bejoe Mathew', title: 'Chief Strategy Officer', tier: 2, photo: '/assets/images/leaders/bejoe-mathew.webp', linkedin: 'https://www.linkedin.com/in/bejoe-mathew-41450a14b' },
  { name: 'Dominic Bartola', title: 'Chief Marketing Officer', tier: 2, photo: '/assets/images/leaders/dominic-bartola.webp', linkedin: 'https://www.linkedin.com/in/dominicbartola' },
  { name: 'Sathyanarayanan', title: 'Chief Growth Officer', tier: 2, photo: '/assets/images/leaders/sathyanarayanan.webp', linkedin: 'https://www.linkedin.com/in/sethusathya' },
  { name: 'Manu Paul', title: 'Chief Financial Officer', tier: 2, photo: '/assets/images/leaders/manu-paul.webp', linkedin: 'https://www.linkedin.com/in/manu-paul-0730a91' },
  { name: 'Vidyasagar C', title: 'AVP, Operations', tier: 3, photo: '/assets/images/leaders/vidyasagar-c.webp', linkedin: 'https://www.linkedin.com/in/vidyasagarc' },
  { name: 'Russel Alfeche', title: 'Technology Lead, RPA and AI', tier: 3, photo: '/assets/images/leaders/russel-alfeche.webp', linkedin: 'https://www.linkedin.com/in/russel-alfeche' },
  { name: 'Tricia D’souza', title: 'Global HR Manager', tier: 3, photo: '/assets/images/leaders/tricia-dsouza.webp', linkedin: 'https://www.linkedin.com/in/tricia-dsouza' },
  { name: 'Selva', title: 'SVP of Healthcare', tier: 3, photo: '/assets/images/leaders/selva.webp', linkedin: '' },
];

const leaderTiers = [1, 2, 3].map((tier) => leaders.filter((l) => l.tier === tier));

function LinkedInIcon() {
  return (
    <svg className="li-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
      />
    </svg>
  );
}

function LeaderCard({ leader }) {
  const body = (
    <>
      <span className="leader-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={leader.photo} alt={leader.name} loading="lazy" width="480" height="480" />
      </span>
      <strong>{leader.name}</strong>
      <small>{leader.title}</small>
      {leader.quote ? <q>{leader.quote}</q> : null}
      {leader.linkedin ? (
        <span className="leader-li">
          <LinkedInIcon />
          LinkedIn
        </span>
      ) : null}
    </>
  );
  return leader.linkedin ? (
    <a
      className="leader-card is-link"
      href={leader.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${leader.name}, ${leader.title} – LinkedIn profile (opens in a new tab)`}
    >
      {body}
    </a>
  ) : (
    <div className="leader-card">{body}</div>
  );
}

const locations = [
  {
    country: 'usa',
    img: `${WP_UPLOADS}/2025/09/nils-huenerfuerst-RcDEbNQsjHU-unsplash-1.webp`,
    label: 'United States',
    city: 'Phoenix',
    region: 'Arizona, USA',
    tz: 'America/Phoenix',
  },
  {
    country: 'india',
    img: `${WP_UPLOADS}/2025/09/ahamed-sameel-8T7urQLgX6g-unsplash-1.webp`,
    label: 'India',
    city: 'Chennai',
    region: 'Tamil Nadu, India',
    tz: 'Asia/Kolkata',
  },
  {
    country: 'canada',
    img: `${WP_UPLOADS}/2025/09/quebec-city-skyline-river-with-blue-sky-cloud-2.webp`,
    label: 'Canada',
    city: 'New Brunswick',
    region: 'Canada',
    tz: 'America/Moncton',
  },
];

const localTime = (date, timeZone) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(date);

export default function AboutNewClient() {
  const [tab, setTab] = useState('programs');
  const [country, setCountry] = useState('usa');
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const cls = (base, on) => (on ? `${base} active` : base);

  return (
    <div className="qb-about">
      <section className="hero">
        {/* Sample hero video: slow-zoom montage of the existing About page photos. Swap for approved team footage. */}
        <video className="hero-video" autoPlay muted loop playsInline preload="metadata" poster="/assets/video/about-hero-poster.jpg" aria-hidden="true" tabIndex={-1}>
          <source src="/assets/video/about-hero.mp4" type="video/mp4" />
        </video>
        <div className="container">
          <div className="eyebrow">ABOUT QBOTICA · THE PEOPLE BEHIND THE EXECUTION</div>
          <h1>
            Built for innovation.
            <br />
            Driven by people.
          </h1>
          <p>
            Behind every transformation is a team of people who believe in making work better. Discover the
            leadership, values, culture and community that shape qBotica.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#story">Discover Our Story ↓</a>
            <a className="btn ghost" href="#impact">See Our Impact ↓</a>
            <a className="btn ghost" href="#origins">Discover Our Origins ↓</a>
          </div>
          <div className="hero-proof">
            <div className="proof">UiPath Diamond Partner</div>
            <div className="proof">Enterprise automation expertise</div>
            <div className="proof">U.S. + India collaboration</div>
          </div>
        </div>
      </section>

      <section className="section scroll" id="story">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">WHO WE ARE</div>
              <h2>Technology moves forward. People make it possible.</h2>
            </div>
          </div>
          <div className="story-grid">
            <article className="panel feature">
              <div className="kicker" style={{ color: '#f7a56e' }}>Our purpose</div>
              <h3 style={{ fontSize: 29, margin: '10px 0' }}>
                Enabling organizations to become automation and future ready.
              </h3>
              <p>
                Our people bring together intelligent automation, AI, practical delivery and the curiosity to rethink
                how work gets done.
              </p>
              <div className="tags">
                <span className="tag">Innovation</span>
                <span className="tag">Partnership</span>
                <span className="tag">Execution</span>
              </div>
            </article>
            <article className="panel">
              <div className="kicker">Recognition &amp; credibility</div>
              <h3>Certified. Trusted. Forward-looking.</h3>
              <p>qBotica&apos;s UiPath Diamond Partner status reflects its advanced automation practice and technical expertise.</p>
              <p>See how our expertise translates into outcomes for customers.</p>
              <Link className="textlink" href="/customer-success-stories">Explore customer success stories ↗</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section alt scroll" id="leadership">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">OUR LEADERSHIP</div>
              <h2>Meet the people leading qBotica.</h2>
            </div>
          </div>
          <div className="leader-tree">
            {leaderTiers.map((tier, i) => (
              <div className={`leader-tier tier-${i + 1}`} key={tier[0].name}>
                {tier.map((leader) => (
                  <LeaderCard leader={leader} key={leader.name} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section scroll" id="values">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">COMPANY ETHOS</div>
              <h2>Four values. One shared mindset.</h2>
            </div>
          </div>
          <div className="values">
            <article className="value">
              <div className="symbol">✦</div>
              <h3>Innovative</h3>
              <p>We challenge convention and find imaginative approaches to automation.</p>
            </article>
            <article className="value">
              <div className="symbol">↗</div>
              <h3>Bold</h3>
              <p>We embrace new ideas, explore opportunities and act with courage.</p>
            </article>
            <article className="value">
              <div className="symbol">◇</div>
              <h3>Smart</h3>
              <p>We combine experience, intelligence and efficiency to work with purpose.</p>
            </article>
            <article className="value">
              <div className="symbol">♡</div>
              <h3>Kind</h3>
              <p>We value empathy, understanding and inclusive relationships.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section alt scroll" id="people">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">LIFE AT QBOTICA</div>
              <h2>Our culture is something we build together.</h2>
            </div>
          </div>
          <div className="culture-grid">
            <article className="culture">
              <div className="media-placeholder">APPROVED WELLNESS PHOTO</div>
              <div className="body">
                <h3>Well-being &amp; support</h3>
                <p>Internal wellness and learning sessions that support employees as people, not just professionals.</p>
              </div>
            </article>
            <article className="culture">
              <div className="media-placeholder">APPROVED TEAM PHOTO</div>
              <div className="body">
                <h3>Connection &amp; celebration</h3>
                <p>Team activities, cultural moments and opportunities to share personal talents and interests.</p>
              </div>
            </article>
            <article className="culture">
              <div className="media-placeholder">APPROVED MENTORSHIP PHOTO</div>
              <div className="body">
                <h3>Growth &amp; opportunity</h3>
                <p>Mentorship, professional development and a culture of learning and collaboration.</p>
              </div>
            </article>
          </div>
          <div
            className="panel"
            style={{ marginTop: 19, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}
          >
            <div>
              <h3 style={{ margin: '0 0 4px' }}>Join our winning team</h3>
              <p style={{ margin: 0 }}>Explore opportunities to grow with qBotica.</p>
            </div>
            <Link className="btn primary" href="/careers">Explore Careers ↗</Link>
          </div>
        </div>
      </section>

      <section className="section scroll" id="inclusion">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">DIVERSITY &amp; OPPORTUNITY</div>
              <h2>Different perspectives. Stronger together.</h2>
            </div>
          </div>
          <div aria-label="Inclusion topics" className="tabs" role="tablist">
            <button type="button" role="tab" className="tab" aria-selected={tab === 'programs'} onClick={() => setTab('programs')}>
              Our programs
            </button>
            <button type="button" role="tab" className="tab" aria-selected={tab === 'commitment'} onClick={() => setTab('commitment')}>
              Our commitment
            </button>
          </div>
          <div className={cls('tab-panel', tab === 'programs')} id="programs" role="tabpanel">
            <div className="initiative-grid">
              <article className="initiative">
                <h3>Women&apos;s Reboot Program</h3>
                <p>Training, mentoring and networking opportunities to support women returning to careers in technology.</p>
              </article>
              <article className="initiative">
                <h3>Employee Resource Groups</h3>
                <p>Voluntary employee-led groups creating space for connection, shared experiences and support.</p>
              </article>
              <article className="initiative">
                <h3>Diverse hiring practices</h3>
                <p>Inclusive recruitment and pathways to experience through internships and apprenticeships.</p>
              </article>
              <article className="initiative">
                <h3>Inclusion training</h3>
                <p>Employee education and conversations designed to build an inclusive, respectful workplace.</p>
              </article>
            </div>
          </div>
          <div className={cls('tab-panel', tab === 'commitment')} id="commitment" role="tabpanel">
            <div className="panel">
              <h3>Inclusion is part of how we work.</h3>
              <p>
                qBotica&apos;s existing page describes its commitment to welcoming people across backgrounds, supporting
                open dialogue, and engaging with communities through volunteering and leadership.
              </p>
              <p>This content should retain its original intent and be reviewed with HR before publication.</p>
            </div>
          </div>
          <div className="quote">
            “Diversity and inclusion are not just buzzwords at qBotica, they are the foundation of our success.”
            <small>— Mahesh Vinayagam, CEO of qBotica · Excerpt from existing About Us page</small>
          </div>
        </div>
      </section>

      <section className="section alt scroll" id="impact">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">COMMUNITY &amp; IMPACT</div>
              <h2>Making an impact beyond technology.</h2>
            </div>
          </div>
          <div className="community-layout">
            <article className="community-card">
              <div className="kicker">EDUCATION &amp; MENTORSHIP</div>
              <h3>Investing in the next generation</h3>
              <p>
                Mentorship, internships and hands-on learning opportunities connect emerging talent with experience in
                automation and AI.
              </p>
              <details className="accordion">
                <summary>How we support emerging talent</summary>
                <p>
                  qBotica&apos;s current About Us page describes guidance for students, young professionals and
                  entrepreneurs, along with internships that provide exposure to real projects.
                </p>
              </details>
            </article>
            <article className="community-card">
              <div className="kicker">PARTNERSHIPS</div>
              <h3>Connecting opportunity with innovation</h3>
              <p>
                Our current page features YLAI and Arizona State University as examples of qBotica&apos;s commitment to
                education and entrepreneurial development.
              </p>
              <details className="accordion">
                <summary>Explore partnership details</summary>
                <p>
                  YLAI focuses on emerging entrepreneurs. qBotica&apos;s ASU relationship emphasizes mentorship,
                  collaboration and practical exposure to intelligent automation.
                </p>
              </details>
            </article>
          </div>
          <div className="panel" style={{ marginTop: 17 }}>
            <div className="kicker">FUTURE STORY GALLERY</div>
            <h3>Community stories worth sharing</h3>
            <p>
              As verified U.S. and India CSR activities become available, this area can feature three rotating stories
              with approved photographs, short captions and links to deeper coverage. This avoids turning About Us into
              an endless events archive.
            </p>
            <div className="tags">
              {['Volunteering', 'Mentorship', 'Education'].map((t) => (
                <span key={t} className="tag" style={{ borderColor: '#d5deea', color: '#405875' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section scroll" id="locations">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">OUR GLOBAL PRESENCE</div>
              <h2>Connected across locations and teams.</h2>
            </div>
          </div>
          <div className="loc-stage">
            {locations.map((loc) => (
              <button
                key={loc.country}
                type="button"
                className={cls('loc-pane', country === loc.country)}
                aria-pressed={country === loc.country}
                onClick={() => setCountry(loc.country)}
                onMouseEnter={() => setCountry(loc.country)}
                onFocus={() => setCountry(loc.country)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={loc.img} alt="" loading="lazy" />
                <span className="loc-shade" />
                <span className="loc-top">
                  <span className="loc-pill">{loc.label}</span>
                  <span className="loc-time">
                    <b>{now ? localTime(now, loc.tz) : '--:--'}</b>
                    <small>Local time</small>
                  </span>
                </span>
                <span className="loc-bottom">
                  <span className="loc-city">{loc.city}</span>
                  <span className="loc-region">{loc.region}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt scroll" id="origins">
        <div className="container">
          <div className="head">
            <div>
              <div className="kicker">OUR ORIGINS</div>
              <h2>How qBotica began.</h2>
            </div>
          </div>
          {/* DRAFT: the first two cards are placeholders until qBotica supplies the approved history. */}
          <ol className="origins">
            <li className="origin is-draft">
              <span className="origin-step">01</span>
              <h3>Where it started</h3>
              <p>Founding story to be added: the year, the place and the idea qBotica was built on.</p>
            </li>
            <li className="origin is-draft">
              <span className="origin-step">02</span>
              <h3>How we grew</h3>
              <p>Key milestones to be added: new teams, offices, partnerships and customer wins.</p>
            </li>
            <li className="origin">
              <span className="origin-step">03</span>
              <h3>Where we are today</h3>
              <p>
                An Intelligent Automation as a Service provider and UiPath Diamond Partner, building an automation
                ecosystem for our customers.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="footer-cta">
        <div className="container">
          <div className="kicker" style={{ color: '#f5a571' }}>CONTINUE THE QBOTICA STORY</div>
          <h2>
            See what our people
            <br />
            make possible.
          </h2>
          <p>
            From company culture to real customer outcomes, discover how qBotica turns ambitious ideas into meaningful
            execution.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" href="/customer-success-stories">Customer Stories ↗</Link>
            <Link className="btn ghost" href="/newsroom">Newsroom ↗</Link>
            <Link className="btn ghost" href="/careers">Careers ↗</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
