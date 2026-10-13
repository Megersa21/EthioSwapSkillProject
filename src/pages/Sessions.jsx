import { useState } from 'react';
import '../styles/Sessions.css';

const initialSessions = [
  {
    id: 1,
    partner: 'Dawit Alemu',
    initials: 'DA',
    teachSkill: 'Graphic Design',
    learnSkill: 'Web Development',
    date: 'Oct 13, 2026',
    day: 'Today',
    time: '4:00 PM to 5:00 PM',
    status: 'Confirmed',
    category: 'upcoming',
    invite: false,
  },
  {
    id: 2,
    partner: 'Meron Bekele',
    initials: 'MB',
    teachSkill: 'JavaScript',
    learnSkill: 'Logo Design',
    date: 'Oct 17, 2026',
    day: 'Sat',
    time: '10:00 AM to 11:00 AM',
    status: 'Confirmed',
    category: 'upcoming',
    invite: false,
  },
  {
    id: 3,
    partner: 'Yonas Tesfaye',
    initials: 'YT',
    teachSkill: 'Photography',
    learnSkill: 'HTML and CSS',
    date: 'Oct 18, 2026',
    day: 'Sun',
    time: '2:00 PM to 3:00 PM',
    status: 'Waiting for reply',
    category: 'upcoming',
    invite: true,
  },
  {
    id: 4,
    partner: 'Sara Mohammed',
    initials: 'SM',
    teachSkill: 'Flutter',
    learnSkill: 'UI/UX Design',
    date: 'Oct 5, 2026',
    day: 'Mon',
    time: '9:00 AM to 10:00 AM',
    status: 'Completed',
    category: 'past',
    invite: false,
  },
  {
    id: 5,
    partner: 'Hana Bekele',
    initials: 'HB',
    teachSkill: 'React',
    learnSkill: 'Graphic Design',
    date: 'Oct 3, 2026',
    day: 'Sat',
    time: '2:00 PM to 3:00 PM',
    status: 'Completed',
    category: 'past',
    invite: false,
  },
];

function Sessions() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sessions, setSessions] = useState(initialSessions);
  const [notice, setNotice] = useState('');

  const visibleSessions = sessions.filter(
    (session) => session.category === activeTab,
  );

  function updateSession(id, updates) {
    setSessions((current) =>
      current.map((session) =>
        session.id === id ? { ...session, ...updates } : session,
      ),
    );
  }

  function cancelSession(session) {
    if (!window.confirm(`Cancel your session with ${session.partner}?`)) {
      return;
    }

    updateSession(session.id, { status: 'Cancelled' });
    setNotice(`Your session with ${session.partner} was cancelled.`);
  }

  function rescheduleSession(session) {
    const newDate = window.prompt(
      'Enter a new date (for example, Oct 20, 2026):',
      session.date,
    );

    if (!newDate || !newDate.trim()) return;

    const newTime = window.prompt(
      'Enter a new time (for example, 2:00 PM to 3:00 PM):',
      session.time,
    );

    if (!newTime || !newTime.trim()) return;

    updateSession(session.id, {
      date: newDate.trim(),
      time: newTime.trim(),
      status: 'Waiting for reply',
    });

    setNotice('Your proposed session change has been saved in this demo.');
  }

  function withdrawInvite(session) {
    if (!window.confirm(`Withdraw your invitation to ${session.partner}?`)) {
      return;
    }

    setSessions((current) => current.filter((item) => item.id !== session.id));
    setNotice(`Your invitation to ${session.partner} was withdrawn.`);
  }

  function addToCalendar(session) {
    const details = [
      `SwapSkill session with ${session.partner}`,
      `${session.teachSkill} ↔ ${session.learnSkill}`,
      `${session.date}, ${session.time}`,
    ].join('\n');

    const blob = new Blob([details], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `swapskill-session-${session.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setNotice(
      'Calendar file downloaded. You can import it into your calendar.',
    );
  }

  function joinRoom(session) {
    setNotice(
      `Video rooms are not connected yet. Your session with ${session.partner} is ready for the future video-call feature.`,
    );
  }

  function scheduleSession() {
    window.location.href = '/schedule-session';
  }

  return (
    <main className="sessions-page">
      {/* <header className="sessions-navbar">
        <a className="sessions-brand" href="/">
          <span className="sessions-brand-icon">⇄</span>
          <span>SwapSkill</span>
        </a>

        <nav className="sessions-nav-links" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/discover">Skills</a>
          <a href="/requests">Requests</a>
          <a href="/sessions" className="active">
            Sessions
          </a>
          <a href="/messages">Messages</a>
        </nav>

        <a className="sessions-user" href="/edit-profile">
          <span className="sessions-user-avatar">SU</span>
          <span>Sample User</span>
        </a>
      </header> */}

      <div className="sessions-container">
        <section className="sessions-heading">
          <div>
            <h1>Video sessions</h1>
            <p>Meet your swap partners live and take turns teaching.</p>
          </div>

          <button
            type="button"
            className="sessions-primary-button"
            onClick={scheduleSession}
          >
            Schedule a session
          </button>
        </section>

        {notice && (
          <div className="sessions-notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice('')}
            >
              ×
            </button>
          </div>
        )}

        <div
          className="sessions-tabs"
          role="tablist"
          aria-label="Session history"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            className={activeTab === 'upcoming' ? 'active' : ''}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({sessions.filter((s) => s.category === 'upcoming').length}
            )
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'past'}
            className={activeTab === 'past' ? 'active' : ''}
            onClick={() => setActiveTab('past')}
          >
            Past ({sessions.filter((s) => s.category === 'past').length})
          </button>
        </div>

        <div className="sessions-layout">
          <section className="sessions-list" aria-label="Your sessions">
            {visibleSessions.length === 0 ? (
              <div className="sessions-empty">
                <span className="sessions-empty-icon">▣</span>
                <h2>No sessions here yet</h2>
                <p>
                  {activeTab === 'upcoming'
                    ? 'Find a learning partner to plan your next skill swap.'
                    : 'Your completed sessions will appear here.'}
                </p>
                {activeTab === 'upcoming' && (
                  <button
                    type="button"
                    className="sessions-primary-button"
                    onClick={scheduleSession}
                  >
                    Discover partners
                  </button>
                )}
              </div>
            ) : (
              visibleSessions.map((session, index) => (
                <article
                  className={`session-card ${
                    index === 0 && activeTab === 'upcoming'
                      ? 'session-card-featured'
                      : ''
                  }`}
                  key={session.id}
                >
                  <div className="session-card-top">
                    <p className="session-date-line">
                      {index === 0 && activeTab === 'upcoming' ? '▣ ' : ''}
                      {session.day} · {session.time}
                    </p>

                    <span
                      className={`session-status status-${session.status
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="session-partner">
                    <div
                      className={`session-avatar session-avatar-${index % 3}`}
                    >
                      {session.initials}
                    </div>

                    <div>
                      <h2>
                        {session.teachSkill} ⇄ {session.learnSkill}
                      </h2>
                      <p>
                        {session.invite ? 'Invite sent to ' : 'with '}
                        {session.partner}
                      </p>
                    </div>
                  </div>

                  <div className="session-turns">
                    <span className="session-teach">
                      You teach {session.teachSkill} · 25 min
                    </span>
                    <span className="session-learn">
                      {session.partner.split(' ')[0]} teaches{' '}
                      {session.learnSkill} · 25 min
                    </span>
                    {index === 0 && activeTab === 'upcoming' && (
                      <span className="session-wrap-up">Wrap-up · 10 min</span>
                    )}
                  </div>

                  <div className="session-card-actions">
                    {session.category === 'upcoming' &&
                      session.status !== 'Cancelled' &&
                      !session.invite && (
                        <>
                          {index === 0 && (
                            <button
                              type="button"
                              className="sessions-primary-button"
                              onClick={() =>
                                (window.location.href = '/pre-join-session')
                              }
                            >
                              Join room
                            </button>
                          )}

                          {index !== 0 && (
                            <button
                              type="button"
                              className="sessions-outline-teal"
                              onClick={() => addToCalendar(session)}
                            >
                              Add to calendar
                            </button>
                          )}

                          <button
                            type="button"
                            className="sessions-outline-button"
                            onClick={() => rescheduleSession(session)}
                          >
                            Reschedule
                          </button>

                          <button
                            type="button"
                            className="sessions-text-danger"
                            onClick={() => cancelSession(session)}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                    {session.invite && session.status !== 'Cancelled' && (
                      <button
                        type="button"
                        className="sessions-text-danger"
                        onClick={() => withdrawInvite(session)}
                      >
                        Withdraw invite
                      </button>
                    )}

                    {session.status === 'Cancelled' && (
                      <span className="session-cancelled-note">
                        This session has been cancelled.
                      </span>
                    )}

                    {session.category === 'past' && (
                      <button
                        type="button"
                        className="sessions-outline-button"
                        onClick={() =>
                          setNotice(
                            `Session with ${session.partner} took place on ${session.date}.`,
                          )
                        }
                      >
                        View details
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>

          <aside className="sessions-sidebar">
            <section className="sessions-side-card">
              <h2>This week</h2>

              <div className="sessions-week">
                {[
                  { day: 'Mon', date: '12' },
                  { day: 'Tue', date: '13' },
                  { day: 'Wed', date: '14' },
                  { day: 'Thu', date: '15' },
                  { day: 'Fri', date: '16' },
                  { day: 'Sat', date: '17' },
                  { day: 'Sun', date: '18' },
                ].map((item) => (
                  <div
                    className={`sessions-week-day ${
                      item.day === 'Mon'
                        ? 'selected'
                        : item.day === 'Sat'
                          ? 'weekend'
                          : item.day === 'Sun'
                            ? 'sunday'
                            : ''
                    }`}
                    key={item.day}
                  >
                    <span>{item.day}</span>
                    <strong>{item.date}</strong>
                  </div>
                ))}
              </div>

              <p className="sessions-timezone">
                Times are shown in East Africa Time (UTC+3).
              </p>
            </section>

            <section className="sessions-side-card sessions-checklist">
              <h2>Before you join</h2>
              <ul>
                <li>Find a quiet place with a stable connection.</li>
                <li>Prepare the files you want to share on screen.</li>
                <li>Be kind and keep to your turn times.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Sessions;
