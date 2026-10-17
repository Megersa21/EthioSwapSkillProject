import { useRef, useState } from 'react';
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
  profilePicture: '',
};

function loadProfile() {
  try {
    const saved = localStorage.getItem('swapSkillMyProfile');

    if (!saved) return { ...defaultProfile };

    const parsed = JSON.parse(saved);

    return {
      ...defaultProfile,
      ...parsed,
      teachSkills: Array.isArray(parsed.teachSkills)
        ? parsed.teachSkills
        : defaultProfile.teachSkills,
      learnSkills: Array.isArray(parsed.learnSkills)
        ? parsed.learnSkills
        : defaultProfile.learnSkills,
      profilePicture: parsed.profilePicture || '',
    };
  } catch {
    return { ...defaultProfile };
  }
}

// Resize uploaded images before saving them as browser storage data.
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

        // JPEG reduces the storage size of most photographs.
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(loadProfile);
  const [teachInput, setTeachInput] = useState('');
  const [learnInput, setLearnInput] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [pictureError, setPictureError] = useState('');
  const [isProcessingPicture, setIsProcessingPicture] = useState(false);

  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'U';

  function updateField(event) {
    const { name, value } = event.target;

    setProfile((current) => ({ ...current, [name]: value }));
    setSavedMessage('');
  }

  async function handlePictureChange(event) {
    const file = event.target.files?.[0];

    // Allow choosing the same image again after removing it.
    event.target.value = '';

    if (!file) return;

    setPictureError('');
    setSavedMessage('');

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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function addSkill(field, value, clearInput) {
    const skill = value.trim();

    if (!skill) return;

    setProfile((current) => {
      const existingSkills = Array.isArray(current[field])
        ? current[field]
        : [];

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
  }

  function removeSkill(field, skill) {
    setProfile((current) => ({
      ...current,
      [field]: current[field].filter((item) => item !== skill),
    }));

    setSavedMessage('');
  }

  function saveProfile(event) {
    event.preventDefault();
    setSavedMessage('');

    if (isProcessingPicture) {
      setPictureError('Please wait until your picture finishes processing.');
      return;
    }

    try {
      localStorage.setItem('swapSkillMyProfile', JSON.stringify(profile));
      setSavedMessage('Your profile changes have been saved.');
      setPictureError('');
    } catch {
      setPictureError(
        'Could not save your profile. Try a smaller picture or remove it.',
      );
    }
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
        {/* Profile picture */}
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
              <p>
                JPG, PNG, WebP, or another supported image format. Max 8 MB.
              </p>

              <div className="profile-picture-actions">
                <button
                  type="button"
                  className="profile-picture-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPicture}
                >
                  {isProcessingPicture ? 'Processing...' : 'Upload Picture'}
                </button>

                {profile.profilePicture && (
                  <button
                    type="button"
                    className="profile-picture-remove"
                    onClick={removePicture}
                    disabled={isProcessingPicture}
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

        {/* Personal information */}
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

        {/* Teaching skills */}
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

        {/* Learning skills */}
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

        {/* Availability */}
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

          <button
            type="submit"
            className="edit-profile-save"
            disabled={isProcessingPicture}
          >
            {isProcessingPicture ? 'Processing Picture...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EditProfile;
