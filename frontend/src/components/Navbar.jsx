import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import socket from '../socket';
import '../styles/Navbar.css';

const API_URL = 'http://localhost:5000/api';

function getUnreadCount() {
  try {
    const saved = localStorage.getItem('swapSkillNotifications');
    if (!saved) return 0;

    const notifications = JSON.parse(saved);

    if (!Array.isArray(notifications)) return 0;

    return notifications.filter((notification) => !notification.read).length;
  } catch {
    return 0;
  }
}

function getProfileFromResponse(result) {
  return (
    result?.profile ||
    result?.user ||
    result?.data?.profile ||
    result?.data ||
    result
  );
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'A';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem('token')),
  );

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(
    () => !localStorage.getItem('token'),
  );

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount);

  const displayName =
    profile?.full_name ||
    profile?.fullName ||
    profile?.name ||
    (isAdmin ? 'Administrator' : 'My Account');

  const initial = getInitials(displayName);

  const profileImage =
    profile?.profile_image || profile?.profileImage || profile?.avatar || '';

  // Keep the navbar synchronized with login, logout, and route changes.
  useEffect(() => {
    function syncLoginState() {
      const token = localStorage.getItem('token');

      setIsLoggedIn(Boolean(token));

      if (!token) {
        setIsAdmin(false);
        setAdminCheckComplete(true);
        setProfile(null);
        setProfileLoading(false);
        setUnreadCount(0);
        setAccountOpen(false);
        setMenuOpen(false);
      }
    }

    syncLoginState();

    window.addEventListener('authChanged', syncLoginState);
    window.addEventListener('storage', syncLoginState);

    return () => {
      window.removeEventListener('authChanged', syncLoginState);
      window.removeEventListener('storage', syncLoginState);
    };
  }, [location.pathname]);

  // Recheck login state when authentication changes.
  useEffect(() => {
    function handleAuthChanged() {
      const token = localStorage.getItem('token');

      setIsLoggedIn(Boolean(token));

      if (!token) {
        setIsAdmin(false);
        setAdminCheckComplete(true);
        setProfile(null);
        setUnreadCount(0);
      } else {
        setAdminCheckComplete(false);
      }
    }

    window.addEventListener('authChanged', handleAuthChanged);

    return () => {
      window.removeEventListener('authChanged', handleAuthChanged);
    };
  }, []);

  // Verify whether the logged-in account is an administrator.
  useEffect(() => {
    const token = localStorage.getItem('token');
    let cancelled = false;

    if (!token || !isLoggedIn) {
      setIsAdmin(false);
      setAdminCheckComplete(true);
      return undefined;
    }

    setAdminCheckComplete(false);

    async function verifyAdmin() {
      try {
        const response = await fetch(`${API_URL}/admin/verify`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setIsAdmin(response.ok);
        }
      } catch (error) {
        if (!cancelled) {
          setIsAdmin(false);
          console.error('Admin verification failed:', error);
        }
      } finally {
        if (!cancelled) {
          setAdminCheckComplete(true);
        }
      }
    }

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, location.pathname]);

  // Load the logged-in user's profile.
  useEffect(() => {
    const token = localStorage.getItem('token');
    let cancelled = false;

    if (!token || !isLoggedIn) {
      setProfile(null);
      setProfileLoading(false);
      return undefined;
    }

    async function loadProfile() {
      setProfileLoading(true);

      try {
        const response = await fetch(`${API_URL}/profiles/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Could not load your profile.');
        }

        const userProfile = getProfileFromResponse(result);

        if (!cancelled && userProfile && typeof userProfile === 'object') {
          setProfile(userProfile);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Navbar profile loading error:', error);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, location.pathname]);

  // Fetch the initial unread count from the database.
  useEffect(() => {
    const token = localStorage.getItem('token');
    let cancelled = false;

    if (!token || !isLoggedIn) {
      setUnreadCount(0);
      return undefined;
    }

    async function fetchUnreadCount() {
      try {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch notification count.');
        }

        const data = await response.json();

        if (!cancelled) {
          setUnreadCount(Number(data.unread_count ?? 0) || 0);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Notification count error:', error);
        }
      }
    }

    fetchUnreadCount();

    const handleFocus = () => fetchUnreadCount();

    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [isLoggedIn, location.pathname]);

  // Listen for live notification events on the existing shared socket.
  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem('token')) {
      return undefined;
    }

    function handleUnreadCount(count) {
      const parsedCount = Number(count);

      if (Number.isFinite(parsedCount) && parsedCount >= 0) {
        setUnreadCount(parsedCount);
      }
    }

    async function refreshUnreadCount() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        handleUnreadCount(data.unread_count ?? 0);
      } catch (error) {
        console.error('Could not refresh notification count:', error);
      }
    }

    function handleNewNotification() {
      // Use the database count so we do not double-count an event.
      refreshUnreadCount();
    }

    socket.on('notification:unread-count', handleUnreadCount);
    socket.on('notification:new', handleNewNotification);

    if (!socket.connected) {
      socket.connect();
    }

    // Refresh the count after a reconnection in case events were missed.
    socket.on('connect', refreshUnreadCount);

    function handleNotificationCountUpdated() {
      refreshUnreadCount();
    }

    window.addEventListener(
      'notificationCountUpdated',
      handleNotificationCountUpdated,
    );

    return () => {
      socket.off('notification:unread-count', handleUnreadCount);
      socket.off('notification:new', handleNewNotification);
      socket.off('connect', refreshUnreadCount);

      window.removeEventListener(
        'notificationCountUpdated',
        handleNotificationCountUpdated,
      );
    };
  }, [isLoggedIn]);

  // Keep the existing local notification update event supported.
  useEffect(() => {
    function updateUnreadCount() {
      setUnreadCount(getUnreadCount());
    }

    window.addEventListener('swapSkillNotificationsUpdated', updateUnreadCount);
    window.addEventListener('storage', updateUnreadCount);

    return () => {
      window.removeEventListener(
        'swapSkillNotificationsUpdated',
        updateUnreadCount,
      );
      window.removeEventListener('storage', updateUnreadCount);
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
    setIsAdmin(false);
    setAdminCheckComplete(true);
    setProfile(null);
    setProfileLoading(false);
    setUnreadCount(0);

    closeMenus();

    window.dispatchEvent(new Event('authChanged'));

    navigate('/login', { replace: true });
  }

  const mainLinks = !isLoggedIn
    ? [
        { label: 'Home', path: '/' },
        { label: 'Discover', path: '/discover' },
      ]
    : !adminCheckComplete
      ? []
      : isAdmin
        ? [{ label: 'Admin Dashboard', path: '/admin' }]
        : [
            { label: 'Home', path: '/' },
            { label: 'Discover', path: '/discover' },
            { label: 'My Skills', path: '/my-skills' },
            { label: 'Dashboard', path: '/dashboard' },
            { label: '+ Add Skill', path: '/add-skill' },
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
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={`${displayName}'s profile`}
                        className="navbar-avatar navbar-avatar-image"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="navbar-avatar">{initial}</span>
                    )}

                    <span className="navbar-account-name">
                      {profileLoading ? 'Loading...' : displayName}
                    </span>

                    <span className="navbar-chevron" aria-hidden="true">
                      {accountOpen ? '⌃' : '⌄'}
                    </span>
                  </button>

                  {accountOpen && (
                    <div className="navbar-account-menu">
                      <div className="navbar-account-heading">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt={`${displayName}'s profile`}
                            className="navbar-avatar navbar-avatar-large navbar-avatar-image"
                          />
                        ) : (
                          <span className="navbar-avatar navbar-avatar-large">
                            {initial}
                          </span>
                        )}

                        <span className="navbar-account-details">
                          <strong>{displayName}</strong>
                          <small>
                            {isAdmin
                              ? 'Platform Administrator'
                              : profile?.title || 'Skill Swapper'}
                          </small>
                        </span>
                      </div>

                      <div className="navbar-menu-divider" />

                      {isAdmin ? (
                        <NavLink
                          to="/admin"
                          onClick={closeMenus}
                          className="navbar-dropdown-link"
                        >
                          <span aria-hidden="true">▦</span>
                          Admin Dashboard
                        </NavLink>
                      ) : (
                        <>
                          <NavLink
                            to="/profile/me"
                            onClick={closeMenus}
                            className="navbar-dropdown-link"
                          >
                            <span aria-hidden="true">◉</span>
                            My Profile
                          </NavLink>

                          <NavLink
                            to="/edit-profile"
                            onClick={closeMenus}
                            className="navbar-dropdown-link"
                          >
                            <span aria-hidden="true">✎</span>
                            Edit Profile
                          </NavLink>

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
                        </>
                      )}

                      <div className="navbar-menu-divider" />

                      <NavLink
                        to="/help"
                        onClick={closeMenus}
                        className="navbar-dropdown-link"
                      >
                        <span aria-hidden="true">?</span>
                        Help &amp; Support
                      </NavLink>

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
