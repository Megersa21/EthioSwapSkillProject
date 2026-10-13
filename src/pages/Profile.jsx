import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
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
  },
};

function Profile() {
  const { id } = useParams();
  const profile = sampleProfiles[id] || sampleProfiles[1];
  const [requestSent, setRequestSent] = useState(false);

  function sendRequest() {
    const existingRequests = JSON.parse(
      localStorage.getItem('swapSkillRequests') || '[]',
    );

    const newRequest = {
      id: Date.now(),
      partner: profile.name,
      partnerId: id,
      teachSkill: profile.learnSkills[0] || 'Skill exchange',
      learnSkill: profile.teachSkills[0] || 'Skill exchange',
      status: 'Pending',
      direction: 'sent',
    };

    localStorage.setItem(
      'swapSkillRequests',
      JSON.stringify([...existingRequests, newRequest]),
    );

    setRequestSent(true);
  }

  return (
    <main className="profile-page">
      <Link to="/discover" className="profile-back-link">
        ← Back to Discover
      </Link>

      <section className="profile-hero">
        <div className="profile-avatar">{profile.initials}</div>

        <div className="profile-hero-info">
          <span className="profile-label">SKILL SWAP MEMBER</span>
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
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-card profile-about">
          <h2>About Me</h2>
          <p>{profile.bio}</p>

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
            {profile.teachSkills.map((skill) => (
              <span className="profile-skill teach" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className="profile-card">
          <h2>Skills I Want to Learn</h2>
          <p className="profile-section-description">
            Skills I would like to develop.
          </p>

          <div className="profile-skills">
            {profile.learnSkills.map((skill) => (
              <span className="profile-skill learn" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Profile;
