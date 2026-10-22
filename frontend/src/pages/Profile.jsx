import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles/Profile.css';

const API_BASE = `${
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
}/profiles`;

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'U'
  );
}

function normalizeProfile(data) {
  return {
    id: data.id,
    name: data.full_name || 'Skill Swap Member',
    location: data.location || 'Location not specified',
    initials: getInitials(data.full_name),
    title: data.title || 'Skill Swap Member',
    bio: data.bio || '',
    teachSkills: Array.isArray(data.teach_skills) ? data.teach_skills : [],
    learnSkills: Array.isArray(data.learn_skills) ? data.learn_skills : [],
    level: data.experience_level || 'Beginner',
    availability: data.availability || 'Not specified',
    profilePicture: data.profile_image || '',
    sessions: 0,
    rating: 'New',
  };
}

function readRequests() {
  try {
    const saved = localStorage.getItem('swapSkillRequests');
    const requests = saved ? JSON.parse(saved) : [];
    return Array.isArray(requests) ? requests : [];
  } catch {
    return [];
  }
}

function Profile() {
  const { id } = useParams();
  const isOwnProfile = id === 'me';

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setIsLoading(true);
      setLoadError('');
      setProfile(null);
      setRequestMessage('');

      try {
        let url;
        const headers = {};

        if (isOwnProfile) {
          const token = localStorage.getItem('token');

          if (!token) {
            throw new Error('Please log in to view your profile.');
          }

          url = `${API_BASE}/me`;
          headers.Authorization = `Bearer ${token}`;
        } else {
          if (!/^\d+$/.test(id || '') || Number(id) <= 0) {
            throw new Error('This profile has an invalid user ID.');
          }

          url = `${API_BASE}/${id}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.message || 'Could not load this profile.');
        }

        if (!result.data) {
          throw new Error('No profile information was returned.');
        }

        const loadedProfile = normalizeProfile(result.data);

        setProfile(loadedProfile);

        // Keep the current Edit Profile page's compatibility data.
        if (isOwnProfile) {
          localStorage.setItem(
            'swapSkillMyProfile',
            JSON.stringify({
              ...loadedProfile,
              sessions: 0,
              rating: 'New',
            }),
          );
        }

        if (!isOwnProfile) {
          const alreadySent = readRequests().some(
            (request) =>
              request.direction === 'outgoing' &&
              String(request.partnerId) === String(loadedProfile.id) &&
              !['Cancelled', 'Rejected'].includes(request.status),
          );

          setRequestSent(alreadySent);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Load profile error:', error);
          setLoadError(error.message || 'Unable to load this profile.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, [id, isOwnProfile]);

  function sendRequest() {
    if (!profile) return;

    setRequestMessage('');

    try {
      const existingRequests = readRequests();

      const alreadyExists = existingRequests.some(
        (request) =>
          request.direction === 'outgoing' &&
          String(request.partnerId) === String(profile.id) &&
          !['Cancelled', 'Rejected'].includes(request.status),
      );

      if (alreadyExists) {
        setRequestSent(true);
        setRequestMessage(
          'You already have an active request for this member.',
        );
        return;
      }

      const ownProfile = (() => {
        try {
          const saved = localStorage.getItem('swapSkillMyProfile');
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();

      if (!ownProfile) {
        setRequestMessage(
          'Please open Edit Profile and save your profile before sending a request.',
        );
        return;
      }

      const offeredSkill = ownProfile.teachSkills?.[0];
      const wantedSkill = profile.teachSkills?.[0];

      if (!offeredSkill || !wantedSkill) {
        setRequestMessage(
          'Both members need teaching skills before a skill exchange can be requested.',
        );
        return;
      }

      const newRequest = {
        id: `req-${Date.now()}`,
        direction: 'outgoing',
        partnerId: String(profile.id),
        name: profile.name,
        initials: profile.initials,
        location: profile.location,
        offeredSkill,
        wantedSkill,
        message: `Hi ${profile.name}, I can teach you ${offeredSkill} and would like to learn ${wantedSkill} from you. Would you like to exchange skills?`,
        date: new Date().toLocaleDateString('en-CA'),
        status: 'Pending',
      };

      localStorage.setItem(
        'swapSkillRequests',
        JSON.stringify([newRequest, ...existingRequests]),
      );

      setRequestSent(true);
      setRequestMessage('Your skill-swap request has been created.');
    } catch (error) {
      console.error('Could not save skill-swap request:', error);
      setRequestMessage('Could not save your request. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <main className="profile-page">
        <p>Loading profile...</p>
      </main>
    );
  }

  if (loadError || !profile) {
    return (
      <main className="profile-page">
        <Link
          to={isOwnProfile ? '/dashboard' : '/discover'}
          className="profile-back-link"
        >
          {isOwnProfile ? '← Back to Dashboard' : '← Back to Discover'}
        </Link>

        <section className="profile-card">
          <h2>Unable to load profile</h2>
          <p role="alert">{loadError || 'This profile could not be found.'}</p>
          <button
            type="button"
            className="profile-request-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <Link
        to={isOwnProfile ? '/dashboard' : '/discover'}
        className="profile-back-link"
      >
        {isOwnProfile ? '← Back to Dashboard' : '← Back to Discover'}
      </Link>

      <section className="profile-hero">
        <div className="profile-avatar">
          {profile.profilePicture ? (
            <img
              className="profile-avatar-image"
              src={profile.profilePicture}
              alt={`${profile.name}'s profile`}
            />
          ) : (
            <span>{profile.initials}</span>
          )}
        </div>

        <div className="profile-hero-info">
          <span className="profile-label">
            {isOwnProfile ? 'YOUR PROFILE' : 'SKILL SWAP MEMBER'}
          </span>

          <h1>{profile.name}</h1>
          <p className="profile-title">{profile.title}</p>
          <p className="profile-location">📍 {profile.location}</p>

          <div className="profile-badges">
            <span>{profile.level}</span>
            <span>⭐ {profile.rating} rating</span>
            <span>{profile.sessions} sessions</span>
          </div>
        </div>

        <div className="profile-actions">
          {isOwnProfile ? (
            <Link to="/edit-profile" className="profile-request-button">
              Edit Profile
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={sendRequest}
                disabled={requestSent}
                className="profile-request-button"
              >
                {requestSent ? 'Request Sent ✓' : 'Request Skill Swap'}
              </button>

              <Link to="/messages" className="profile-message-button">
                Message
              </Link>
            </>
          )}
        </div>
      </section>

      {requestMessage && (
        <p className="profile-request-feedback" role="status">
          {requestMessage}
        </p>
      )}

      <div className="profile-grid">
        <section className="profile-card profile-about">
          <h2>About Me</h2>
          <p>{profile.bio || 'No biography added yet.'}</p>

          <div className="profile-detail">
            <span>Availability</span>
            <strong>{profile.availability}</strong>
          </div>
        </section>

        <section className="profile-card">
          <h2>Skills I Can Teach</h2>
          <p className="profile-section-description">
            Skills I can share with the community.
          </p>

          <div className="profile-skills">
            {profile.teachSkills.length > 0 ? (
              profile.teachSkills.map((skill) => (
                <span className="profile-skill teach" key={skill}>
                  {skill}
                </span>
              ))
            ) : (
              <p>No teaching skills added yet.</p>
            )}
          </div>
        </section>

        <section className="profile-card">
          <h2>Skills I Want to Learn</h2>
          <p className="profile-section-description">
            Skills I would like to develop.
          </p>

          <div className="profile-skills">
            {profile.learnSkills.length > 0 ? (
              profile.learnSkills.map((skill) => (
                <span className="profile-skill learn" key={skill}>
                  {skill}
                </span>
              ))
            ) : (
              <p>No learning skills added yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Profile;
