import { useState } from 'react';
import '../styles/Notification.css';

const initialNotifications = [
  {
    id: 1,
    type: 'request',
    title: 'New skill swap request',
    message: 'Abel wants to learn JavaScript from you.',
    time: '10 minutes ago',
    read: false,
    icon: '🤝',
  },
  {
    id: 2,
    type: 'message',
    title: 'New message',
    message: 'Hana sent you a message about your upcoming session.',
    time: '1 hour ago',
    read: false,
    icon: '💬',
  },
  {
    id: 3,
    type: 'session',
    title: 'Upcoming session',
    message: 'Your React learning session is scheduled for tomorrow.',
    time: 'Yesterday',
    read: true,
    icon: '📅',
  },
  {
    id: 4,
    type: 'success',
    title: 'Request accepted',
    message: 'Dawit accepted your UI/UX design swap request.',
    time: '2 days ago',
    read: true,
    icon: '✅',
  },
];

function Notifications() {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('swapSkillNotifications');
      return saved ? JSON.parse(saved) : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });

  const [activeTab, setActiveTab] = useState('all');

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const visibleNotifications = notifications.filter(
    (notification) => activeTab === 'all' || !notification.read,
  );

  function saveNotifications(updatedNotifications) {
    setNotifications(updatedNotifications);

    localStorage.setItem(
      'swapSkillNotifications',
      JSON.stringify(updatedNotifications),
    );

    window.dispatchEvent(new Event('swapSkillNotificationsUpdated'));
  }

  function markAsRead(id) {
    saveNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  }

  function markAllAsRead() {
    saveNotifications(
      notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    );
  }

  function deleteNotification(id) {
    saveNotifications(
      notifications.filter((notification) => notification.id !== id),
    );
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
            <button className="mark-all-button" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </header>

        <section className="notifications-summary">
          <div className="notification-summary-icon">🔔</div>
          <div>
            <h2>
              {unreadCount === 0
                ? "You're all caught up!"
                : `You have ${unreadCount} unread ${
                    unreadCount === 1 ? 'notification' : 'notifications'
                  }`}
            </h2>
            <p>Important updates about your learning journey appear here.</p>
          </div>
        </section>

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
            {visibleNotifications.length > 0 ? (
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

                  <div className="notification-actions">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        title="Mark as read"
                        aria-label="Mark notification as read"
                      >
                        ✓
                      </button>
                    )}

                    <button
                      onClick={() => deleteNotification(notification.id)}
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="notifications-empty">
                <span>🎉</span>
                <h3>No notifications here</h3>
                <p>
                  {activeTab === 'unread'
                    ? "You've read all your notifications."
                    : 'New updates will appear here.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <p className="notifications-note">
          These are sample notifications for the frontend demo.
        </p>
      </div>
    </main>
  );
}

export default Notifications;
