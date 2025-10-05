import { Link } from 'react-router-dom';

const stats = [
  { label: 'Response time', value: '4 min', description: 'Average first reply when routed through our automation layer.' },
  { label: 'Customer satisfaction', value: '97%', description: 'Based on quarterly CSAT analysis across enterprise deployments.' },
  { label: 'Time saved weekly', value: '42 hrs', description: 'Manual triage hours eliminated by adaptive workflows and macros.' },
];

const features = [
  {
    title: 'Precision triage engine',
    description:
      'Blend AI-driven intent detection with human-in-the-loop controls to keep every request on the optimal path.',
    points: ['Adaptive routing rules', 'Real-time SLA risk scoring', 'Omnichannel intake coverage'],
  },
  {
    title: 'Unified workspace',
    description:
      'Equip agents with context-rich views, comment threads, and timeline intelligence without losing velocity.',
    points: ['Conversational timelines', 'Context-aware macros', 'Granular role policies'],
  },
  {
    title: 'Operational clarity',
    description:
      'Monitor SLA breaches before they happen with predictive dashboards and automated escalations.',
    points: ['Live workload map', 'Breach early-warning signals', 'Executive-ready reporting'],
  },
];

const testimonials = [
  {
    quote: 'Our backlog shrank by 63% in the first month. The handoffs now feel choreographed instead of chaotic.',
    name: 'Mira Chen',
    title: 'Director of Support, Northwind Labs',
  },
  {
    quote: 'We launched in six countries without adding headcount. The design keeps everyone focused and confident.',
    name: 'Julian Vega',
    title: 'Head of Customer Ops, Luma Retail',
  },
  {
    quote: 'Incident reviews went from days to hours. The system surfaces exactly what leadership needs to see.',
    name: 'Ibrahim Hassan',
    title: 'VP of Service Excellence, Orbital Cloud',
  },
];

const logos = ['Northwind', 'Luma', 'Orbital', 'Axiom', 'Helio'];

const LandingPage = () => {
  return (
    <div className="landing">
      <header className="landing-hero" role="banner">
        <div className="hero-backdrop" aria-hidden="true">
          <div className="hero-gradient" />
          <div className="hero-noise" />
        </div>
        <div className="container hero-content">
          <p className="eyebrow mono">Helpdesk, reimagined</p>
          <h1>Operate support with the calm precision of a design studio.</h1>
          <p className="lead">
            Give every agent the clarity, confidence, and cadence of an elite service team. Terrene OS keeps the rhythm consistent from first touch to final resolution.
          </p>
          <div className="hero-actions" role="group" aria-label="Primary calls to action">
            <Link className="primary" to="/register">
              Start in under 5 minutes
            </Link>
            <Link className="ghost" to="/tickets">
              Explore the console
            </Link>
          </div>
          <div className="hero-stats" role="list">
            {stats.map((stat) => (
              <article className="hero-stat" key={stat.label} role="listitem">
                <span className="mono label">{stat.label}</span>
                <span className="value">{stat.value}</span>
                <p>{stat.description}</p>
              </article>
            ))}
          </div>
        </div>
      </header>

      <section className="landing-section credibility" aria-labelledby="credibility-heading">
        <div className="container">
          <p id="credibility-heading" className="eyebrow mono">Trusted by fast-scaling teams</p>
          <div className="logo-row" role="list">
            {logos.map((logo) => (
              <span className="logo-chip" role="listitem" key={logo}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section features" aria-labelledby="features-heading">
        <div className="container">
          <div className="section-header">
            <p className="eyebrow mono">What you can orchestrate</p>
            <h2 id="features-heading">Bespoke flows with production-grade reliability.</h2>
            <p className="muted">
              Everything is tuned around the same grid, rhythm, and depth cues as the product UI. Spin up new patterns without breaking the calm.
            </p>
          </div>
          <div className="feature-grid" role="list">
            {features.map((feature) => (
              <article className="feature-card" role="listitem" key={feature.title}>
                <div className="feature-glow" aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>
                  {feature.points.map((point) => (
                    <li key={point}>
                      <span className="point-marker" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section narrative" aria-labelledby="narrative-heading">
        <div className="container narrative-grid">
          <div>
            <p className="eyebrow mono">Design-first operations</p>
            <h2 id="narrative-heading">Grid-aligned layouts keep critical work within reach.</h2>
          </div>
          <div className="flow-copy">
            <p>
              Terrene OS mirrors the cadence, spacing, and motion grammar of our studio portfolio. At runtime, that means dense context panels stay legible, while hover states express intent with subtle luminance shifts and shadow choreography.
            </p>
            <p>
              Cards, modals, and navigation snap to the same eight-point grid. Minimum spacing of 0.75rem keeps clusters tight, while macro padding of 3.5rem maintains breathing room for executive dashboards.
            </p>
            <p>
              Micro-interactions lean on softened cubic easing to keep transitions fluid. Focus rings are luminous and high-contrast, ensuring accessibility without sacrificing polish.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section testimonials" aria-labelledby="testimonials-heading">
        <div className="container">
          <div className="section-header">
            <p className="eyebrow mono">Field notes</p>
            <h2 id="testimonials-heading">Feedback from teams that ship calm, delightful service.</h2>
          </div>
          <div className="testimonial-grid" role="list">
            {testimonials.map((testimonial) => (
              <figure className="testimonial-card" role="listitem" key={testimonial.name}>
                <blockquote>&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <figcaption>
                  <span className="name">{testimonial.name}</span>
                  <span className="title">{testimonial.title}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section closing" aria-labelledby="closing-heading">
        <div className="container closing-inner">
          <div>
            <p className="eyebrow mono">Ready within one sprint</p>
            <h2 id="closing-heading">Launch a composed support hub that feels like the reference design.</h2>
          </div>
          <div className="closing-actions" role="group" aria-label="Final calls to action">
            <Link className="primary" to="/register">
              Provision workspace
            </Link>
            <Link className="ghost" to="/login">
              Log in to existing account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
