import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/EditProfile.css';

const defaultProfile = {
  name: 'Megersa Bekele',
  title: 'Full-Stack Developer',
  location: 'Dire Dawa, Ethiopia',
  bio: "I'm interested in exchanging skills, learning new technologies, and collaborating with other developers.",
  teachSkills: ['HTML', 'CSS', 'JavaScript', 'React'],
  learnSkills: ['Node.js', 'UI/UX Design'],
  availability: 'Weekends',
  level: 'Intermediate',
};

function EditProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('swapSkillMyProfile');
      return saved
        ? { ...defaultProfile, ...JSON.parse(saved) }
        : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [teachInput, setTeachInput] = useState('');
  const [learnInput, setLearnInput] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  function updateField(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  function addSkill(field, value, clearInput) {
    const skill = value.trim();

    if (!skill) return;

    setProfile((current) => {
      if (
        current[field].some(
          (item) => item.toLowerCase() === skill.toLowerCase(),
        )
      ) {
        return current;
      }

      return { ...current, [field]: [...current[field], skill] };
    });

    clearInput('');
  }

  function removeSkill(field, skill) {
    setProfile((current) => ({
      ...current,
      [field]: current[field].filter((item) => item !== skill),
    }));
  }

  function saveProfile(event) {
    event.preventDefault();

    localStorage.setItem('swapSkillMyProfile', JSON.stringify(profile));
    setSavedMessage('Your profile changes have been saved.');
  }

  return (
    <main className="edit-profile-page">
      <div className="edit-profile-heading">
        <div>
          <p className="edit-profile-eyebrow">YOUR ACCOUNT</p>
          <h1>Edit Profile</h1>
          <p>Keep your information and skill preferences up to date.</p>
        </div>

        <Link to="/dashboard" className="edit-profile-back">
          ← Dashboard
        </Link>
      </div>

      <form className="edit-profile-form" onSubmit={saveProfile}>
        <section className="edit-profile-card">
          <h2>Personal Information</h2>
          <p className="edit-profile-description">
            Tell other members a little about yourself.
          </p>

          <div className="edit-profile-fields">
            <label>
              Full name
              <input
                name="name"
                value={profile.name}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Professional title
              <input
                name="title"
                value={profile.title}
                onChange={updateField}
                placeholder="e.g. Frontend Developer"
              />
            </label>

            <label>
              Location
              <input
                name="location"
                value={profile.location}
                onChange={updateField}
                placeholder="City, country"
              />
            </label>

            <label>
              Skill level
              <select name="level" value={profile.level} onChange={updateField}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>

            <label className="edit-profile-full-width">
              About me
              <textarea
                name="bio"
                value={profile.bio}
                onChange={updateField}
                rows={5}
                placeholder="Tell people about yourself..."
              />
            </label>
          </div>
        </section>

        <section className="edit-profile-card">
          <h2>Skills I Can Teach</h2>
          <p className="edit-profile-description">
            Add skills you are comfortable sharing with others.
          </p>

          <div className="edit-profile-skill-input">
            <input
              value={teachInput}
              onChange={(event) => setTeachInput(event.target.value)}
              placeholder="Enter a skill, e.g. React"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSkill('teachSkills', teachInput, setTeachInput);
                }
              }}
            />
            <button
              type="button"
              onClick={() => addSkill('teachSkills', teachInput, setTeachInput)}
            >
              Add Skill
            </button>
          </div>

          <div className="edit-profile-skill-list">
            {profile.teachSkills.map((skill) => (
              <span className="edit-profile-skill teach" key={skill}>
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill('teachSkills', skill)}
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="edit-profile-card">
          <h2>Skills I Want to Learn</h2>
          <p className="edit-profile-description">
            Add the skills you want to develop through skill swapping.
          </p>

          <div className="edit-profile-skill-input">
            <input
              value={learnInput}
              onChange={(event) => setLearnInput(event.target.value)}
              placeholder="Enter a skill, e.g. Node.js"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSkill('learnSkills', learnInput, setLearnInput);
                }
              }}
            />
            <button
              type="button"
              onClick={() => addSkill('learnSkills', learnInput, setLearnInput)}
            >
              Add Skill
            </button>
          </div>

          <div className="edit-profile-skill-list">
            {profile.learnSkills.map((skill) => (
              <span className="edit-profile-skill learn" key={skill}>
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill('learnSkills', skill)}
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="edit-profile-card">
          <h2>Availability</h2>
          <p className="edit-profile-description">
            Choose when you are generally available for skill swaps.
          </p>

          <label className="edit-profile-availability">
            Preferred availability
            <select
              name="availability"
              value={profile.availability}
              onChange={updateField}
            >
              <option>Weekdays</option>
              <option>Weekends</option>
              <option>Evenings</option>
              <option>Mornings</option>
              <option>Flexible</option>
            </select>
          </label>
        </section>

        {savedMessage && (
          <p className="edit-profile-success" role="status">
            ✓ {savedMessage}
          </p>
        )}

        <div className="edit-profile-actions">
          <button
            type="button"
            className="edit-profile-cancel"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </button>

          <button type="submit" className="edit-profile-save">
            Save Changes
          </button>
        </div>
      </form>
    </main>
  );
}

export default EditProfile;
