import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Dashboard.css';

const API_URL = 'http://localhost:5000/api';

async function apiRequest(path) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Please log in to view your dashboard.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Could not load ${path}.`);
  }

  return result;
}

function normalizeSkillNames(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((skill) => typeof skill === 'string' && skill.trim())
    .map((skill) => skill.trim());
}

function mergeSkills(profileSkills, listedSkills, type, level) {
  const combined = [];
  const seen = new Set();

  // First, add skills saved when editing the profile.
  normalizeSkillNames(profileSkills).forEach((name, index) => {
    const key = name.toLowerCase();

    if (seen.has(key)) return;
    seen.add(key);

    combined.push({
      id: `profile-${type}-${index}-${key}`,
      skill_name: name,
      skill_type: type,
      proficiency_level: level || 'Level not specified',
    });
  });

  // Then add skills saved as individual skill listings.
  (Array.isArray(listedSkills) ? listedSkills : [])
    .filter((skill) => skill.skill_type === type)
    .forEach((skill) => {
      const name = String(skill.skill_name || '').trim();
      if (!name) return;

      const key = name.toLowerCase();

      if (seen.has(key)) return;
      seen.add(key);

      combined.push({
        ...skill,
        id: skill.id ?? `listing-${type}-${key}`,
        skill_name: name,
        skill_type: type,
        proficiency_level:
          skill.proficiency_level || level || 'Level not specified',
      });
    });

  return combined;
}

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('Please log in to view your dashboard.');
        }

        const paths = ['/profiles/me', '/skills/my-skills', '/requests'];

        const results = await Promise.allSettled(
          paths.map(async (path) => {
            const response = await fetch(`${API_URL}${path}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: controller.signal,
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(result.message || `Could not load ${path}.`);
            }

            return result;
          }),
        );

        if (controller.signal.aborted) return;

        const profileResult = results[0];
        const skillsResult = results[1];
        const requestsResult = results[2];

        let loadedProfile = null;
        let listedSkills = [];
        let loadedRequests = [];
        const errors = [];

        if (profileResult.status === 'fulfilled') {
          loadedProfile = profileResult.value.data || null;
          setProfile(loadedProfile);
        } else {
          errors.push(profileResult.reason.message);
        }

        if (skillsResult.status === 'fulfilled') {
          listedSkills = skillsResult.value.skills || [];
        } else {
          errors.push(skillsResult.reason.message);
        }

        if (requestsResult.status === 'fulfilled') {
          loadedRequests = requestsResult.value.requests || [];
          setRequests(loadedRequests);
        } else {
          errors.push(requestsResult.reason.message);
        }

        const teachingSkills = mergeSkills(
          loadedProfile?.teach_skills,
          listedSkills,
          'teach',
          loadedProfile?.experience_level,
        );

        const learningSkills = mergeSkills(
          loadedProfile?.learn_skills,
          listedSkills,
          'learn',
          loadedProfile?.experience_level,
        );

        setSkills([...teachingSkills, ...learningSkills]);

        if (errors.length) {
          setError(errors.join(' '));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Could not load your dashboard.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, []);

  const teachingSkills = skills.filter((skill) => skill.skill_type === 'teach');

  const learningSkills = skills.filter((skill) => skill.skill_type === 'learn');

  const pendingRequests = requests.filter(
    (request) => request.status === 'pending',
  );

  const acceptedRequests = requests.filter(
    (request) => request.status === 'accepted',
  );

  const displayName = profile?.full_name || 'Skill Swapper';

  return (
    <>
      <main className="dashboard-page">
        <section className="dashboard-welcome">
          <span className="dashboard-eyebrow">YOUR SKILL JOURNEY</span>
          <h1>Welcome back, {displayName}!</h1>
          <p>
            Manage your skills, connect with learners, and keep your skill
            exchanges moving forward.
          </p>

          <div className="dashboard-actions">
            <Link to="/discover" className="dashboard-primary-button">
              Discover skill partners
            </Link>
            <Link to="/my-skills" className="dashboard-secondary-button">
              Manage my skills
            </Link>
          </div>
        </section>

        {error && (
          <div className="dashboard-alert" role="alert">
            {error}
          </div>
        )}

        <section className="dashboard-stats">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">✦</span>
            <p>Skills I teach</p>
            <strong>{loading ? '—' : teachingSkills.length}</strong>
            <span>Skills you can share</span>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">◎</span>
            <p>Skills I want to learn</p>
            <strong>{loading ? '—' : learningSkills.length}</strong>
            <span>Your learning goals</span>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">⇄</span>
            <p>Pending requests</p>
            <strong>{loading ? '—' : pendingRequests.length}</strong>
            <span>Waiting for a response</span>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">✓</span>
            <p>Accepted requests</p>
            <strong>{loading ? '—' : acceptedRequests.length}</strong>
            <span>Ready to move forward</span>
          </article>
        </section>

        <section className="dashboard-main-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div>
                <h2>My teaching skills</h2>
                <p>Knowledge you can share with others.</p>
              </div>
              <Link to="/my-skills">View all →</Link>
            </div>

            {loading ? (
              <p className="dashboard-muted">Loading your skills...</p>
            ) : teachingSkills.length ? (
              <div className="dashboard-skill-list">
                {teachingSkills.slice(0, 4).map((skill) => (
                  <div className="dashboard-skill-item" key={skill.id}>
                    <span className="dashboard-skill-symbol">✦</span>
                    <div>
                      <h3>{skill.skill_name}</h3>
                      <p>{skill.proficiency_level || 'Level not specified'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <p>You have not added any teaching skills yet.</p>
                <Link to="/my-skills">Add a teaching skill</Link>
              </div>
            )}
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div>
                <h2>Learning goals</h2>
                <p>Skills you would like to learn.</p>
              </div>
              <Link to="/my-skills">Manage →</Link>
            </div>

            {loading ? (
              <p className="dashboard-muted">Loading your goals...</p>
            ) : learningSkills.length ? (
              <div className="dashboard-skill-list">
                {learningSkills.slice(0, 4).map((skill) => (
                  <div className="dashboard-skill-item" key={skill.id}>
                    <span className="dashboard-skill-symbol learning">◎</span>
                    <div>
                      <h3>{skill.skill_name}</h3>
                      <p>{skill.proficiency_level || 'Learning goal'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <p>You have not added any learning goals yet.</p>
                <Link to="/my-skills">Add a learning goal</Link>
              </div>
            )}
          </article>
        </section>

        <section className="dashboard-panel dashboard-requests-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Recent swap requests</h2>
              <p>Keep track of your skill exchange activity.</p>
            </div>
            <Link to="/requests">View requests →</Link>
          </div>

          {loading ? (
            <p className="dashboard-muted">Loading requests...</p>
          ) : requests.length ? (
            <div className="dashboard-request-list">
              {requests.slice(0, 5).map((request) => (
                <div className="dashboard-request-item" key={request.id}>
                  <div className="dashboard-request-icon">⇄</div>
                  <div className="dashboard-request-info">
                    <h3>
                      {request.sender_name ||
                        request.requester_name ||
                        request.receiver_name ||
                        'Skill swap request'}
                    </h3>
                    <p>
                      {request.offered_skill_name || 'Skill exchange'}{' '}
                      {request.wanted_skill_name
                        ? `↔ ${request.wanted_skill_name}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`dashboard-status dashboard-status-${(
                      request.status || 'pending'
                    ).toLowerCase()}`}
                  >
                    {request.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <p>No swap requests yet. Discover people to start an exchange.</p>
              <Link to="/discover">Find a skill partner</Link>
            </div>
          )}
        </section>

        <section className="dashboard-next-step">
          <div>
            <span>READY FOR YOUR NEXT EXCHANGE?</span>
            <h2>Your next skill starts with a connection.</h2>
            <p>Find someone to learn from and share what you know.</p>
          </div>
          <Link to="/discover">Explore skills →</Link>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Dashboard;
