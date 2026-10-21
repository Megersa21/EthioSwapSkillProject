import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

const API_URL = 'http://localhost:5000/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to process your request.');
      }

      setMessage(
        data.message ||
          'If an account exists for this email, password-reset instructions will be sent.',
      );
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the server. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" to="/">
          <span className="auth-brand-icon">⇄</span>
          EthioSwapSkill
        </Link>

        <div className="auth-heading">
          <h1>Forgot your password?</h1>
          <p className="auth-subtitle">
            Enter your registered email address to receive a password-reset
            link.
          </p>
        </div>

        {message && (
          <div className="auth-success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="recovery-email">Email address</label>
            <input
              id="recovery-email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Reset password'}
          </button>
        </form>

        <p className="auth-switch">
          Remember your password? <Link to="/login">Log in</Link>
        </p>

        <Link className="back-home" to="/">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}
