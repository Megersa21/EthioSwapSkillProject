import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import '../styles/Navbar.css';

const defaultUnreadCount = 2;

function getUnreadCount() {
  try {
    const saved = localStorage.getItem('swapSkillNotifications');

    if (saved === null) {
      return defaultUnreadCount;
    }

    const notifications = JSON.parse(saved);

    if (!Array.isArray(notifications)) {
      return 0;
    }

    return notifications.filter((notification) => !notification.read).length;
  } catch {
    return 0;
  }
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount);

  useEffect(() => {
    function updateUnreadCount() {
      setUnreadCount(getUnreadCount());
    }

    window.addEventListener('swapSkillNotificationsUpdated', updateUnreadCount);
    window.addEventListener('storage', updateUnreadCount);
    window.addEventListener('focus', updateUnreadCount);

    return () => {
      window.removeEventListener(
        'swapSkillNotificationsUpdated',
        updateUnreadCount,
      );
      window.removeEventListener('storage', updateUnreadCount);
      window.removeEventListener('focus', updateUnreadCount);
    };
  }, []);

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

        <NavLink
          to="/notifications"
          onClick={closeMenu}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
          className={({ isActive }) =>
            `navbar-notification-link ${isActive ? 'navbar-link-active' : ''}`
          }
        >
          <span className="navbar-bell" aria-hidden="true">
            🔔
          </span>
          <span>Notifications</span>

          {unreadCount > 0 && (
            <span className="navbar-notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>

        <Link to="/login" className="navbar-login" onClick={closeMenu}>
          Log In
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;
