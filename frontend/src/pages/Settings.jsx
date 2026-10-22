import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Settings.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const defaultSettings = {
  messageNotifications: true,
  requestNotifications: true,
  sessionNotifications: true,
  reviewNotifications: true,
  darkMode: false,
};

function mapApiSettings(settings) {
  return {
    messageNotifications: settings.message_notifications,
    requestNotifications: settings.request_notifications,
    sessionNotifications: settings.session_notifications,
    reviewNotifications: settings.review_notifications,
    darkMode: settings.dark_mode,
  };
}

function mapSettingsForApi(settings) {
  return {
    message_notifications: settings.messageNotifications,
    request_notifications: settings.requestNotifications,
    session_notifications: settings.sessionNotifications,
    review_notifications: settings.reviewNotifications,
    dark_mode: settings.darkMode,
  };
}

function SettingToggle({ title, description, checked, onChange }) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <label className="settings-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span />
      </label>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  maxLength,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="settings-password-field">
      <span>{label}</span>

      <div className="settings-password-input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          required
        />

        <button
          type="button"
          className="settings-password-visibility"
          onClick={() => setVisible((previous) => !previous)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
              <path d="M9.9 5.2A10.8 10.8 0 0121 12a11.7 11.7 0 01-3.2 4.2M6.2 6.2A12 12 0 003 12s3.3 7 9 7a9.6 9.6 0 004-.9" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.3-7 9.5-7 9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}

export default function Settings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const token = localStorage.getItem('token');

      if (!token) {
        if (active) {
          setError('Please log in to view your settings.');
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Could not load your settings.');
        }

        if (active && data.settings) {
          setSettings({
            ...defaultSettings,
            ...mapApiSettings(data.settings),
          });
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not connect to the server.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode
      ? 'dark'
      : 'light';
  }, [settings.darkMode]);

  function updateSetting(key, value) {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setSuccess('');
    setError('');
  }

  async function saveSettings() {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Your login session is missing. Please log in again.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mapSettingsForApi(settings)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not save your settings.');
      }

      if (data.settings) {
        setSettings({
          ...defaultSettings,
          ...mapApiSettings(data.settings),
        });
      }

      setSuccess('Your settings have been saved successfully.');
    } catch (err) {
      setError(err.message || 'Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Please log in again before resetting your settings.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mapSettingsForApi(defaultSettings)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not reset your settings.');
      }

      setSettings(
        data.settings
          ? { ...defaultSettings, ...mapApiSettings(data.settings) }
          : defaultSettings,
      );

      setSuccess('Your settings have been reset to their defaults.');
    } catch (err) {
      setError(err.message || 'Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  }

  function updatePasswordField(field, value) {
    setPasswordForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setPasswordError('');
    setPasswordSuccess('');
  }

  async function changePassword(event) {
    event.preventDefault();

    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Your new password must contain at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword.length > 72) {
      setPasswordError('Your new password cannot exceed 72 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError(
        'Your new password must be different from your current password.',
      );
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      setPasswordError('Your session has expired. Please log in again.');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not change your password.');
      }

      setPasswordSuccess(
        'Password changed successfully. Redirecting you to login...',
      );

      localStorage.removeItem('token');

      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (err) {
      setPasswordError(err.message || 'Could not connect to the server.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <main className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <span className="settings-eyebrow">YOUR ACCOUNT</span>
          <h1>Settings</h1>
          <p>Manage your notifications and personalize your experience.</p>
        </header>

        {loading ? (
          <section className="settings-card">
            <p>Loading your settings...</p>
          </section>
        ) : (
          <>
            <section className="settings-card">
              <div className="settings-section-heading">
                <div>
                  <h2>Notifications</h2>
                  <p>Choose which updates you want to receive.</p>
                </div>
              </div>

              <SettingToggle
                title="Message notifications"
                description="Get notified when someone sends you a message."
                checked={settings.messageNotifications}
                onChange={(value) =>
                  updateSetting('messageNotifications', value)
                }
              />

              <SettingToggle
                title="Skill swap requests"
                description="Receive updates about new and changed swap requests."
                checked={settings.requestNotifications}
                onChange={(value) =>
                  updateSetting('requestNotifications', value)
                }
              />

              <SettingToggle
                title="Session notifications"
                description="Get updates about scheduled and upcoming sessions."
                checked={settings.sessionNotifications}
                onChange={(value) =>
                  updateSetting('sessionNotifications', value)
                }
              />

              <SettingToggle
                title="Review notifications"
                description="Get notified about reviews and feedback."
                checked={settings.reviewNotifications}
                onChange={(value) =>
                  updateSetting('reviewNotifications', value)
                }
              />
            </section>

            <section className="settings-card">
              <div className="settings-section-heading">
                <div>
                  <h2>Appearance</h2>
                  <p>Personalize how EthioSwapSkill looks.</p>
                </div>
              </div>

              <SettingToggle
                title="Dark mode"
                description="Use the dark appearance where supported."
                checked={settings.darkMode}
                onChange={(value) => updateSetting('darkMode', value)}
              />
            </section>

            <section className="settings-card">
              <div className="settings-section-heading">
                <div>
                  <h2>Account and security</h2>
                  <p>Manage your profile and protect your account.</p>
                </div>
              </div>

              <div className="settings-security-row">
                <div>
                  <h3>Edit your profile</h3>
                  <p>Update your personal and profile information.</p>
                </div>

                <button
                  type="button"
                  className="settings-secondary-button"
                  onClick={() => navigate('/edit-profile')}
                >
                  Edit profile
                </button>
              </div>

              <div className="settings-security-row">
                <div>
                  <h3>Need help?</h3>
                  <p>Find help with using EthioSwapSkill.</p>
                </div>

                <button
                  type="button"
                  className="settings-secondary-button"
                  onClick={() => navigate('/help')}
                >
                  Get help
                </button>
              </div>
            </section>

            <section className="settings-card">
              <div className="settings-section-heading">
                <div>
                  <h2>Change password</h2>
                  <p>
                    Enter your current password and choose a new one to secure
                    your account.
                  </p>
                </div>
              </div>

              <form
                className="settings-password-form"
                onSubmit={changePassword}
              >
                <PasswordField
                  label="Current password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    updatePasswordField('currentPassword', event.target.value)
                  }
                />

                <PasswordField
                  label="New password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    updatePasswordField('newPassword', event.target.value)
                  }
                />

                <PasswordField
                  label="Confirm new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    updatePasswordField('confirmPassword', event.target.value)
                  }
                />

                {passwordError && (
                  <p className="settings-error" role="alert">
                    {passwordError}
                  </p>
                )}

                {passwordSuccess && (
                  <p className="settings-success" role="status">
                    {passwordSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  className="settings-save-button"
                  disabled={changingPassword}
                >
                  {changingPassword
                    ? 'Changing password...'
                    : 'Update password'}
                </button>
              </form>
            </section>

            {error && (
              <p className="settings-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="settings-success" role="status">
                {success}
              </p>
            )}

            <div className="settings-actions">
              <button
                type="button"
                className="settings-save-button"
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>

              <button
                type="button"
                className="settings-reset-button"
                onClick={resetSettings}
                disabled={saving}
              >
                Reset to defaults
              </button>
            </div>

            <p className="settings-note">
              Your preferences are saved to your account and can be loaded when
              you sign in again.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
