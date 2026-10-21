import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const socialLinks = [
  { name: 'Facebook', url: 'https://www.facebook.com/', label: 'f' },
  { name: 'Instagram', url: 'https://www.instagram.com/', label: '◎' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/', label: 'in' },
  { name: 'YouTube', url: 'https://www.youtube.com/', label: '▶' },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-width footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="footer-logo-icon" aria-hidden="true">
              ⇄
            </span>
            <span className="footer-logo-text">EthioSwapSkill</span>
          </Link>

          <p>
            Share skills. Learn together. Build connections. Turn what you know
            into new opportunities.
          </p>

          {/* <div className="footer-socials">
            <h4>Follow Us</h4>
            <div className="footer-social-list">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  className="footer-social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  title={social.name}
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div> */}
        </div>

        <div className="footer-links">
          <div className="footer-link-group">
            <h4>Explore</h4>
            <Link to="/">Home</Link>
            <Link to="/discover">Discover Skills</Link>
            <Link to="/my-skills">My Skills</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/add-skill">Add a Skill</Link>
          </div>

          <div className="footer-link-group">
            <h4>Community</h4>
            <Link to="/community-rules">Community Rules</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/help">Help &amp; Support</Link>
            <Link to="/contact">Contact Us</Link>
          </div>
        </div>

        <div className="footer-contact">
          <h4>Let's connect</h4>
          <p>Have a question or suggestion? We'd love to hear from you.</p>
          <Link to="/contact">Get in touch →</Link>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} EthioSwapSkill. All rights reserved.
          </p>
          <p className="footer-tagline">Better skills. Brighter futures.</p>
        </div>
      </div>
    </footer>
  );
}
