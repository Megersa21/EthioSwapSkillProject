import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    window.alert(
      'Your login form is working. Authentication will be connected when we build the backend.',
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
          <h1>Welcome back!</h1>
          <p className="auth-subtitle">Log in to continue exchanging skills.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>

            <div className="auth-password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button className="auth-button" type="submit">
            Log in
          </button>
          <Link className="auth-forgot-bottom" to="/forgot-password">
            Forgot password?
          </Link>
        </form>

        <div className="auth-divider">
          <span>New to SwapSkill?</span>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create an account</Link>
        </p>

        <Link className="back-home" to="/">
          ← Back to home
        </Link>

        <p className="auth-footer-note">
          Share your skills. Learn from each other.
        </p>
      </section>
    </main>
  );
}
