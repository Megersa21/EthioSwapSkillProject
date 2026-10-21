import { Link } from 'react-router-dom';
import '../styles/InformationPage.css';

const privacySections = [
  {
    number: '01',
    title: 'Information you provide',
    text: 'When you create an account or use EthioSwapSkill, you may provide information such as your name, profile details, location, skills you can teach, skills you want to learn, availability, and messages shared with other members.',
  },
  {
    number: '02',
    title: 'How information is used',
    text: 'Information you provide can help operate your account, display your skill profile, connect you with potential skill-sharing partners, manage swap requests and sessions, and support communication between members.',
  },
  {
    number: '03',
    title: 'Profiles and visibility',
    text: 'Information displayed on your profile may be visible to other people using the platform. Avoid adding sensitive personal information to your profile, skill descriptions, or public messages.',
  },
  {
    number: '04',
    title: 'Messages and notifications',
    text: 'Messages and notifications help members communicate about skill exchanges. Be thoughtful about what you share, and do not send passwords, financial details, or other confidential information through chat.',
  },
  {
    number: '05',
    title: 'Account security',
    text: 'Keep your password private and sign out when using a shared device. If you suspect that someone has accessed your account without permission, contact the platform team for assistance.',
  },
  {
    number: '06',
    title: 'Sharing with other people',
    text: 'EthioSwapSkill is designed to help people connect and exchange skills. Other members may use information you choose to share with them. Share only what you are comfortable disclosing.',
  },
  {
    number: '07',
    title: 'Your choices',
    text: 'Review the information in your profile and keep it up to date. If you need help correcting or removing personal information, contact the platform team. The available options may depend on the features currently implemented.',
  },
  {
    number: '08',
    title: 'Changes to this policy',
    text: 'This policy may be updated as EthioSwapSkill develops. When it changes, the page should be updated to explain the current practices. Please review it from time to time.',
  },
];

export default function Privacy() {
  return (
    <main className="information-page">
      <section className="information-hero">
        <div className="information-hero-content">
          <span className="information-eyebrow">YOUR PRIVACY MATTERS</span>

          <h1>Your information deserves care.</h1>

          <p>
            This page explains the information you may share on EthioSwapSkill
            and some practical ways to protect your privacy while learning and
            exchanging skills.
          </p>

          <div className="information-hero-actions">
            <Link
              to="/community-rules"
              className="information-button information-button-primary"
            >
              Community Rules
            </Link>

            <Link
              to="/contact"
              className="information-button information-button-secondary"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section className="information-content">
        <div className="information-section-heading">
          <span className="information-eyebrow">PRIVACY POLICY</span>
          <h2>How your information is handled</h2>
          <p>
            Please read these guidelines before sharing information on the
            platform.
          </p>
        </div>

        <div className="rules-grid privacy-grid">
          {privacySections.map((section) => (
            <article className="rule-card privacy-card" key={section.number}>
              <div className="rule-card-top">
                <span className="rule-number">{section.number}</span>
                <span className="rule-icon" aria-hidden="true">
                  {section.number === '01' && '👤'}
                  {section.number === '02' && '🎯'}
                  {section.number === '03' && '👁️'}
                  {section.number === '04' && '💬'}
                  {section.number === '05' && '🔐'}
                  {section.number === '06' && '🤝'}
                  {section.number === '07' && '⚙️'}
                  {section.number === '08' && '📄'}
                </span>
              </div>

              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </article>
          ))}
        </div>

        <aside className="information-callout">
          <div>
            <h2>Have a privacy question?</h2>
            <p>
              Contact the platform team if you need help or want to raise a
              concern about information shared through EthioSwapSkill.
            </p>
          </div>

          <Link
            to="/contact"
            className="information-button information-button-primary"
          >
            Contact the team →
          </Link>
        </aside>

        <p className="information-disclaimer">
          Note: This is an initial privacy notice for the project, not a legal
          review. It should be checked against the actual data storage,
          retention, security, and account-deletion practices before the website
          is released publicly.
        </p>
      </section>
    </main>
  );
}
