import { useEffect, useState } from 'react';
import '../styles/Sessions.css';

const initialSessions = [
  {
    id: 1,
    partner: 'Dawit Alemu',
    initials: 'DA',
    teachSkill: 'Graphic Design',
    learnSkill: 'Web Development',
    date: '2026-10-13',
    startTime: '16:00',
    endTime: '17:00',
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
    date: '2026-10-17',
    startTime: '10:00',
    endTime: '11:00',
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
    date: '2026-10-18',
    startTime: '14:00',
    endTime: '15:00',
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
    date: '2026-10-05',
    startTime: '09:00',
    endTime: '10:00',
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
    date: '2026-10-03',
    startTime: '14:00',
    endTime: '15:00',
    status: 'Completed',
    category: 'past',
    invite: false,
  },
];

function toISODate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

function parseLegacyTime(value) {
  if (!value) return {};
  const match = value.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*to\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );
  if (!match) return {};
  const convert = (hour, minute, suffix) => {
    let h = Number(hour) % 12;
    if (suffix.toUpperCase() === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${minute}`;
  };
  return {
    startTime: convert(match[1], match[2], match[3]),
    endTime: convert(match[4], match[5], match[6]),
  };
}

function normalizeSession(session, index) {
  const legacy = parseLegacyTime(session.time);
  return {
    ...session,
    id: session.id ?? index + 1,
    date:
      toISODate(session.date) || initialSessions[index]?.date || '2026-10-20',
    startTime:
      session.startTime ||
      legacy.startTime ||
      initialSessions[index]?.startTime ||
      '10:00',
    endTime:
      session.endTime ||
      legacy.endTime ||
      initialSessions[index]?.endTime ||
      '11:00',
    category: session.category || 'upcoming',
    invite: Boolean(session.invite),
  };
}

function readSessions() {
  try {
    const saved = localStorage.getItem('swapSkillSessions');
    if (!saved) return initialSessions;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.map(normalizeSession)
      : initialSessions;
  } catch (error) {
    console.error('Could not load sessions:', error);
    return initialSessions;
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}
function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}
function formatDay(value) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
  });
}

function Sessions() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sessions, setSessions] = useState(readSessions);
  const [notice, setNotice] = useState('');
  const [editingSession, setEditingSession] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('swapSkillSessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Could not save sessions:', error);
    }
  }, [sessions]);

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
    if (!window.confirm(`Cancel your session with ${session.partner}?`)) return;
    updateSession(session.id, { status: 'Cancelled' });
    setNotice(`Your session with ${session.partner} was cancelled.`);
  }
  function openReschedule(session) {
    setEditingSession(session);
    setNewDate(toISODate(session.date));
    setNewStartTime(session.startTime || '10:00');
    setNewEndTime(session.endTime || '11:00');
    setFormError('');
  }
  function closeReschedule() {
    setEditingSession(null);
    setFormError('');
  }
  function saveReschedule(event) {
    event.preventDefault();
    if (!editingSession) return;
    if (!newDate || !newStartTime || !newEndTime) {
      setFormError('Please fill in the date, start time, and end time.');
      return;
    }
    if (newStartTime >= newEndTime) {
      setFormError('The end time must be later than the start time.');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${newDate}T00:00:00`) < today) {
      setFormError('Please select today or a future date.');
      return;
    }
    updateSession(editingSession.id, {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'Waiting for reply',
    });
    setNotice(
      `Your proposed new schedule with ${editingSession.partner} has been saved. It is waiting for their reply.`,
    );
    closeReschedule();
  }
  function withdrawInvite(session) {
    if (!window.confirm(`Withdraw your invitation to ${session.partner}?`))
      return;
    setSessions((current) => current.filter((item) => item.id !== session.id));
    setNotice(`Your invitation to ${session.partner} was withdrawn.`);
  }
  function addToCalendar(session) {
    const details = [
      `SwapSkill session with ${session.partner}`,
      `${session.teachSkill} <-> ${session.learnSkill}`,
      `${formatDate(session.date)}, ${formatTime(session.startTime)} to ${formatTime(session.endTime)}`,
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
    setNotice('Calendar details downloaded for your session.');
  }
  function scheduleSession() {
    window.location.href = '/schedule-session';
  }

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <main className="sessions-page">
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
                  className={`session-card ${index === 0 && activeTab === 'upcoming' ? 'session-card-featured' : ''}`}
                  key={session.id}
                >
                  <div className="session-card-top">
                    <p className="session-date-line">
                      {index === 0 && activeTab === 'upcoming' ? '▣ ' : ''}
                      {formatDay(session.date)} · {formatDate(session.date)} ·{' '}
                      {formatTime(session.startTime)} to{' '}
                      {formatTime(session.endTime)}
                    </p>
                    <span
                      className={`session-status status-${session.status.toLowerCase().replace(/\s+/g, '-')}`}
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
                      session.status !== 'Cancelled' && (
                        <>
                          {session.status === 'Confirmed' &&
                            !session.invite && (
                              <button
                                type="button"
                                className="sessions-primary-button"
                                onClick={() => {
                                  window.location.href = '/pre-join-session';
                                }}
                              >
                                Join room
                              </button>
                            )}

                          {!session.invite && (
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
                            onClick={() => openReschedule(session)}
                          >
                            Reschedule
                          </button>

                          {!session.invite ? (
                            <button
                              type="button"
                              className="sessions-text-danger"
                              onClick={() => cancelSession(session)}
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="sessions-text-danger"
                              onClick={() => withdrawInvite(session)}
                            >
                              Withdraw invite
                            </button>
                          )}
                        </>
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
                            `Session with ${session.partner} took place on ${formatDate(session.date)}.`,
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
                    className={`sessions-week-day ${item.day === 'Mon' ? 'selected' : item.day === 'Sat' ? 'weekend' : item.day === 'Sun' ? 'sunday' : ''}`}
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

      {editingSession && (
        <div
          className="reschedule-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReschedule();
          }}
        >
          <section
            className="reschedule-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-title"
          >
            <button
              type="button"
              className="reschedule-close"
              aria-label="Close reschedule form"
              onClick={closeReschedule}
            >
              ×
            </button>
            <span className="reschedule-icon">▦</span>
            <h2 id="reschedule-title">Reschedule session</h2>
            <p className="reschedule-description">
              Choose a new date and time for your session with{' '}
              <strong>{editingSession.partner}</strong>.
            </p>
            <form onSubmit={saveReschedule} className="reschedule-form">
              <label htmlFor="reschedule-date">New date</label>
              <input
                id="reschedule-date"
                type="date"
                value={newDate}
                min={todayISO}
                onChange={(event) => setNewDate(event.target.value)}
                required
              />
              <div className="reschedule-time-grid">
                <div>
                  <label htmlFor="reschedule-start">Start time</label>
                  <input
                    id="reschedule-start"
                    type="time"
                    value={newStartTime}
                    onChange={(event) => setNewStartTime(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reschedule-end">End time</label>
                  <input
                    id="reschedule-end"
                    type="time"
                    value={newEndTime}
                    onChange={(event) => setNewEndTime(event.target.value)}
                    required
                  />
                </div>
              </div>
              {formError && (
                <p className="reschedule-error" role="alert">
                  {formError}
                </p>
              )}
              <p className="reschedule-note">
                Your proposed change will be marked as waiting for your
                partner's reply.
              </p>
              <div className="reschedule-actions">
                <button
                  type="button"
                  className="sessions-outline-button"
                  onClick={closeReschedule}
                >
                  Close
                </button>
                <button type="submit" className="sessions-primary-button">
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Sessions;
