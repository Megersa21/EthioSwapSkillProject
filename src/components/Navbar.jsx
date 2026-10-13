import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Discover', path: '/discover' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Requests', path: '/requests' },
    { label: 'Sessions', path: '/sessions' },
    { label: 'Messages', path: '/messages' },
  ];

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>
        <span className="navbar-brand-icon">⇄S</span>
        <span>EthioSwapSkill</span>
      </Link>

      <button
        type="button"
        className="navbar-menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      <nav className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={closeMenu}
            className={({ isActive }) =>
              `navbar-link ${isActive ? 'navbar-link-active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}

        <Link to="/login" className="navbar-login" onClick={closeMenu}>
          Log In
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;
