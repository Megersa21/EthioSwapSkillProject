import { useCallback, useEffect, useState } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import '../styles/Notification.css';

function getNotificationTitle(type) {
  const titles = {
    request: 'New skill swap request',
    swap_request: 'New skill swap request',
    accepted: 'Request accepted',
    request_accepted: 'Request accepted',
    rejected: 'Request rejected',
    request_rejected: 'Request rejected',
    message: 'New message',
    new_message: 'New message',
    session: 'Session update',
    review: 'New review',
  };

  return titles[type] || 'Skill swap update';
}

function getNotificationIcon(type) {
  const icons = {
    request: '🤝',
    swap_request: '🤝',
    accepted: '✅',
    request_accepted: '✅',
    rejected: '❌',
    request_rejected: '❌',
    message: '💬',
    new_message: '💬',
    session: '📅',
    review: '⭐',
  };

  return icons[type] || '🔔';
}

function formatTime(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return 'Just now';

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleDateString();
}

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getNotifications();
      const rows = Array.isArray(result.data) ? result.data : [];

      const formattedNotifications = rows.map((item) => ({
        id: item.id,
        type: item.type || 'general',
        title: getNotificationTitle(item.type),
        // Display only the notification message; don't prepend actor_name.
        message: item.message,
        time: formatTime(item.created_at),
        read: item.is_read === true,
        icon: getNotificationIcon(item.type),
      }));

      setNotifications(formattedNotifications);

      localStorage.setItem(
        'swapSkillNotifications',
        JSON.stringify(formattedNotifications),
      );

      window.dispatchEvent(new Event('swapSkillNotificationsUpdated'));
    } catch (err) {
      setError(err.message || 'Could not load your notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const visibleNotifications = notifications.filter(
    (notification) => activeTab === 'all' || !notification.read,
  );

  async function markAsRead(id) {
    setUpdating(true);
    setError('');

    try {
      await markNotificationAsRead(id);
      await loadNotifications();
    } catch (err) {
      setError(err.message || 'Could not mark notification as read.');
    } finally {
      setUpdating(false);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;

    setUpdating(true);
    setError('');

    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
    } catch (err) {
      setError(err.message || 'Could not update your notifications.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="notifications-page">
      <div className="notifications-container">
        <header className="notifications-header">
          <div>
            <span className="notifications-eyebrow">STAY CONNECTED</span>
            <h1>Notifications</h1>
            <p>Keep track of your skill swaps, messages, and sessions.</p>
          </div>

          {unreadCount > 0 && (
            <button
              className="mark-all-button"
              onClick={markAllAsRead}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Mark all as read'}
            </button>
          )}
        </header>

        <section className="notifications-summary">
          <div className="notification-summary-icon">🔔</div>

          <div>
            <h2>
              {loading
                ? 'Loading notifications...'
                : unreadCount === 0
                  ? "You're all caught up!"
                  : `You have ${unreadCount} unread ${
                      unreadCount === 1 ? 'notification' : 'notifications'
                    }`}
            </h2>

            <p>Important updates about your learning journey appear here.</p>
          </div>
        </section>

        {error && (
          <div className="notifications-error" role="alert">
            <p>{error}</p>
            <button onClick={loadNotifications}>Try again</button>
          </div>
        )}

        <section className="notifications-list-section">
          <div className="notifications-tabs">
            <button
              className={activeTab === 'all' ? 'active' : ''}
              onClick={() => setActiveTab('all')}
            >
              All
              <span className="tab-count">{notifications.length}</span>
            </button>

            <button
              className={activeTab === 'unread' ? 'active' : ''}
              onClick={() => setActiveTab('unread')}
            >
              Unread
              {unreadCount > 0 && (
                <span className="tab-count">{unreadCount}</span>
              )}
            </button>
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="notifications-empty">
                <span>🔄</span>
                <h3>Loading your notifications</h3>
                <p>Please wait a moment.</p>
              </div>
            ) : visibleNotifications.length > 0 ? (
              visibleNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-card ${
                    notification.read ? 'read' : 'unread'
                  }`}
                >
                  <div className={`notification-icon ${notification.type}`}>
                    {notification.icon}
                  </div>

                  <div className="notification-content">
                    <div className="notification-title-row">
                      <h3>{notification.title}</h3>
                      {!notification.read && <span className="unread-dot" />}
                    </div>

                    <p>{notification.message}</p>

                    <span className="notification-time">
                      {notification.time}
                    </span>
                  </div>

                  {!notification.read && (
                    <div className="notification-actions">
                      <button
                        onClick={() => markAsRead(notification.id)}
                        disabled={updating}
                        title="Mark as read"
                        aria-label="Mark notification as read"
                      >
                        ✓
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="notifications-empty">
                <span>🎉</span>
                <h3>No notifications here</h3>
                <p>
                  {activeTab === 'unread'
                    ? "You've read all your notifications."
                    : 'New updates will appear here when they arrive.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <p className="notifications-note">
          Your notifications are loaded from your account.
        </p>
      </div>
    </main>
  );
}

export default Notifications;
