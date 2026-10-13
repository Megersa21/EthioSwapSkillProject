import { Link } from 'react-router-dom';
import '../styles/Auth.css';

export default function Register() {
  function handleSubmit(event) {
    event.preventDefault();
    window.alert(
      'The registration interface is ready. Account creation will be connected when the backend is built.',
    );
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" to="/">
          ⇄ SwapSkill
        </Link>
        <h1>Create your account</h1>
        <p className="auth-subtitle">
          Join a community where everyone has something to teach.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="full-name">Full name</label>
          <input
            id="full-name"
            type="text"
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <button className="auth-button" type="submit">
            Create account
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <Link className="back-home" to="/">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}
