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

function getToken() {
  return localStorage.getItem('token');
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

function normalizeSkills(skills) {
  return Array.isArray(skills)
    ? skills.filter((skill) => typeof skill === 'string')
    : [];
}

function mapApiProfile(data) {
  return {
    name: data.full_name || '',
    title: data.title || '',
    location: data.location || '',
    bio: data.bio || '',
    teachSkills: normalizeSkills(data.teach_skills),
    learnSkills: normalizeSkills(data.learn_skills),
    availability: data.availability || 'Flexible',
    level: data.experience_level || 'Beginner',
    profilePicture: data.profile_image || '',
  };
}

function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(emptyProfile);
  const [teachInput, setTeachInput] = useState('');
  const [learnInput, setLearnInput] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [pictureError, setPictureError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPicture, setIsProcessingPicture] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      const token = getToken();

      if (!token) {
        setApiError('Your login session was not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      try {
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

        if (result.data) {
          const loadedProfile = mapApiProfile(result.data);

          setProfile(loadedProfile);

          // Keep the existing Profile.jsx compatible with the saved data.
          localStorage.setItem(
            'swapSkillMyProfile',
            JSON.stringify({
              ...loadedProfile,
              initials: getInitials(loadedProfile.name),
              sessions: 0,
              rating: 'New',
            }),
          );
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Load profile error:', error);
          setApiError(
            error.message ||
              'Unable to connect to the server. Check that your backend is running.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, []);

  const initials = getInitials(profile.name);

  function updateField(event) {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setSavedMessage('');
    setApiError('');
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Could not read this image.'));

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => reject(new Error('Please select a valid image.'));

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
            reject(new Error('Image processing is not supported.'));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function handlePictureChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setPictureError('');
    setSavedMessage('');
    setApiError('');

    if (!file.type.startsWith('image/')) {
      setPictureError('Please select an image file.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPictureError('Please choose an image smaller than 8 MB.');
      return;
    }

    setIsProcessingPicture(true);

    try {
      const resizedPicture = await resizeImage(file);

      setProfile((current) => ({
        ...current,
        profilePicture: resizedPicture,
      }));
    } catch (error) {
      setPictureError(error.message || 'Unable to process this image.');
    } finally {
      setIsProcessingPicture(false);
    }
  }

  function removePicture() {
    setProfile((current) => ({
      ...current,
      profilePicture: '',
    }));

    setPictureError('');
    setSavedMessage('');
    setApiError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function addSkill(field, value, clearInput) {
    const skill = value.trim();

    if (!skill) return;

    setProfile((current) => {
      const existingSkills = current[field];

      if (
        existingSkills.some(
          (item) => item.toLowerCase() === skill.toLowerCase(),
        )
      ) {
        return current;
      }

      return {
        ...current,
        [field]: [...existingSkills, skill],
      };
    });

    clearInput('');
    setSavedMessage('');
    setApiError('');
  }

  function removeSkill(field, skill) {
    setProfile((current) => ({
      ...current,
      [field]: current[field].filter((item) => item !== skill),
    }));

    setSavedMessage('');
    setApiError('');
  }

  async function saveProfile(event) {
    event.preventDefault();

    setSavedMessage('');
    setApiError('');
    setPictureError('');

    if (isProcessingPicture) {
      setPictureError('Please wait until your picture finishes processing.');
      return;
    }

    if (!profile.name.trim()) {
      setApiError('Please enter your full name.');
      return;
    }

    const token = getToken();

    if (!token) {
      setApiError('Your login session was not found. Please log in again.');
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

      const savedProfile = mapApiProfile(result.data || payload);

      setProfile(savedProfile);

      // Maintain compatibility with the current own-profile page.
      localStorage.setItem(
        'swapSkillMyProfile',
        JSON.stringify({
          ...savedProfile,
          initials: getInitials(savedProfile.name),
          sessions: 0,
          rating: 'New',
        }),
      );

      setSavedMessage('Your profile has been saved successfully.');
    } catch (error) {
      console.error('Save profile error:', error);

      setApiError(
        error.message ||
          'Unable to connect to the server. Check that your backend is running.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="edit-profile-page">
        <div className="edit-profile-heading">
          <div>
            <p className="edit-profile-eyebrow">YOUR ACCOUNT</p>
            <h1>Edit Profile</h1>
            <p>Loading your profile...</p>
          </div>
        </div>
      </main>
    );
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

      {apiError && (
        <p className="edit-profile-error" role="alert">
          {apiError}
        </p>
      )}

      <form className="edit-profile-form" onSubmit={saveProfile}>
        <section className="edit-profile-card">
          <h2>Profile Picture</h2>
          <p className="edit-profile-description">
            Add a photo so other members can recognize you. This is optional.
          </p>

          <div className="profile-picture-editor">
            <div className="profile-picture-preview">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="Your profile preview" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="profile-picture-controls">
              <strong>{profile.name || 'Your profile'}</strong>
              <p>Choose an image smaller than 8 MB.</p>

              <div className="profile-picture-actions">
                <button
                  type="button"
                  className="profile-picture-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPicture || isSaving}
                >
                  {isProcessingPicture ? 'Processing...' : 'Upload Picture'}
                </button>

                {profile.profilePicture && (
                  <button
                    type="button"
                    className="profile-picture-remove"
                    onClick={removePicture}
                    disabled={isProcessingPicture || isSaving}
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePictureChange}
                hidden
              />

              {pictureError && (
                <p className="profile-picture-error" role="alert">
                  {pictureError}
                </p>
              )}
            </div>
          </div>
        </section>

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
                maxLength={150}
              />
            </label>

            <label>
              Professional title
              <input
                name="title"
                value={profile.title}
                onChange={updateField}
                placeholder="e.g. Frontend Developer"
                maxLength={150}
              />
            </label>

            <label>
              Location
              <input
                name="location"
                value={profile.location}
                onChange={updateField}
                placeholder="City, country"
                maxLength={150}
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
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="edit-profile-save"
            disabled={isProcessingPicture || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EditProfile;
