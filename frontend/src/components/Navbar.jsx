import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

const defaultUnreadCount = 2;

function getUnreadCount() {
  try {
    const saved = localStorage.getItem('swapSkillNotifications');

    if (saved === null) return defaultUnreadCount;

    const notifications = JSON.parse(saved);

    if (!Array.isArray(notifications)) return 0;

    return notifications.filter((notification) => !notification.read).length;
  } catch {
    return 0;
  }
}

function getDisplayName() {
  try {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      const user = JSON.parse(savedUser);
      const name =
        user?.full_name || user?.fullName || user?.name || user?.username;

      if (name) return name;
    }
  } catch {
    // Continue with the other saved name values.
  }

  return (
    localStorage.getItem('userName') ||
    localStorage.getItem('name') ||
    'My Account'
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount);
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem('token')),
  );

  const displayName = getDisplayName();
  const initial = displayName.charAt(0).toUpperCase() || 'A';

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem('token')));
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

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

  function closeMenus() {
    setMenuOpen(false);
    setAccountOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    localStorage.removeItem('name');

    setIsLoggedIn(false);
    closeMenus();
    navigate('/login', { replace: true });
  }

  const mainLinks = isLoggedIn
    ? [
        { label: 'Home', path: '/' },
        { label: 'Discover', path: '/discover' },
        { label: 'My Skills', path: '/my-skills' },
        { label: 'Dashboard', path: '/dashboard' },
        { label: '+Add Skill', path: '/add-skill' },
      ]
    : [
        { label: 'Home', path: '/' },
        { label: 'Discover', path: '/discover' },
      ];

  return (
    <header className="site-navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenus}>
          <span className="navbar-brand-icon" aria-hidden="true">
            ⇄
          </span>
          <span className="navbar-brand-text">
            Ethio<span>SwapSkill</span>
          </span>
        </Link>

        <button
          type="button"
          className="navbar-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={
            menuOpen ? 'Close navigation menu' : 'Open navigation menu'
          }
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav
          className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}
          aria-label="Main navigation"
        >
          <div className="navbar-main-links">
            {mainLinks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={closeMenus}
                className={({ isActive }) =>
                  `navbar-link ${isActive ? 'navbar-link-active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="navbar-actions">
            {isLoggedIn ? (
              <>
                <NavLink
                  to="/notifications"
                  onClick={closeMenus}
                  aria-label={
                    unreadCount > 0
                      ? `Notifications, ${unreadCount} unread`
                      : 'Notifications'
                  }
                  className={({ isActive }) =>
                    `navbar-notification-link ${
                      isActive ? 'navbar-notification-active' : ''
                    }`
                  }
                >
                  <span className="navbar-bell" aria-hidden="true">
                    🔔
                  </span>
                  <span className="navbar-notification-label">
                    Notifications
                  </span>

                  {unreadCount > 0 && (
                    <span className="navbar-notification-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>

                <div className="navbar-account">
                  <button
                    type="button"
                    className={`navbar-account-button ${
                      accountOpen ? 'navbar-account-button-open' : ''
                    }`}
                    onClick={() => setAccountOpen((open) => !open)}
                    aria-expanded={accountOpen}
                    aria-label="Open account menu"
                  >
                    <span className="navbar-avatar">{initial}</span>
                    <span className="navbar-account-name">{displayName}</span>
                    <span className="navbar-chevron" aria-hidden="true">
                      {accountOpen ? '⌃' : '⌄'}
                    </span>
                  </button>

                  {accountOpen && (
                    <div className="navbar-account-menu">
                      <div className="navbar-account-heading">
                        <span className="navbar-avatar navbar-avatar-large">
                          {initial}
                        </span>
                        <span className="navbar-account-details">
                          <strong>{displayName}</strong>
                          <small>Skill Swapper</small>
                        </span>
                      </div>

                      <div className="navbar-menu-divider" />

                      <NavLink
                        to="/requests"
                        onClick={closeMenus}
                        className="navbar-dropdown-link"
                      >
                        <span aria-hidden="true">⇄</span>
                        Requests
                      </NavLink>

                      <NavLink
                        to="/sessions"
                        onClick={closeMenus}
                        className="navbar-dropdown-link"
                      >
                        <span aria-hidden="true">◷</span>
                        Sessions
                      </NavLink>

                      <NavLink
                        to="/messages"
                        onClick={closeMenus}
                        className="navbar-dropdown-link"
                      >
                        <span aria-hidden="true">✉</span>
                        Messages
                      </NavLink>

                      <div className="navbar-menu-divider" />

                      <button
                        type="button"
                        className="navbar-logout-button"
                        onClick={handleLogout}
                      >
                        <span aria-hidden="true">↪</span>
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-login" onClick={closeMenus}>
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="navbar-register"
                  onClick={closeMenus}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
