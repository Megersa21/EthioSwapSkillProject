import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/Profile.css';

const sampleProfiles = {
  1: {
    name: 'Dawit Alemu',
    location: 'Addis Ababa, Ethiopia',
    initials: 'DA',
    title: 'Frontend Developer',
    bio: 'I enjoy building modern websites and helping others learn web development. I am looking for partners to exchange technical and creative skills.',
    teachSkills: ['React', 'JavaScript', 'HTML & CSS'],
    learnSkills: ['UI/UX Design', 'Graphic Design'],
    level: 'Intermediate',
    availability: 'Weekends',
    sessions: 12,
    rating: '4.9',
    profilePicture: '',
  },
  2: {
    name: 'Meron Bekele',
    location: 'Dire Dawa, Ethiopia',
    initials: 'MB',
    title: 'Mobile App Developer',
    bio: 'I love developing mobile applications with Flutter. I want to improve my design skills while sharing what I know about mobile development.',
    teachSkills: ['Flutter', 'Dart', 'Mobile Development'],
    learnSkills: ['UI/UX Design', 'React'],
    level: 'Intermediate',
    availability: 'Evenings',
    sessions: 8,
    rating: '4.8',
    profilePicture: '',
  },
  3: {
    name: 'Yonas Tesfaye',
    location: 'Hawassa, Ethiopia',
    initials: 'YT',
    title: 'UI/UX Designer',
    bio: 'I design user-friendly digital experiences and enjoy collaborating with developers. I am interested in learning more about frontend development.',
    teachSkills: ['UI/UX Design', 'Figma', 'Wireframing'],
    learnSkills: ['JavaScript', 'React'],
    level: 'Advanced',
    availability: 'Flexible',
    sessions: 15,
    rating: '5.0',
    profilePicture: '',
  },
};

function readSavedProfile() {
  try {
    const saved = localStorage.getItem('swapSkillMyProfile');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Could not load saved profile:', error);
    return null;
  }
}

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

  const [savedProfile, setSavedProfile] = useState(readSavedProfile);
  const [requestSent, setRequestSent] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    function refreshProfile() {
      setSavedProfile(readSavedProfile());
    }

    window.addEventListener('focus', refreshProfile);
    window.addEventListener('storage', refreshProfile);

    return () => {
      window.removeEventListener('focus', refreshProfile);
      window.removeEventListener('storage', refreshProfile);
    };
  }, []);

  const profile = isOwnProfile
    ? {
        ...(savedProfile || {}),
        name: savedProfile?.name || 'Your Name',
        initials: getInitials(savedProfile?.name),
        title: savedProfile?.title || 'Skill Swap Member',
        location: savedProfile?.location || 'Location not specified',
        bio: savedProfile?.bio || '',
        profilePicture: savedProfile?.profilePicture || '',
        teachSkills: Array.isArray(savedProfile?.teachSkills)
          ? savedProfile.teachSkills
          : [],
        learnSkills: Array.isArray(savedProfile?.learnSkills)
          ? savedProfile.learnSkills
          : [],
        level: savedProfile?.level || 'Beginner',
        availability: savedProfile?.availability || 'Not specified',
        sessions: savedProfile?.sessions ?? 0,
        rating: savedProfile?.rating ?? 'New',
      }
    : sampleProfiles[id] || sampleProfiles[1];

  useEffect(() => {
    if (isOwnProfile) return;

    const alreadySent = readRequests().some(
      (request) =>
        request.direction === 'outgoing' &&
        String(request.partnerId) === String(id) &&
        request.status !== 'Cancelled' &&
        request.status !== 'Rejected',
    );

    setRequestSent(alreadySent);
  }, [id, isOwnProfile]);

  function sendRequest() {
    try {
      const existingRequests = readRequests();

      const alreadyExists = existingRequests.some(
        (request) =>
          request.direction === 'outgoing' &&
          String(request.partnerId) === String(id) &&
          request.status !== 'Cancelled' &&
          request.status !== 'Rejected',
      );

      if (alreadyExists) {
        setRequestSent(true);
        setRequestMessage(
          'You already have an active request for this member.',
        );
        return;
      }

      const ownProfile = readSavedProfile();

      if (!ownProfile) {
        setRequestMessage(
          'Please create your profile before sending a request.',
        );
        return;
      }

      const offeredSkill = ownProfile.teachSkills?.[0];
      const wantedSkill = profile.teachSkills?.[0];

      if (!offeredSkill || !wantedSkill) {
        setRequestMessage(
          'Both you and this member need teaching skills before you can create a skill exchange.',
        );
        return;
      }

      const newRequest = {
        id: `req-${Date.now()}`,
        direction: 'outgoing',
        partnerId: String(id),
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
      console.error('Could not save skill swap request:', error);
      setRequestMessage('Could not save your request. Please try again.');
    }
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
            <strong>{profile.availability || 'Not specified'}</strong>
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
