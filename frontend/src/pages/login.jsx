import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const API_URL = 'http://localhost:5000/api';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Login failed. Please check your details.',
        );
      }

      if (!result.token) {
        throw new Error(
          'Login succeeded, but the server did not return an authentication token.',
        );
      }

      localStorage.setItem('token', result.token);

      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.message ||
          'Unable to connect to the server. Check that your backend is running.',
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

          {error && (
            <p role="alert" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <Link className="auth-forgot-bottom" to="/forgot-password">
            Forgot password?
          </Link>
        </form>

        <div className="auth-divider">
          <span>New to SwapSkill?</span>
        </div>

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create an account</Link>
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
