import { Link } from 'react-router-dom';
import '../styles/Auth.css';

export default function Login() {
  function handleSubmit(event) {
    event.preventDefault();
    window.alert(
      'The login interface is ready. Authentication will be connected when the backend is built.',
    );
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" to="/">
          ⇄SwapSkill
        </Link>
        <h1>Welcome back!</h1>
        <p className="auth-subtitle">Log in to continue exchanging skills.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <button className="auth-button" type="submit">
            Log in
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
        <Link className="back-home" to="/">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}
