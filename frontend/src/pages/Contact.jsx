import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/InformationPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: 'General question',
    message: '',
  });

  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setNotice('');
    setNoticeType('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setNotice('');
    setNoticeType('');

    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          topic: form.topic,
          message: form.message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'We could not send your message. Please try again.',
        );
      }

      setNotice(
        data.message ||
          'Your message was submitted successfully. Thank you for contacting EthioSwapSkill!',
      );
      setNoticeType('success');

      setForm({
        name: '',
        email: '',
        topic: 'General question',
        message: '',
      });
    } catch (error) {
      setNotice(
        error.message ||
          'Could not connect to the contact service. Please try again later.',
      );
      setNoticeType('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="information-page">
      <section className="information-hero">
        <div className="information-hero-content">
          <span className="information-eyebrow">WE ARE HERE TO HELP</span>

          <h1>Let's start a conversation.</h1>

          <p>
            Have a question, suggestion, or concern about EthioSwapSkill? We
            want to make learning and sharing skills a better experience.
          </p>

          <div className="information-hero-actions">
            <Link
              to="/help"
              className="information-button information-button-primary"
            >
              Help &amp; Support
            </Link>

            <Link
              to="/community-rules"
              className="information-button information-button-secondary"
            >
              Community Rules
            </Link>
          </div>
        </div>
      </section>

      <section className="information-content contact-content">
        <div className="information-section-heading">
          <span className="information-eyebrow">CONTACT US</span>
          <h2>How can we help you?</h2>
          <p>Choose a topic and describe what you need help with.</p>
        </div>

        <div className="contact-layout">
          <aside className="contact-info">
            <div className="contact-info-icon" aria-hidden="true">
              💬
            </div>

            <h3>Your voice matters</h3>

            <p>
              Your feedback can help improve the platform for everyone. You can
              contact us about:
            </p>

            <ul>
              <li>Account and profile questions</li>
              <li>Skill exchange requests</li>
              <li>Technical problems</li>
              <li>Community concerns</li>
              <li>Ideas and suggestions</li>
            </ul>

            <div className="contact-info-note">
              <strong>Need a quick answer?</strong>
              <p>
                Visit the <Link to="/help">Help &amp; Support</Link> page for
                available assistance.
              </p>
            </div>
          </aside>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form-heading">
              <h3>Send us a message</h3>
              <p>Complete the fields below.</p>
            </div>

            <label htmlFor="contact-name">Your name</label>
            <input
              id="contact-name"
              name="name"
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              autoComplete="name"
              required
            />

            <label htmlFor="contact-email">Email address</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              maxLength={254}
              autoComplete="email"
              required
            />

            <label htmlFor="contact-topic">What is this about?</label>
            <select
              id="contact-topic"
              name="topic"
              value={form.topic}
              onChange={handleChange}
              required
            >
              <option>General question</option>
              <option>Account or profile</option>
              <option>Skill exchange</option>
              <option>Technical problem</option>
              <option>Safety or community concern</option>
              <option>Suggestion or feedback</option>
            </select>

            <label htmlFor="contact-message">Your message</label>
            <textarea
              id="contact-message"
              name="message"
              placeholder="Tell us how we can help..."
              rows={6}
              value={form.message}
              onChange={handleChange}
              maxLength={5000}
              required
            />

            <button
              type="submit"
              className="contact-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Submit message'}
              {!isSubmitting && <span aria-hidden="true"> →</span>}
            </button>

            {notice && (
              <p
                className={`contact-notice ${noticeType}`}
                role="status"
                aria-live="polite"
              >
                {notice}
              </p>
            )}

            <p className="contact-form-disclaimer">
              Please do not include passwords or other sensitive information in
              your message.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
