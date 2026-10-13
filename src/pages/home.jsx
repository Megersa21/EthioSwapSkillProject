import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Home.css';

const steps = [
  {
    number: '01',
    title: 'Create your profile',
    description: 'Add a short bio and list the skills you offer and want.',
  },
  {
    number: '02',
    title: 'Find a match',
    description: 'Discover people with skills that complement yours.',
  },
  {
    number: '03',
    title: 'Send a request',
    description: 'Choose what you teach and what you want to learn.',
  },
  {
    number: '04',
    title: 'Swap and review',
    description: 'Complete your exchange together and leave a review.',
  },
];

const categories = [
  { icon: '💻', name: 'Technology' },
  { icon: '🎨', name: 'Design' },
  { icon: '🌍', name: 'Languages' },
  { icon: '📊', name: 'Business' },
  { icon: '🎵', name: 'Music' },
  { icon: '📷', name: 'Photography' },
  { icon: '🍳', name: 'Cooking' },
];

export default function Home() {
  return (
    <div className="home-page">
      <main>
        {/* Hero section */}
        <section className="hero page-width">
          <div className="hero-copy">
            <span className="eyebrow">Free skill exchange</span>

            <h1>
              Exchange skills.
              <br />
              Learn together.
            </h1>

            <p>
              Teach what you know and learn what you need from people nearby. No
              fees. Just a fair swap.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" to="/register">
                Get started
              </Link>

              <a className="button button-outline" href="#categories">
                Browse skills
              </a>
            </div>
          </div>

          {/* Sample skill exchange */}
          <div
            className="sample-card"
            aria-label="Example skill exchange between Hana and Dawit"
          >
            <p className="sample-label">A SAMPLE SWAP</p>

            <div className="people-swap">
              <div className="person">
                <span className="avatar avatar-yellow">HA</span>
                <strong>Hana</strong>
                <span className="skill-tag skill-teach">Teaches design</span>
                <span className="skill-tag skill-want">Wants web dev</span>
              </div>

              <span className="swap-arrow" aria-hidden="true">
                ⇄
              </span>

              <div className="person">
                <span className="avatar avatar-teal">DA</span>
                <strong>Dawit</strong>
                <span className="skill-tag skill-teach">Teaches web dev</span>
                <span className="skill-tag skill-want">Wants design</span>
              </div>
            </div>

            <p className="sample-note">
              Both sides teach and both sides learn, so everyone gains
              something.
            </p>
          </div>
        </section>
        {/* Benefits */}
        <section
          className="benefit-grid page-width"
          aria-label="Benefits of SwapSkill"
        >
          <article className="benefit-card">
            <span className="benefit-icon" aria-hidden="true">
              ＋
            </span>
            <h2>Publish skills</h2>
            <p>List what you can teach and what you want to learn.</p>
          </article>

          <article className="benefit-card">
            <span className="benefit-icon search-icon" aria-hidden="true">
              ⌕
            </span>
            <h2>Find partners</h2>
            <p>
              Search by skill, category or place. We show mutual matches first.
            </p>
          </article>

          <article className="benefit-card">
            <span className="benefit-icon" aria-hidden="true">
              ☆
            </span>
            <h2>Swap and review</h2>
            <p>
              Exchange, then rate each other so the community stays trustworthy.
            </p>
          </article>
        </section>
        {/* Video session preview */}
        <section className="video-section page-width">
          <div className="video-copy">
            <span className="video-eyebrow">Live video built in</span>

            <h2>Teach face to face, right inside SwapSkill</h2>

            <p>
              Schedule a session, join the room in your browser and take turns
              teaching. Share your screen, chat, and swap roles with one click.
            </p>

            <ul>
              <li>No downloads and no external links</li>
              <li>A timer for each person's teaching turn</li>
              <li>Review each other after every session</li>
            </ul>
          </div>

          <div
            className="video-mockup"
            role="img"
            aria-label="Illustration of a video session"
          >
            <div className="video-main-screen">
              <div className="video-person-card">
                <span className="camera-avatar">
                  <span />
                </span>
                <span className="camera-bar" />
              </div>
            </div>

            <div className="video-participants">
              <div className="participant participant-active">
                <span className="mini-avatar mini-teal">DA</span>
              </div>

              <div className="participant">
                <span className="mini-avatar mini-yellow">HA</span>
              </div>
            </div>
          </div>
        </section>
        {/* How it works */}
        <section className="how-section page-width" id="how-it-works">
          <h2>How a swap works</h2>

          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step" key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Popular Categories */}
        <section className="categories-section page-width" id="categories">
          <h2>Popular categories</h2>

          <div className="category-grid">
            {categories.map((category) => (
              <Link
                to="/register"
                className="category-card"
                key={category.name}
              >
                <span className="category-icon" aria-hidden="true">
                  {category.icon}
                </span>

                <span className="category-name">{category.name}</span>

                <span className="category-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <section className="final-cta page-width">
          <div>
            <h2>What can you teach today?</h2>
            <p>
              Create a free account and publish your first skill in a few
              minutes.
            </p>
          </div>

          <Link className="button button-yellow" to="/register">
            Create an account
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
