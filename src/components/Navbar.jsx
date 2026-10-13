import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="site-header">
      <nav className="navbar page-width" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="SwapSkill home">
          <span className="brand-mark" aria-hidden="true">
            ⇄
          </span>
          <span>EthioSwapSkill</span>
        </Link>
        <div className="nav-links">
          <a href="#categories">Browse skills</a>
          <a href="#how-it-works">How it works</a>
          <a href="#categories">Categories</a>
        </div>
        <div className="nav-actions">
          <Link className="button button-outline button-small" to="/login">
            Log in
          </Link>
          <Link className="button button-primary button-small" to="/register">
            Register
          </Link>
        </div>
      </nav>
    </header>
  );
}
