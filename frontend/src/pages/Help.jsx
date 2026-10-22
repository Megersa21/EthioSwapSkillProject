import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Help.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const reportTypes = [
  { value: 'user', label: 'Report a user' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'scam', label: 'Scam or suspicious activity' },
  { value: 'technical_issue', label: 'Technical problem' },
  { value: 'other', label: 'Other problem' },
];

export default function Help() {
  const [reportType, setReportType] = useState('technical_issue');
  const [reportedUserId, setReportedUserId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice(null);

    const token = localStorage.getItem('token');

    if (!token) {
      setNotice({
        type: 'error',
        text: 'Please log in before submitting a report.',
      });
      return;
    }

    if (!description.trim()) {
      setNotice({
        type: 'error',
        text: 'Please describe the problem before submitting.',
      });
      return;
    }

    if (reportedUserId.trim()) {
      const id = Number(reportedUserId);

      if (!Number.isInteger(id) || id <= 0) {
        setNotice({
          type: 'error',
          text: 'Enter a valid user ID, or leave it empty.',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_type: reportType,
          description: description.trim(),
          ...(reportedUserId.trim()
            ? { reported_user_id: Number(reportedUserId) }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit your report.');
      }

      setNotice({
        type: 'success',
        text: 'Your report has been submitted successfully. Our admin team can now review it.',
      });
      setDescription('');
      setReportedUserId('');
      setReportType('technical_issue');
    } catch (error) {
      setNotice({
        type: 'error',
        text:
          error.message || 'Could not connect to the server. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="help-page">
      <section className="help-hero">
        <div className="help-hero-icon">
          <span aria-hidden="true">?</span>
        </div>
        <p className="help-eyebrow">ETHIOSWAPSKILL SUPPORT</p>
        <h1>How can we help you?</h1>
        <p>
          Have a problem with your account, a skill exchange, or another member?
          Tell us what happened so our team can review it.
        </p>
      </section>

      <section className="help-content">
        <aside className="help-info-card">
          <h2>Need assistance?</h2>
          <p>
            Submit a report using the form. Your report will be sent securely to
            the EthioSwapSkill support team for review.
          </p>

          <div className="help-info-item">
            <span className="help-info-icon" aria-hidden="true">
              ✓
            </span>
            <div>
              <h3>Private submission</h3>
              <p>Your account identifies who submitted the report.</p>
            </div>
          </div>

          <div className="help-info-item">
            <span className="help-info-icon" aria-hidden="true">
              ↗
            </span>
            <div>
              <h3>Admin review</h3>
              <p>Your report appears in the admin Reports dashboard.</p>
            </div>
          </div>

          <div className="help-info-item">
            <span className="help-info-icon" aria-hidden="true">
              i
            </span>
            <div>
              <h3>Give clear details</h3>
              <p>
                Explain what happened without sharing passwords or private
                credentials.
              </p>
            </div>
          </div>

          <Link to="/dashboard" className="help-back-link">
            ← Back to Dashboard
          </Link>
        </aside>

        <section className="help-form-card">
          <div className="help-form-heading">
            <div>
              <p className="help-eyebrow">CONTACT SUPPORT</p>
              <h2>Report a problem</h2>
            </div>
            <span className="help-form-symbol" aria-hidden="true">
              ✉
            </span>
          </div>

          <p className="help-form-intro">
            Complete the form below. Fields marked with * are required.
          </p>

          {notice && (
            <div
              className={`help-notice help-notice-${notice.type}`}
              role="status"
              aria-live="polite"
            >
              {notice.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="report-type">What do you need help with? *</label>
            <select
              id="report-type"
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              required
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <label htmlFor="reported-user-id">
              Reported user ID <span>(optional)</span>
            </label>
            <input
              id="reported-user-id"
              type="number"
              min="1"
              value={reportedUserId}
              onChange={(event) => setReportedUserId(event.target.value)}
              placeholder="Enter the user's ID if applicable"
            />
            <small>
              Only fill this in when your report concerns a specific user.
            </small>

            <label htmlFor="report-description">Describe the problem *</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain what happened, when it happened, and what help you need..."
              rows={6}
              maxLength={5000}
              required
            />
            <div className="help-character-count">
              {description.length}/5000 characters
            </div>

            <button
              type="submit"
              className="help-submit-button"
              disabled={loading}
            >
              {loading ? 'Submitting report...' : 'Submit Report →'}
            </button>

            <p className="help-form-footnote">
              Please provide accurate information. Your report will be submitted
              with a pending status for admin review.
            </p>
          </form>
        </section>
      </section>
    </main>
  );
}
