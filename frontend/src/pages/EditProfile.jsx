import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/EditProfile.css';

const API_URL = 'http://localhost:5000/api/profiles/me';

const emptyProfile = {
  name: '',
  title: '',
  location: '',
  bio: '',
  teachSkills: [],
  learnSkills: [],
  availability: 'Flexible',
  level: 'Beginner',
  profilePicture: '',
};

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function mapApiProfile(data = {}) {
  const asArray = (value) => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return [];
  };

  return {
    name: data.full_name || data.fullName || data.name || '',
    title: data.title || '',
    location: data.location || '',
    bio: data.bio || '',
    teachSkills: asArray(
      data.teach_skills ?? data.teachSkills ?? data.teach_skills_list,
    ),
    learnSkills: asArray(
      data.learn_skills ?? data.learnSkills ?? data.learn_skills_list,
    ),
    availability: data.availability || 'Flexible',
    level:
      data.experience_level || data.experienceLevel || data.level || 'Beginner',
    profilePicture:
      data.profile_image ||
      data.profilePicture ||
      data.profileImage ||
      data.avatar ||
      '',
  };
}

export default function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.message || 'Could not load your profile.');
        }

        const profileData =
          result.data || result.profile || result.user || result;

        const loadedProfile = mapApiProfile(profileData);

        setProfile(loadedProfile);

        localStorage.setItem(
          'swapSkillMyProfile',
          JSON.stringify({
            ...loadedProfile,
            initials: getInitials(loadedProfile.name),
            sessions: 0,
            rating: 'New',
          }),
        );
      } catch (error) {
        if (error.name !== 'AbortError') {
          setErrorMessage(error.message || 'Could not load your profile.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, [navigate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSavedMessage('');
  }

  function handleSkillsChange(event, field) {
    const skills = event.target.value
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    setProfile((previous) => ({
      ...previous,
      [field]: skills,
    }));

    setSavedMessage('');
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Please select an image smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxDimension = 400;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height),
        );

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');

        if (!context) {
          setErrorMessage('Could not process this image.');
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const resizedImage = canvas.toDataURL('image/jpeg', 0.75);

        setProfile((previous) => ({
          ...previous,
          profilePicture: resizedImage,
        }));

        setImageError(false);
        setErrorMessage('');
        setSavedMessage('');
      };

      image.onerror = () => {
        setErrorMessage('Could not read this image. Try another file.');
      };

      image.src = reader.result;
    };

    reader.onerror = () => {
      setErrorMessage('Could not read this image. Try another file.');
    };

    reader.readAsDataURL(file);
  }

  async function saveProfile(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    if (!profile.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const payload = {
      full_name: profile.name.trim(),
      title: profile.title.trim(),
      location: profile.location.trim(),
      bio: profile.bio.trim(),
      profile_image: profile.profilePicture,
      teach_skills: profile.teachSkills,
      learn_skills: profile.learnSkills,
      experience_level: profile.level,
      availability: profile.availability,
    };

    setIsSaving(true);
    setErrorMessage('');
    setSavedMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Could not save your profile.');
      }

      const returnedData =
        result.data || result.profile || result.user || payload;

      const savedProfile = mapApiProfile(returnedData);

      // Some APIs return only part of the updated profile.
      const finalProfile = {
        ...profile,
        ...savedProfile,
        name: savedProfile.name || profile.name,
        profilePicture: savedProfile.profilePicture || profile.profilePicture,
      };

      setProfile(finalProfile);
      setImageError(false);

      localStorage.setItem(
        'swapSkillMyProfile',
        JSON.stringify({
          ...finalProfile,
          initials: getInitials(finalProfile.name),
          sessions: 0,
          rating: 'New',
        }),
      );

      // Notify the Navbar and other components after the save succeeds.
      window.dispatchEvent(new Event('profileUpdated'));

      setSavedMessage('Your profile has been saved successfully.');
    } catch (error) {
      setErrorMessage(
        error.message || 'Could not save your profile. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderPreview() {
    if (profile.profilePicture && !imageError) {
      return (
        <img
          src={profile.profilePicture}
          alt="Profile"
          className="edit-profile-avatar-image"
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <div className="edit-profile-avatar-fallback">
        {getInitials(profile.name) || 'U'}
      </div>
    );
  }

  if (isLoading) {
    return (
      <main className="edit-profile-page">
        <div className="edit-profile-container">
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="edit-profile-page">
      <div className="edit-profile-container">
        <div className="edit-profile-header">
          <div>
            <h1>Edit Profile</h1>
            <p>Update your information and skills.</p>
          </div>

          <Link to="/profile/me" className="edit-profile-back-link">
            View Profile
          </Link>
        </div>

        {errorMessage && (
          <div className="edit-profile-error" role="alert">
            {errorMessage}
          </div>
        )}

        {savedMessage && (
          <div className="edit-profile-success" role="status">
            {savedMessage}
          </div>
        )}

        <form onSubmit={saveProfile} className="edit-profile-form">
          <section className="edit-profile-section">
            <h2>Profile Picture</h2>

            <div className="edit-profile-picture-row">
              <div className="edit-profile-avatar">{renderPreview()}</div>

              <div className="edit-profile-picture-actions">
                <button
                  type="button"
                  className="edit-profile-secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Picture
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />

                {profile.profilePicture && (
                  <button
                    type="button"
                    className="edit-profile-remove-button"
                    onClick={() => {
                      setProfile((previous) => ({
                        ...previous,
                        profilePicture: '',
                      }));
                      setImageError(false);
                      setSavedMessage('');
                    }}
                  >
                    Remove Picture
                  </button>
                )}

                <p>Choose an image smaller than 5 MB.</p>
              </div>
            </div>
          </section>

          <section className="edit-profile-section">
            <h2>Personal Information</h2>

            <div className="edit-profile-grid">
              <label className="edit-profile-field">
                Full Name *
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </label>

              <label className="edit-profile-field">
                Professional Title
                <input
                  type="text"
                  name="title"
                  value={profile.title}
                  onChange={handleChange}
                  placeholder="e.g. Frontend Developer"
                />
              </label>

              <label className="edit-profile-field">
                Location
                <input
                  type="text"
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  placeholder="e.g. Dire Dawa, Ethiopia"
                />
              </label>

              <label className="edit-profile-field">
                Experience Level
                <select
                  name="level"
                  value={profile.level}
                  onChange={handleChange}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </label>

              <label className="edit-profile-field edit-profile-full-width">
                About Me
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  placeholder="Tell other members about yourself..."
                  rows={5}
                />
              </label>
            </div>
          </section>

          <section className="edit-profile-section">
            <h2>Skills and Availability</h2>

            <div className="edit-profile-grid">
              <label className="edit-profile-field">
                Skills I Can Teach
                <input
                  type="text"
                  value={profile.teachSkills.join(', ')}
                  onChange={(event) => handleSkillsChange(event, 'teachSkills')}
                  placeholder="JavaScript, HTML, CSS"
                />
                <small>Separate each skill with a comma.</small>
              </label>

              <label className="edit-profile-field">
                Skills I Want to Learn
                <input
                  type="text"
                  value={profile.learnSkills.join(', ')}
                  onChange={(event) => handleSkillsChange(event, 'learnSkills')}
                  placeholder="React, Python, UI/UX"
                />
                <small>Separate each skill with a comma.</small>
              </label>

              <label className="edit-profile-field">
                Availability
                <select
                  name="availability"
                  value={profile.availability}
                  onChange={handleChange}
                >
                  <option value="Flexible">Flexible</option>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Weekends">Weekends</option>
                  <option value="Evenings">Evenings</option>
                  <option value="Mornings">Mornings</option>
                </select>
              </label>
            </div>
          </section>

          <div className="edit-profile-actions">
            <button
              type="button"
              className="edit-profile-secondary-button"
              onClick={() => navigate('/profile/me')}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="edit-profile-save-button"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
