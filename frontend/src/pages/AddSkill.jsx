import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/AddSkill.css';

const API_URL = 'http://localhost:5000/api/skills';

export default function AddSkill() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    teachSkill: '',
    teachDescription: '',
    teachLevel: 'Intermediate',
    learnSkill: '',
    learnDescription: '',
    availability: 'Weekends',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (
      form.teachSkill.trim().toLowerCase() ===
      form.learnSkill.trim().toLowerCase()
    ) {
      setError('Choose two different skills for your exchange.');
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      setError('Please log in before saving your skills.');
      return;
    }

    setSaving(true);

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    let teachSkillId = null;

    try {
      // Save the skill you can teach.
      const teachResponse = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          skill_name: form.teachSkill.trim(),
          description: form.teachDescription.trim(),
          skill_type: 'teach',
          proficiency_level: form.teachLevel,
        }),
      });

      const teachResult = await teachResponse.json();

      if (!teachResponse.ok) {
        throw new Error(
          teachResult.message || 'Could not save the skill you can teach.',
        );
      }

      teachSkillId = teachResult.skill?.id ?? teachResult.data?.id ?? null;

      // Save the skill you want to learn.
      const learnResponse = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          skill_name: form.learnSkill.trim(),
          description: form.learnDescription.trim(),
          skill_type: 'learn',
          proficiency_level: null,
        }),
      });

      const learnResult = await learnResponse.json();

      if (!learnResponse.ok) {
        // Avoid leaving only the first skill saved if cleanup is possible.
        if (teachSkillId !== null) {
          await fetch(`${API_URL}/${teachSkillId}`, {
            method: 'DELETE',
            headers,
          }).catch(() => {});
        }

        throw new Error(
          learnResult.message ||
            'Your teaching skill was saved, but your learning skill failed. Please try again.',
        );
      }

      // Keep availability locally for now; it is not part of the skill
      // fields handled by the current backend controller.
      localStorage.setItem('swapSkillAvailability', form.availability);

      window.alert('Your teaching and learning skills have been saved!');

      navigate('/dashboard');
    } catch (err) {
      console.error('Save skills error:', err);
      setError(
        err.message ||
          'Could not connect to the server. Make sure your backend is running.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="add-skill-page">
      <div className="add-skill-container">
        <Link to="/dashboard" className="add-skill-back">
          ← Back to dashboard
        </Link>

        <header className="add-skill-heading">
          <span className="add-skill-eyebrow">SHARE WHAT YOU KNOW</span>
          <h1>Create a skill listing</h1>
          <p>
            Tell the community what you can teach and what you want to learn.
            Great exchanges start with sharing.
          </p>
        </header>

        <form className="add-skill-form" onSubmit={handleSubmit}>
          <section className="skill-form-section">
            <div className="skill-section-heading">
              <span className="skill-section-icon teach-icon">↗</span>
              <div>
                <h2>What can you teach?</h2>
                <p>Share a skill you can help someone learn.</p>
              </div>
            </div>

            <div className="add-skill-field">
              <label htmlFor="teachSkill">Skill name *</label>
              <input
                id="teachSkill"
                name="teachSkill"
                value={form.teachSkill}
                onChange={handleChange}
                placeholder="e.g. JavaScript, UI/UX Design"
                required
              />
            </div>

            <div className="add-skill-field">
              <label htmlFor="teachDescription">Description</label>
              <textarea
                id="teachDescription"
                name="teachDescription"
                value={form.teachDescription}
                onChange={handleChange}
                placeholder="Describe what you can teach..."
                rows="3"
              />
            </div>

            <div className="add-skill-field">
              <label htmlFor="teachLevel">Your experience level *</label>
              <select
                id="teachLevel"
                name="teachLevel"
                value={form.teachLevel}
                onChange={handleChange}
                required
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
            </div>
          </section>

          <section className="skill-form-section">
            <div className="skill-section-heading">
              <span className="skill-section-icon learn-icon">↙</span>
              <div>
                <h2>What do you want to learn?</h2>
                <p>Find someone who can help you grow.</p>
              </div>
            </div>

            <div className="add-skill-field">
              <label htmlFor="learnSkill">Skill name *</label>
              <input
                id="learnSkill"
                name="learnSkill"
                value={form.learnSkill}
                onChange={handleChange}
                placeholder="e.g. React, English, Graphic Design"
                required
              />
            </div>

            <div className="add-skill-field">
              <label htmlFor="learnDescription">
                What would you like to learn?
              </label>
              <textarea
                id="learnDescription"
                name="learnDescription"
                value={form.learnDescription}
                onChange={handleChange}
                placeholder="Describe your learning goals..."
                rows="3"
              />
            </div>
          </section>

          <section className="skill-form-section">
            <div className="skill-section-heading">
              <span className="skill-section-icon availability-icon">◷</span>
              <div>
                <h2>When are you available?</h2>
                <p>Choose a convenient time for skill exchanges.</p>
              </div>
            </div>

            <div className="add-skill-field">
              <label htmlFor="availability">Availability *</label>
              <select
                id="availability"
                name="availability"
                value={form.availability}
                onChange={handleChange}
                required
              >
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Evenings</option>
                <option>Flexible</option>
              </select>
            </div>
          </section>

          {error && (
            <p className="add-skill-error" role="alert">
              {error}
            </p>
          )}

          <div className="add-skill-actions">
            <Link to="/dashboard" className="cancel-skill-button">
              Cancel
            </Link>

            <button
              type="submit"
              className="save-skill-button"
              disabled={saving}
            >
              {saving ? 'Saving skills...' : 'Save skill listing →'}
            </button>
          </div>

          <p className="add-skill-note">
            Your teaching and learning skills are saved to your account.
            Availability is stored in this browser for now.
          </p>
        </form>
      </div>
    </main>
  );
}
