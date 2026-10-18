import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Sessions.css';

const API_URL = 'http://localhost:5000/api';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Please log in to manage your sessions.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'The request could not be completed.');
  }

  return result;
}

function getLocalDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return 'Date not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date not available';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getPartnerName(item) {
  return (
    item.partner_name ||
    item.other_user_name ||
    item.requester_name ||
    item.recipient_name ||
    item.sender_name ||
    item.receiver_name ||
    item.user_name ||
    'Skill-swap partner'
  );
}

function getSessionPartnerName(session, currentUserId) {
  if (Number(session.requester_id) === currentUserId) {
    return (
      session.recipient_name ||
      session.partner_name ||
      session.other_user_name ||
      'Skill-swap partner'
    );
  }

  if (Number(session.recipient_id) === currentUserId) {
    return (
      session.requester_name ||
      session.partner_name ||
      session.other_user_name ||
      'Skill-swap partner'
    );
  }

  return getPartnerName(session);
}

function getSessionStatus(session) {
  return (session.status || 'scheduled').toLowerCase();
}

function getRequestId(request) {
  return request.id ?? request.request_id ?? request.swap_request_id;
}

function Sessions() {
  let currentUser = {};

  try {
    currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    currentUser = {};
  }

  const currentUserId = Number(
    currentUser.id ?? currentUser.userId ?? currentUser.user_id,
  );

  const [sessions, setSessions] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    swap_request_id: '',
    scheduled_at: '',
    duration_minutes: '60',
    meeting_link: '',
    notes: '',
  });

  async function loadSessions() {
    setLoading(true);
    setError('');

    try {
      const results = await Promise.allSettled([
        apiRequest('/sessions'),
        apiRequest('/requests?direction=all&status=accepted'),
      ]);

      const sessionsResult = results[0];
      const requestsResult = results[1];

      if (sessionsResult.status === 'fulfilled') {
        setSessions(
          Array.isArray(sessionsResult.value.sessions)
            ? sessionsResult.value.sessions
            : [],
        );
      } else {
        throw sessionsResult.reason;
      }

      if (requestsResult.status === 'fulfilled') {
        const requests = Array.isArray(requestsResult.value.requests)
          ? requestsResult.value.requests
          : [];

        setAcceptedRequests(
          requests.filter(
            (request) => (request.status || '').toLowerCase() === 'accepted',
          ),
        );
      } else {
        setAcceptedRequests([]);
        setError(
          `Sessions loaded, but accepted requests could not be loaded: ${requestsResult.reason.message}`,
        );
      }
    } catch (err) {
      setError(err.message || 'Could not load your sessions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  const scheduledSessions = useMemo(
    () =>
      sessions
        .filter((session) => getSessionStatus(session) === 'scheduled')
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [sessions],
  );

  const completedSessions = useMemo(
    () =>
      sessions
        .filter((session) => getSessionStatus(session) === 'completed')
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)),
    [sessions],
  );

  const cancelledSessions = useMemo(
    () =>
      sessions
        .filter((session) => getSessionStatus(session) === 'cancelled')
        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)),
    [sessions],
  );

  const existingRequestIds = useMemo(
    () =>
      new Set(
        sessions.map((session) =>
          String(session.swap_request_id ?? session.request_id ?? ''),
        ),
      ),
    [sessions],
  );

  const availableRequests = acceptedRequests.filter((request) => {
    const id = getRequestId(request);
    return id != null && !existingRequestIds.has(String(id));
  });

  const visibleSessions =
    activeTab === 'upcoming'
      ? scheduledSessions
      : activeTab === 'completed'
        ? completedSessions
        : activeTab === 'cancelled'
          ? cancelledSessions
          : sessions;

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openScheduleForm() {
    setFeedback('');
    setError('');

    setForm({
      swap_request_id: '',
      scheduled_at: getLocalDateTimeValue(),
      duration_minutes: '60',
      meeting_link: '',
      notes: '',
    });

    setShowForm(true);
  }

  async function scheduleSession(event) {
    event.preventDefault();
    setFeedback('');
    setError('');

    if (!form.swap_request_id) {
      setError('Please select an accepted swap request.');
      return;
    }

    const scheduledDate = new Date(form.scheduled_at);

    if (
      !form.scheduled_at ||
      Number.isNaN(scheduledDate.getTime()) ||
      scheduledDate.getTime() <= Date.now()
    ) {
      setError('Choose a future date and time.');
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          swap_request_id: Number(form.swap_request_id),
          scheduled_at: scheduledDate.toISOString(),
          duration_minutes: Number(form.duration_minutes),
          meeting_link: form.meeting_link.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      if (result.session) {
        setSessions((previous) => [
          result.session,
          ...previous.filter((session) => session.id !== result.session.id),
        ]);
      } else {
        await loadSessions();
      }

      setShowForm(false);
      setFeedback(result.message || 'Your session was scheduled successfully.');
      setActiveTab('upcoming');
    } catch (err) {
      setError(err.message || 'Could not schedule the session.');
    } finally {
      setSaving(false);
    }
  }

  async function updateSessionStatus(session, status) {
    const action = status === 'cancelled' ? 'cancel' : 'complete';

    const confirmed = window.confirm(
      status === 'cancelled'
        ? 'Are you sure you want to cancel this session?'
        : 'Mark this session as completed?',
    );

    if (!confirmed) return;

    setUpdatingId(session.id);
    setFeedback('');
    setError('');

    try {
      const result = await apiRequest(`/sessions/${session.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      if (result.session) {
        setSessions((previous) =>
          previous.map((item) =>
            item.id === session.id ? result.session : item,
          ),
        );
      } else {
        await loadSessions();
      }

      setFeedback(
        result.message ||
          `Session ${action === 'cancel' ? 'cancelled' : 'marked completed'} successfully.`,
      );
    } catch (err) {
      setError(err.message || 'Could not update this session.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <main className="sessions-page">
        <section className="sessions-hero">
          <div>
            <span className="sessions-eyebrow">LEARN TOGETHER</span>
            <h1>Your skill sessions</h1>
            <p>
              Plan your skill exchanges, meet your partners, and turn shared
              knowledge into real progress.
            </p>
          </div>

          <button
            type="button"
            className="sessions-primary-button"
            onClick={openScheduleForm}
          >
            <span aria-hidden="true">+</span> Schedule a session
          </button>
        </section>

        <section className="sessions-stats">
          <article className="sessions-stat-card">
            <span className="sessions-stat-icon">◷</span>
            <div>
              <p>Scheduled</p>
              <strong>{loading ? '—' : scheduledSessions.length}</strong>
            </div>
          </article>

          <article className="sessions-stat-card">
            <span className="sessions-stat-icon purple">✓</span>
            <div>
              <p>Completed</p>
              <strong>{loading ? '—' : completedSessions.length}</strong>
            </div>
          </article>

          <article className="sessions-stat-card">
            <span className="sessions-stat-icon orange">⇄</span>
            <div>
              <p>Accepted requests to schedule</p>
              <strong>{loading ? '—' : availableRequests.length}</strong>
            </div>
          </article>
        </section>

        {feedback && (
          <div className="sessions-feedback success" role="status">
            {feedback}
          </div>
        )}

        {error && (
          <div className="sessions-feedback error" role="alert">
            {error}
          </div>
        )}

        {showForm && (
          <section className="sessions-form-panel">
            <div className="sessions-form-heading">
              <div>
                <h2>Schedule a skill session</h2>
                <p>Choose an accepted swap request and set a time.</p>
              </div>

              <button
                type="button"
                className="sessions-close-button"
                onClick={() => setShowForm(false)}
                aria-label="Close schedule form"
              >
                ×
              </button>
            </div>

            {availableRequests.length === 0 ? (
              <div className="sessions-empty compact">
                <span aria-hidden="true">⇄</span>
                <h3>No requests ready to schedule</h3>
                <p>
                  You need an accepted swap request without an existing session
                  before you can schedule one.
                </p>
                <Link to="/requests">View your requests</Link>
              </div>
            ) : (
              <form className="sessions-form" onSubmit={scheduleSession}>
                <label htmlFor="session-request">
                  Accepted swap request
                  <select
                    id="session-request"
                    name="swap_request_id"
                    value={form.swap_request_id}
                    onChange={updateForm}
                    required
                  >
                    <option value="">Choose a partner</option>
                    {availableRequests.map((request) => (
                      <option
                        key={getRequestId(request)}
                        value={getRequestId(request)}
                      >
                        {getPartnerName(request)} —{' '}
                        {request.offered_skill_name || 'Skill exchange'}
                        {request.wanted_skill_name
                          ? ` ↔ ${request.wanted_skill_name}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="sessions-form-row">
                  <label htmlFor="session-date">
                    Date and time
                    <input
                      id="session-date"
                      name="scheduled_at"
                      type="datetime-local"
                      min={getLocalDateTimeValue()}
                      value={form.scheduled_at}
                      onChange={updateForm}
                      required
                    />
                  </label>

                  <label htmlFor="session-duration">
                    Duration
                    <select
                      id="session-duration"
                      name="duration_minutes"
                      value={form.duration_minutes}
                      onChange={updateForm}
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1 hour 30 minutes</option>
                      <option value="120">2 hours</option>
                    </select>
                  </label>
                </div>

                <label htmlFor="session-link">
                  Meeting link <span>(optional)</span>
                  <input
                    id="session-link"
                    name="meeting_link"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={form.meeting_link}
                    onChange={updateForm}
                  />
                </label>

                <label htmlFor="session-notes">
                  Notes <span>(optional)</span>
                  <textarea
                    id="session-notes"
                    name="notes"
                    rows="3"
                    placeholder="What would you like to cover in this session?"
                    value={form.notes}
                    onChange={updateForm}
                  />
                </label>

                <div className="sessions-form-actions">
                  <button
                    type="button"
                    className="sessions-cancel-button"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    className="sessions-primary-button"
                    disabled={saving}
                  >
                    {saving ? 'Scheduling...' : 'Confirm session'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className="sessions-list-panel">
          <div className="sessions-list-heading">
            <div>
              <h2>Session activity</h2>
              <p>View and manage your skill-exchange schedule.</p>
            </div>
          </div>

          <div
            className="sessions-tabs"
            role="tablist"
            aria-label="Session status"
          >
            {[
              ['upcoming', 'Scheduled', scheduledSessions.length],
              ['completed', 'Completed', completedSessions.length],
              ['cancelled', 'Cancelled', cancelledSessions.length],
              ['all', 'All sessions', sessions.length],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={activeTab === value}
                className={activeTab === value ? 'active' : ''}
                onClick={() => setActiveTab(value)}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="sessions-empty">
              <h3>Loading your sessions...</h3>
              <p>Connecting to the EthioSwapSkill database.</p>
            </div>
          ) : visibleSessions.length === 0 ? (
            <div className="sessions-empty">
              <span aria-hidden="true">◷</span>
              <h3>
                {activeTab === 'upcoming'
                  ? 'No scheduled sessions yet'
                  : `No ${activeTab === 'all' ? '' : activeTab + ' '}sessions found`}
              </h3>
              <p>
                {activeTab === 'upcoming'
                  ? 'When a swap request is accepted, you can schedule a time to learn together.'
                  : 'Sessions in this category will appear here.'}
              </p>

              {activeTab === 'upcoming' && (
                <button
                  type="button"
                  className="sessions-secondary-button"
                  onClick={openScheduleForm}
                >
                  Schedule a session
                </button>
              )}
            </div>
          ) : (
            <div className="sessions-list">
              {visibleSessions.map((session) => {
                const status = getSessionStatus(session);
                const isUpdating = updatingId === session.id;

                const partnerId =
                  Number(session.requester_id) === currentUserId
                    ? session.recipient_id
                    : session.requester_id;

                const partnerName = getSessionPartnerName(
                  session,
                  currentUserId,
                );

                const reviewState = {
                  partnerId,
                  partnerName,
                  offeredSkillName: session.offered_skill_name,
                  wantedSkillName: session.wanted_skill_name,
                  scheduledAt: session.scheduled_at,
                  durationMinutes: session.duration_minutes,
                };

                return (
                  <article className="session-card" key={session.id}>
                    <div className="session-date-block">
                      <span>{formatDate(session.scheduled_at)}</span>
                      <strong>{formatTime(session.scheduled_at)}</strong>
                    </div>

                    <div className="session-card-content">
                      <div className="session-card-title">
                        <h3>{partnerName}</h3>
                        <span className={`session-status ${status}`}>
                          {status}
                        </span>
                      </div>

                      <p className="session-skills">
                        {session.offered_skill_name || 'Skill exchange'}
                        {session.wanted_skill_name
                          ? ` ↔ ${session.wanted_skill_name}`
                          : ''}
                      </p>

                      <div className="session-meta">
                        <span>◷ {session.duration_minutes || 60} minutes</span>

                        {session.meeting_link && (
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Join external meeting ↗
                          </a>
                        )}
                      </div>

                      {session.notes && (
                        <p className="session-notes">{session.notes}</p>
                      )}

                      {status === 'scheduled' && (
                        <div className="session-card-actions">
                          <Link
                            to={`/pre-join-session/${session.id}`}
                            className="session-video-button"
                            state={reviewState}
                          >
                            Prepare to Join
                          </Link>

                          <button
                            type="button"
                            className="session-secondary-button"
                            onClick={() =>
                              updateSessionStatus(session, 'completed')
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? 'Updating...' : 'Mark Completed'}
                          </button>

                          <button
                            type="button"
                            className="session-cancel-button"
                            onClick={() =>
                              updateSessionStatus(session, 'cancelled')
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? 'Updating...' : 'Cancel Session'}
                          </button>
                        </div>
                      )}

                      {status === 'completed' && (
                        <div className="session-card-actions">
                          <Link
                            to={`/session-review/${session.id}`}
                            className="session-video-button"
                            state={reviewState}
                          >
                            Write Review
                          </Link>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Sessions;
