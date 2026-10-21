import { useCallback, useEffect, useState } from 'react';
import '../styles/mySkill.css';

const API_URL = 'http://localhost:5000/api';

const emptyForm = {
  skill_name: '',
  description: '',
  skill_type: 'teach',
  proficiency_level: 'Beginner',
};

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Please log in to manage your skills.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.');
  }

  return data;
}

// Normalize a skill name so "JavaScript" and "javascript"
// are treated as the same skill.
function normalizeSkillName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

// Load profile skills and database skill listings together.
// Database records take priority because they have real IDs.
function combineSkills(profile, databaseSkills) {
  const combined = [];
  const seen = new Set();

  const addSkill = (skill) => {
    const name = normalizeSkillName(skill.skill_name);
    const type = skill.skill_type;

    if (!name || !['teach', 'learn'].includes(type)) {
      return;
    }

    const key = `${type}:${name}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    combined.push(skill);
  };

  // Database skills are added first so their real IDs are preserved.
  databaseSkills.forEach((skill) => {
    addSkill({
      ...skill,
      isDatabaseSkill: true,
    });
  });

  // Add skills saved in the user's profile that aren't already listed.
  const profileSkillTypes = [
    {
      field: 'teach_skills',
      type: 'teach',
    },
    {
      field: 'learn_skills',
      type: 'learn',
    },
  ];

  profileSkillTypes.forEach(({ field, type }) => {
    const names = Array.isArray(profile?.[field]) ? profile[field] : [];

    names.forEach((name, index) => {
      if (typeof name !== 'string' || !name.trim()) {
        return;
      }

      const normalizedName = normalizeSkillName(name);
      const key = `${type}:${normalizedName}`;

      if (seen.has(key)) {
        return;
      }

      addSkill({
        id: `profile-${type}-${index}-${normalizedName}`,
        skill_name: name.trim(),
        skill_type: type,
        description: '',
        proficiency_level:
          type === 'teach' ? profile?.experience_level || null : null,
        isDatabaseSkill: false,
      });
    });
  });

  return combined;
}

export default function MySkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingSkill, setEditingSkill] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // One endpoint returns database skill records; the other
      // returns teach_skills and learn_skills stored in the profile.
      const [skillsResult, profileResult] = await Promise.allSettled([
        apiRequest('/skills/my-skills'),
        apiRequest('/profiles/me'),
      ]);

      const databaseSkills =
        skillsResult.status === 'fulfilled' &&
        Array.isArray(skillsResult.value.skills)
          ? skillsResult.value.skills
          : [];

      const profile =
        profileResult.status === 'fulfilled'
          ? profileResult.value.data || {}
          : null;

      setSkills(combineSkills(profile, databaseSkills));

      if (skillsResult.status === 'rejected') {
        setError(
          skillsResult.reason?.message ||
            'Could not load database skill listings.',
        );
      } else if (profileResult.status === 'rejected') {
        setError(
          `Your saved skill listings loaded, but profile skills could not be loaded: ${
            profileResult.reason?.message || 'Please try again.'
          }`,
        );
      }
    } catch (err) {
      setError(err.message || 'Could not load your skills.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const teachSkills = skills.filter((skill) => skill.skill_type === 'teach');

  const learnSkills = skills.filter((skill) => skill.skill_type === 'learn');

  const visibleSkills =
    filter === 'teach'
      ? teachSkills
      : filter === 'learn'
        ? learnSkills
        : skills;

  const startEditing = (skill) => {
    if (!skill.isDatabaseSkill) {
      setError(
        'This skill is saved only in your profile. Add it through the Add Skill page to manage it here.',
      );
      return;
    }

    setEditingSkill(skill);
    setForm({
      skill_name: skill.skill_name || '',
      description: skill.description || '',
      skill_type: skill.skill_type || 'teach',
      proficiency_level: skill.proficiency_level || 'Beginner',
    });
    setError('');
    setSuccess('');
  };

  const cancelEditing = () => {
    setEditingSkill(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!editingSkill || !editingSkill.isDatabaseSkill) {
      return;
    }

    if (!form.skill_name.trim()) {
      setError('Please enter a skill name.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        skill_name: form.skill_name.trim(),
        description: form.description.trim(),
        skill_type: form.skill_type,
        proficiency_level:
          form.skill_type === 'teach' ? form.proficiency_level : null,
      };

      const data = await apiRequest(`/skills/${editingSkill.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (data.skill) {
        setSkills((current) => {
          const updatedSkills = current.map((skill) =>
            skill.isDatabaseSkill &&
            String(skill.id) === String(editingSkill.id)
              ? { ...data.skill, isDatabaseSkill: true }
              : skill,
          );

          // Recombine using the profile source to avoid duplicate
          // skill names after editing a database skill.
          return updatedSkills;
        });
      } else {
        await loadSkills();
      }

      setEditingSkill(null);
      setForm(emptyForm);
      setSuccess('Your skill has been updated successfully.');
    } catch (err) {
      setError(err.message || 'Could not update this skill.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skill) => {
    if (!skill.isDatabaseSkill) {
      setError(
        'This skill is saved only in your profile and cannot be deleted through the skill listings.',
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${skill.skill_name}"?`,
    );

    if (!confirmed) return;

    setDeletingId(skill.id);
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/skills/${skill.id}`, {
        method: 'DELETE',
      });

      setSkills((current) =>
        current.filter(
          (item) =>
            !(item.isDatabaseSkill && String(item.id) === String(skill.id)),
        ),
      );

      if (editingSkill && String(editingSkill.id) === String(skill.id)) {
        cancelEditing();
      }

      setSuccess('Skill listing deleted successfully.');
    } catch (err) {
      setError(err.message || 'Could not delete this skill.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="my-skills-page">
      <header className="my-skills-header">
        <div>
          <span className="my-skills-eyebrow">YOUR SKILL PROFILE</span>
          <h1>My Skills</h1>
          <p>
            Manage the skills you can teach and the skills you want to learn
            from other members.
          </p>
        </div>

        <button
          type="button"
          className="my-skills-refresh"
          onClick={loadSkills}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <section className="my-skills-stats">
        <article className="my-skills-stat">
          <span>Total skills</span>
          <strong>{skills.length}</strong>
        </article>

        <article className="my-skills-stat">
          <span>Can teach</span>
          <strong>{teachSkills.length}</strong>
        </article>

        <article className="my-skills-stat">
          <span>Want to learn</span>
          <strong>{learnSkills.length}</strong>
        </article>
      </section>

      {error && (
        <div className="my-skills-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="my-skills-alert success" role="status">
          {success}
        </div>
      )}

      <nav className="my-skills-filters" aria-label="Filter skills">
        {[
          { value: 'all', label: 'All skills' },
          { value: 'teach', label: 'Can teach' },
          { value: 'learn', label: 'Want to learn' },
        ].map((item) => (
          <button
            type="button"
            key={item.value}
            className={filter === item.value ? 'active' : ''}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="my-skills-empty">Loading your saved skills...</div>
      ) : visibleSkills.length === 0 ? (
        <div className="my-skills-empty">
          <div className="my-skills-empty-icon">✦</div>
          <h2>No skills found</h2>
          <p>
            {filter === 'teach'
              ? 'You have not added any teaching skills yet.'
              : filter === 'learn'
                ? 'You have not added any learning skills yet.'
                : 'Add skills using the Add Skill page to build your profile.'}
          </p>
        </div>
      ) : (
        <section className="my-skills-grid">
          {visibleSkills.map((skill) => (
            <article
              className="my-skill-card"
              key={`${skill.isDatabaseSkill ? 'database' : 'profile'}-${skill.id}`}
            >
              <div className="my-skill-card-top">
                <span
                  className={`my-skill-type ${
                    skill.skill_type === 'teach' ? 'teach' : 'learn'
                  }`}
                >
                  {skill.skill_type === 'teach'
                    ? 'CAN TEACH'
                    : 'WANTS TO LEARN'}
                </span>

                <span className="my-skill-level">
                  {skill.proficiency_level || 'Not specified'}
                </span>
              </div>

              <h2>{skill.skill_name}</h2>

              <p className="my-skill-description">
                {skill.description || 'No description added yet.'}
              </p>

              {!skill.isDatabaseSkill && (
                <p className="my-skill-description">
                  Saved in your profile. Add this skill through the Add Skill
                  page if you want to edit or delete its listing here.
                </p>
              )}

              <div className="my-skill-actions">
                <button
                  type="button"
                  className="my-skill-edit"
                  onClick={() => startEditing(skill)}
                  disabled={!skill.isDatabaseSkill}
                  title={
                    skill.isDatabaseSkill
                      ? 'Edit skill'
                      : 'This skill is stored only in your profile'
                  }
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="my-skill-delete"
                  onClick={() => handleDelete(skill)}
                  disabled={deletingId !== null || !skill.isDatabaseSkill}
                  title={
                    skill.isDatabaseSkill
                      ? 'Delete skill listing'
                      : 'This skill is stored only in your profile'
                  }
                >
                  {String(deletingId) === String(skill.id)
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {editingSkill && (
        <div className="my-skills-modal-backdrop">
          <section
            className="my-skills-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-skill-title"
          >
            <div className="my-skills-modal-header">
              <div>
                <span className="my-skills-eyebrow">EDIT YOUR PROFILE</span>
                <h2 id="edit-skill-title">Edit skill</h2>
              </div>

              <button
                type="button"
                className="my-skills-close"
                onClick={cancelEditing}
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <label htmlFor="skill_name">Skill name</label>
              <input
                id="skill_name"
                name="skill_name"
                value={form.skill_name}
                onChange={handleChange}
                required
                maxLength={100}
              />

              <label htmlFor="skill_type">Skill type</label>
              <select
                id="skill_type"
                name="skill_type"
                value={form.skill_type}
                onChange={handleChange}
              >
                <option value="teach">I can teach</option>
                <option value="learn">I want to learn</option>
              </select>

              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                maxLength={1000}
                placeholder="Describe this skill..."
              />

              {form.skill_type === 'teach' && (
                <>
                  <label htmlFor="proficiency_level">Proficiency level</label>
                  <select
                    id="proficiency_level"
                    name="proficiency_level"
                    value={form.proficiency_level}
                    onChange={handleChange}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </>
              )}

              <div className="my-skills-modal-actions">
                <button
                  type="button"
                  className="my-skills-cancel"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="my-skills-save"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
