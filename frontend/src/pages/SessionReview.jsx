import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import '../styles/SessionReview.css';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

const reviewTags = [
  'Clear explanations',
  'Patient',
  'On time',
  'Well prepared',
];

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function getUserId(user) {
  return user?.id ?? user?.userId ?? user?.user_id ?? null;
}

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString(undefined, {
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

function formatDuration(minutes) {
  const value = Number(minutes);

  if (!Number.isFinite(value) || value <= 0) {
    return 'Not recorded';
  }

  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  if (hours && remainingMinutes) {
    return `${hours} hr ${remainingMinutes} min`;
  }

  if (hours) return `${hours} hr`;

  return `${remainingMinutes} min`;
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function SessionReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: routeSessionId } = useParams();

  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(4);
  const [selectedTags, setSelectedTags] = useState([
    'Clear explanations',
    'Patient',
  ]);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [notice, setNotice] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserId = getUserId(currentUser);
  const token = localStorage.getItem('token');

  // Support route params, navigation state, and the current session
  // saved when the user leaves the live room.
  const sessionId =
    routeSessionId ||
    location.state?.sessionId ||
    session?.id ||
    localStorage.getItem('swapSkillLastSessionId');

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!sessionId) {
        setLoading(false);
        setPageError(
          'The session ID is missing. Open the session from your Sessions page and try again.',
        );
        return;
      }

      if (!token) {
        setLoading(false);
        setPageError('Your login session has expired. Please sign in again.');
        return;
      }

      setLoading(true);
      setPageError('');

      try {
        const response = await fetch(`${API_URL}/sessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message || result.error || 'Could not load session details.',
          );
        }

        const sessions =
          result.sessions || result.data?.sessions || result.data || [];

        const matchingSession = Array.isArray(sessions)
          ? sessions.find((item) => String(item.id) === String(sessionId))
          : null;

        if (!matchingSession) {
          throw new Error('This session was not found in your account.');
        }

        if (!cancelled) {
          setSession(matchingSession);
          localStorage.setItem(
            'swapSkillLastSessionId',
            String(matchingSession.id),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            getErrorMessage(error, 'Could not load session details.'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const partner = useMemo(() => {
    if (!session) return null;

    const requesterId = session.requester_id ?? session.requesterId;
    const recipientId = session.recipient_id ?? session.recipientId;

    const isRequester =
      currentUserId != null &&
      requesterId != null &&
      String(currentUserId) === String(requesterId);

    const isRecipient =
      currentUserId != null &&
      recipientId != null &&
      String(currentUserId) === String(recipientId);

    let name = '';

    if (isRequester) {
      name =
        session.recipient_name ||
        session.recipientName ||
        session.partner_name ||
        session.partnerName ||
        '';
    } else if (isRecipient) {
      name =
        session.requester_name ||
        session.requesterName ||
        session.partner_name ||
        session.partnerName ||
        '';
    } else {
      name =
        session.partner_name ||
        session.partnerName ||
        session.partner?.name ||
        '';
    }

    return {
      id: isRequester
        ? recipientId
        : isRecipient
          ? requesterId
          : (session.partner_id ?? session.partnerId ?? null),
      name: name || 'Your swap partner',
    };
  }, [session, currentUserId]);

  const skillDetails = useMemo(() => {
    if (!session) {
      return { firstSkill: '', secondSkill: '' };
    }

    const offered =
      session.offered_skill_name ||
      session.offeredSkillName ||
      session.teach_skill ||
      session.teachSkill ||
      '';

    const wanted =
      session.wanted_skill_name ||
      session.wantedSkillName ||
      session.learn_skill ||
      session.learnSkill ||
      '';

    return {
      firstSkill: offered || wanted || 'Skill exchange',
      secondSkill: offered && wanted ? wanted : '',
    };
  }, [session]);

  const scheduledAt =
    session?.scheduled_at ||
    session?.scheduledAt ||
    session?.start_time ||
    session?.startTime ||
    null;

  const durationMinutes =
    session?.actual_duration_minutes ??
    session?.actualDurationMinutes ??
    session?.duration_minutes ??
    session?.durationMinutes ??
    null;

  const sessionStatus = String(session?.status || '').toLowerCase();
  const isCompleted = sessionStatus === 'completed';

  function toggleTag(tag) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  async function submitReview(event) {
    event.preventDefault();
    setNotice('');

    if (!sessionId || !session) {
      setNotice('Session details are not available yet.');
      return;
    }

    if (!confirmed) {
      setNotice('Please confirm that you completed your teaching turn first.');
      return;
    }

    if (!partner?.id) {
      setNotice(
        'The partner ID could not be determined from this session. Please check the session API response.',
      );
      return;
    }

    if (!token) {
      setNotice('Please sign in again before submitting your review.');
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: session.id,
          reviewee_id: partner.id,
          rating,
          comment: comment.trim(),
          tags: selectedTags,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || result.error || 'Could not submit your review.',
        );
      }

      setReviewSubmitted(true);
      setNotice('Your review was submitted successfully.');
    } catch (error) {
      setNotice(
        getErrorMessage(
          error,
          'Unable to submit your review. Please try again.',
        ),
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    setNotice('');

    if (!reportReason) {
      setNotice('Please choose a reason for your report.');
      return;
    }

    if (!session || !partner?.id) {
      setNotice('Session or partner details are not available.');
      return;
    }

    if (!token) {
      setNotice('Please sign in again before submitting your report.');
      return;
    }

    setSubmittingReport(true);

    try {
      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: session.id,
          reported_user_id: partner.id,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || result.error || 'Could not submit your report.',
        );
      }

      setReportOpen(false);
      setReportReason('');
      setReportDetails('');
      setNotice('Your report was submitted successfully.');
    } catch (error) {
      setNotice(
        getErrorMessage(
          error,
          'Unable to submit your report. Please try again.',
        ),
      );
    } finally {
      setSubmittingReport(false);
    }
  }

  function scheduleNextSession() {
    navigate('/sessions');
  }

  if (loading) {
    return (
      <main className="session-review-page">
        <div className="review-container">
          <section className="review-section">
            <p>Loading your session details…</p>
          </section>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="session-review-page">
        <button
          type="button"
          className="review-back-link"
          onClick={() => navigate('/sessions')}
        >
          ← Back to sessions
        </button>

        <div className="review-container">
          <section className="review-section">
            <h1>Session details unavailable</h1>
            <p role="alert">{pageError || 'We could not find this session.'}</p>
            <button
              type="button"
              className="review-primary-button"
              onClick={() => navigate('/sessions')}
            >
              Return to sessions
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="session-review-page">
      <button
        type="button"
        className="review-back-link"
        onClick={() => navigate('/sessions')}
      >
        ← Back to sessions
      </button>

      <div className="review-container">
        <section className="review-completion">
          <div className="review-success-icon">✓</div>
          <h1>{isCompleted ? 'Session complete' : 'Session wrap-up'}</h1>
          <p>
            {skillDetails.firstSkill}
            {skillDetails.secondSkill ? ` ⇄ ${skillDetails.secondSkill}` : ''}
            {' with '}
            {partner?.name || 'your swap partner'}
          </p>
          {pageError && (
            <p className="review-notice" role="alert">
              {pageError}
            </p>
          )}
        </section>

        <section className="review-stats">
          <article className="review-stat-card">
            <strong>{formatDuration(durationMinutes)}</strong>
            <span>Session duration</span>
          </article>

          <article className="review-stat-card">
            <strong>{session.status || 'Status unavailable'}</strong>
            <span>Session status</span>
          </article>

          <article className="review-stat-card">
            <strong>{formatDate(scheduledAt)}</strong>
            <span>
              {formatTime(scheduledAt) || 'Scheduled time unavailable'}
            </span>
          </article>
        </section>

        <section className="review-section">
          <h2>Confirm the swap is done</h2>

          <div className="review-confirm-row">
            <span>
              <strong>{partner?.name || 'Your swap partner'}</strong>
              {skillDetails.secondSkill ? ` — ${skillDetails.secondSkill}` : ''}
            </span>
            <span className="review-confirmed-badge">
              {isCompleted ? 'Session completed' : 'Review pending'}
            </span>
          </div>

          <div className="review-confirm-row">
            <span>
              <strong>You</strong>
              {skillDetails.firstSkill ? ` — ${skillDetails.firstSkill}` : ''}
            </span>

            {confirmed ? (
              <span className="review-confirmed-badge">Confirmed</span>
            ) : (
              <button
                type="button"
                className="review-confirm-button"
                onClick={() => {
                  setConfirmed(true);
                  setNotice('');
                }}
              >
                Confirm
              </button>
            )}
          </div>
        </section>

        <form className="review-section review-form" onSubmit={submitReview}>
          <h2>Review {partner?.name || 'your swap partner'}</h2>

          <div className="review-stars" aria-label="Choose a rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                className={
                  star <= rating ? 'review-star selected' : 'review-star'
                }
                onClick={() => setRating(star)}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                aria-pressed={rating === star}
              >
                ★
              </button>
            ))}
          </div>

          <div className="review-tags">
            {reviewTags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={
                  selectedTags.includes(tag)
                    ? 'review-tag selected'
                    : 'review-tag'
                }
                onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <label htmlFor="review-comment">Comment (optional)</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Share what you learned."
            rows={4}
          />

          {notice && (
            <p className="review-notice" role="status">
              {notice}
            </p>
          )}

          <div className="review-actions">
            <button
              type="submit"
              className="review-primary-button"
              disabled={reviewSubmitted || submittingReview}
            >
              {submittingReview
                ? 'Submitting…'
                : reviewSubmitted
                  ? 'Review submitted'
                  : 'Submit review'}
            </button>

            <button
              type="button"
              className="review-secondary-button"
              onClick={scheduleNextSession}
            >
              Back to sessions
            </button>

            <button
              type="button"
              className="review-report-button"
              onClick={() => {
                setReportOpen((open) => !open);
                setNotice('');
              }}
            >
              Report a problem
            </button>
          </div>
        </form>

        {reportOpen && (
          <form className="review-section report-form" onSubmit={submitReport}>
            <h2>Report a problem</h2>
            <p>Tell us what happened during this session.</p>

            <label htmlFor="report-reason">Reason</label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              required
            >
              <option value="">Choose a reason</option>
              <option value="Inappropriate behavior">
                Inappropriate behavior
              </option>
              <option value="Missed teaching turn">Missed teaching turn</option>
              <option value="Harassment">Harassment</option>
              <option value="Technical problem">Technical problem</option>
              <option value="Other">Other</option>
            </select>

            <label htmlFor="report-details">
              Additional details (optional)
            </label>
            <textarea
              id="report-details"
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              placeholder="Explain the issue."
              rows={3}
            />

            <div className="report-form-actions">
              <button
                type="submit"
                className="review-primary-button"
                disabled={submittingReport}
              >
                {submittingReport ? 'Submitting…' : 'Submit report'}
              </button>
              <button
                type="button"
                className="review-secondary-button"
                onClick={() => setReportOpen(false)}
              >
                Close
              </button>
            </div>
          </form>
        )}

        {reviewSubmitted && (
          <div className="review-finished-note">
            Thank you for helping make EthioSwapSkill better!
          </div>
        )}
      </div>
    </main>
  );
}

export default SessionReview;
