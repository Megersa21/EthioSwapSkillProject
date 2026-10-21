import { Link } from 'react-router-dom';
import '../styles/InformationPage.css';

const rules = [
  {
    number: '01',
    title: 'Treat everyone with respect',
    description:
      'Be polite, patient, and welcoming. People have different backgrounds and experience levels, and everyone deserves a positive learning environment.',
    icon: '🤝',
  },
  {
    number: '02',
    title: 'Be honest about your skills',
    description:
      'Describe what you can teach accurately and be clear about what you want to learn. Set realistic expectations and communicate openly.',
    icon: '🎯',
  },
  {
    number: '03',
    title: 'Respect agreed schedules',
    description:
      'Arrive on time for skill-sharing sessions. If you cannot attend, let your partner know as early as possible and agree on another time.',
    icon: '🗓️',
  },
  {
    number: '04',
    title: 'Protect personal information',
    description:
      'Do not share another member’s private messages, contact details, photographs, or other personal information without their permission.',
    icon: '🔐',
  },
  {
    number: '05',
    title: 'Keep communication appropriate',
    description:
      'Do not harass, threaten, discriminate against, or pressure other members. Unwanted romantic advances, abusive language, and repeated unwanted contact are not acceptable.',
    icon: '💬',
  },
  {
    number: '06',
    title: 'Keep skill exchanges safe',
    description:
      'Never pressure someone to share passwords, financial details, verification codes, or money. Be cautious about links and requests that seem suspicious.',
    icon: '🛡️',
  },
  {
    number: '07',
    title: 'Report harmful behavior',
    description:
      'If someone violates these rules, use available reporting features or contact the platform team. Provide accurate information and do not submit knowingly false reports.',
    icon: '🚩',
  },
  {
    number: '08',
    title: 'Give constructive feedback',
    description:
      'Share honest, helpful reviews based on real experiences. Do not use reviews to threaten, insult, or retaliate against another member.',
    icon: '⭐',
  },
];

export default function CommunityRules() {
  return (
    <main className="information-page">
      <section className="information-hero">
        <span className="information-eyebrow">OUR COMMUNITY</span>
        <h1>
          Learn together. <span>Respect always.</span>
        </h1>
        <p>
          EthioSwapSkill is a place to share knowledge, discover new abilities,
          and help each other grow. These guidelines help everyone feel welcome
          and safe.
        </p>
        <div className="information-hero-actions">
          <Link to="/discover" className="information-primary-button">
            Explore skills <span aria-hidden="true">→</span>
          </Link>
          <Link to="/contact" className="information-secondary-button">
            Need help?
          </Link>
        </div>
      </section>

      <section className="information-content">
        <div className="information-section-heading">
          <span className="information-eyebrow">THE GUIDELINES</span>
          <h2>How we learn better together</h2>
          <p>
            Every member helps create a respectful, trustworthy skill-sharing
            community.
          </p>
        </div>

        <div className="rules-grid">
          {rules.map((rule) => (
            <article className="rule-card" key={rule.number}>
              <div className="rule-card-top">
                <span className="rule-icon" aria-hidden="true">
                  {rule.icon}
                </span>
                <span className="rule-number">{rule.number}</span>
              </div>
              <h3>{rule.title}</h3>
              <p>{rule.description}</p>
            </article>
          ))}
        </div>

        <div className="information-callout">
          <div>
            <h3>Something doesn't feel right?</h3>
            <p>
              If you experience harassment, suspicious behavior, or another
              safety concern, contact the platform team.
            </p>
          </div>
          <Link to="/contact" className="information-primary-button">
            Contact us <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p className="information-disclaimer">
          These guidelines describe the expected behavior of EthioSwapSkill
          members. Platform enforcement depends on the reporting and moderation
          features actually available on the service.
        </p>
      </section>
    </main>
  );
}
