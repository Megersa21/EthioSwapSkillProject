import { useState } from 'react';
import '../styles/Sessions.css';

const sampleSessions = [
  {
    id: 1,
    partner: 'Dawit Alemu',
    initials: 'DA',
    teachSkill: 'React Development',
    learnSkill: 'UI/UX Design',
    date: 'Oct 18, 2026',
    time: '10:00 AM - 11:00 AM',
    type: 'Online',
    status: 'Confirmed',
    category: 'upcoming',
  },
  {
    id: 2,
    partner: 'Meron Bekele',
    initials: 'MB',
    teachSkill: 'JavaScript',
    learnSkill: 'Flutter',
    date: 'Oct 20, 2026',
    time: '2:00 PM - 3:00 PM',
    type: 'Online',
    status: 'Pending',
    category: 'upcoming',
  },
  {
    id: 3,
    partner: 'Yonas Tesfaye',
    initials: 'YT',
    teachSkill: 'HTML & CSS',
    learnSkill: 'Graphic Design',
    date: 'Oct 5, 2026',
    time: '9:00 AM - 10:00 AM',
    type: 'Online',
    status: 'Completed',
    category: 'past',
  },
];

function Sessions() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sessions, setSessions] = useState(sampleSessions);

  const visibleSessions = sessions.filter(
    (session) => session.category === activeTab,
  );

  function cancelSession(id) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this session?',
    );

    if (!confirmed) return;

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === id ? { ...session, status: 'Cancelled' } : session,
      ),
    );
  }

  return (
    <main className="sessions-page">
      <section className="sessions-header">
        <div>
          <p className="sessions-eyebrow">YOUR LEARNING JOURNEY</p>
          <h1>My Sessions</h1>
          <p>
            Manage your skill-swap meetings and keep your learning on track.
          </p>
        </div>

        <a href="/discover" className="sessions-find-button">
          Find a Partner
        </a>
      </section>

      <section className="sessions-summary">
        <article className="session-summary-card">
          <span className="session-summary-icon">📅</span>
          <div>
            <p>Upcoming</p>
            <h2>
              {
                sessions.filter(
                  (session) =>
                    session.category === 'upcoming' &&
                    session.status !== 'Cancelled',
                ).length
              }
            </h2>
          </div>
        </article>

        <article className="session-summary-card">
          <span className="session-summary-icon">✓</span>
          <div>
            <p>Completed</p>
            <h2>
              {
                sessions.filter((session) => session.status === 'Completed')
                  .length
              }
            </h2>
          </div>
        </article>

        <article className="session-summary-card">
          <span className="session-summary-icon">⏳</span>
          <div>
            <p>Pending</p>
            <h2>
              {
                sessions.filter((session) => session.status === 'Pending')
                  .length
              }
            </h2>
          </div>
        </article>
      </section>

      <section className="sessions-content">
        <div className="sessions-tabs">
          <button
            type="button"
            className={activeTab === 'upcoming' ? 'active' : ''}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Sessions
          </button>

          <button
            type="button"
            className={activeTab === 'past' ? 'active' : ''}
            onClick={() => setActiveTab('past')}
          >
            Past Sessions
          </button>
        </div>

        <div className="sessions-list">
          {visibleSessions.length === 0 ? (
            <div className="sessions-empty">
              <span>📚</span>
              <h3>No sessions here yet</h3>
              <p>
                {activeTab === 'upcoming'
                  ? 'Find a learning partner to plan your next skill swap.'
                  : 'Your completed sessions will appear here.'}
              </p>

              {activeTab === 'upcoming' && (
                <a href="/discover">Discover partners</a>
              )}
            </div>
          ) : (
            visibleSessions.map((session) => (
              <article className="session-card" key={session.id}>
                <div className="session-partner">
                  <div className="session-avatar">{session.initials}</div>

                  <div>
                    <h3>{session.partner}</h3>
                    <p>{session.type} skill-swap session</p>
                  </div>
                </div>

                <div className="session-skills">
                  <div>
                    <span>You teach</span>
                    <strong>{session.teachSkill}</strong>
                  </div>

                  <span className="session-swap-icon">⇄</span>

                  <div>
                    <span>You learn</span>
                    <strong>{session.learnSkill}</strong>
                  </div>
                </div>

                <div className="session-datetime">
                  <p>
                    <span>📅</span> {session.date}
                  </p>
                  <p>
                    <span>🕒</span> {session.time}
                  </p>
                </div>

                <div className="session-card-footer">
                  <span
                    className={`session-status ${session.status
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
                  >
                    {session.status}
                  </span>

                  {session.category === 'upcoming' &&
                    session.status !== 'Cancelled' && (
                      <button
                        type="button"
                        className="session-cancel-button"
                        onClick={() => cancelSession(session.id)}
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default Sessions;
