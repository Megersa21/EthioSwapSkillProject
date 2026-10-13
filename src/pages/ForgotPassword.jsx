import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    window.alert(
      'Your request has been received. Password recovery will be connected when we build the backend.',
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" to="/">
          <span className="auth-brand-icon">⇄</span>
          SwapSkill
        </Link>

        <div className="auth-heading">
          <h1>Forgot your password?</h1>
          <p className="auth-subtitle">
            Enter your email address to start recovering your account.
          </p>
        </div>

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
            />
          </div>

          <button className="auth-button" type="submit">
            Reset password
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
