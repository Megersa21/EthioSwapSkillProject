import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SessionReview.css';

const reviewTags = [
  'Clear explanations',
  'Patient',
  'On time',
  'Well prepared',
];

function SessionReview() {
  const navigate = useNavigate();

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
  const [notice, setNotice] = useState('');

  function toggleTag(tag) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  function submitReview(event) {
    event.preventDefault();

    if (!confirmed) {
      setNotice('Please confirm that you completed your teaching turn first.');
      return;
    }

    const review = {
      id: Date.now(),
      partner: 'Dawit A.',
      rating,
      tags: selectedTags,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const savedReviews = JSON.parse(
        localStorage.getItem('swapSkillSessionReviews') || '[]',
      );

      localStorage.setItem(
        'swapSkillSessionReviews',
        JSON.stringify([...savedReviews, review]),
      );

      setReviewSubmitted(true);
      setNotice('Your review has been saved on this device.');
    } catch (error) {
      console.error('Could not save review:', error);
      setNotice('Unable to save your review. Please try again.');
    }
  }

  function submitReport(event) {
    event.preventDefault();

    if (!reportReason) {
      setNotice('Please choose a reason for your report.');
      return;
    }

    try {
      const reports = JSON.parse(
        localStorage.getItem('swapSkillSessionReports') || '[]',
      );

      reports.push({
        id: Date.now(),
        partner: 'Dawit A.',
        reason: reportReason,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem('swapSkillSessionReports', JSON.stringify(reports));
      setReportOpen(false);
      setReportReason('');
      setNotice('Your report has been saved on this device.');
    } catch (error) {
      console.error('Could not save report:', error);
      setNotice('Unable to save your report. Please try again.');
    }
  }

  function scheduleNextSession() {
    navigate('/schedule-session');
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
          <h1>Session complete</h1>
          <p>Design ⇄ Web development with Dawit A.</p>
        </section>

        <section className="review-stats">
          <article className="review-stat-card">
            <strong>58 min</strong>
            <span>Time together</span>
          </article>

          <article className="review-stat-card">
            <strong>2 of 2</strong>
            <span>Turns taught</span>
          </article>

          <article className="review-stat-card">
            <strong>Today</strong>
            <span>4:00 PM</span>
          </article>
        </section>

        <section className="review-section">
          <h2>Confirm the swap is done</h2>

          <div className="review-confirm-row">
            <span>
              <strong>Dawit A.</strong> taught Web development
            </span>
            <span className="review-confirmed-badge">Confirmed</span>
          </div>

          <div className="review-confirm-row">
            <span>
              <strong>You</strong> taught Graphic design
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
          <h2>Review Dawit</h2>

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
              disabled={reviewSubmitted}
            >
              {reviewSubmitted ? 'Review submitted' : 'Submit review'}
            </button>

            <button
              type="button"
              className="review-secondary-button"
              onClick={scheduleNextSession}
            >
              Schedule next session
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

            <div className="report-form-actions">
              <button type="submit" className="review-primary-button">
                Submit report
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
            Thank you for helping make SwapSkill better!
          </div>
        )}
      </div>
    </main>
  );
}

export default SessionReview;
