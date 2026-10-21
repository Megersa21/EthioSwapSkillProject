import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminSettings.css';

const STORAGE_KEY = 'ethioSwapSkillAdminPreferences';

const defaultSettings = {
  platformName: 'EthioSwapSkill',
  supportEmail: '',
  maintenanceMode: false,
  newUserAlerts: true,
  reportAlerts: true,
  sessionAlerts: false,
};

function readSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? { ...defaultSettings, ...JSON.parse(saved) }
      : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export default function AdminSettings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState(readSettings);
  const [message, setMessage] = useState('');

  function updateField(event) {
    const { name, value, checked, type } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setMessage('');
  }

  function saveSettings(event) {
    event.preventDefault();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setMessage('Preferences saved in this browser successfully.');
    } catch {
      setMessage('Could not save preferences in this browser.');
    }
  }

  function resetSettings() {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    setMessage('Preferences restored to their defaults.');
  }

  return (
    <div className="admin-settings-page">
      <header className="admin-settings-heading">
        <span className="admin-settings-eyebrow">ADMINISTRATION</span>
        <h1>Settings</h1>
        <p>
          Manage your administrative preferences and review platform
          configuration.
        </p>
      </header>

      <form onSubmit={saveSettings}>
        <section className="admin-settings-card">
          <div className="admin-settings-section-heading">
            <span className="admin-settings-icon">♧</span>
            <div>
              <h2>Notification preferences</h2>
              <p>Choose which administrative alerts you want enabled.</p>
            </div>
          </div>

          <label className="admin-settings-toggle">
            <span>
              <strong>New user alerts</strong>
              <small>
                Receive a preference for new user registration alerts.
              </small>
            </span>
            <input
              type="checkbox"
              name="newUserAlerts"
              checked={settings.newUserAlerts}
              onChange={updateField}
            />
          </label>

          <label className="admin-settings-toggle">
            <span>
              <strong>Report alerts</strong>
              <small>Enable report-related alert preferences.</small>
            </span>
            <input
              type="checkbox"
              name="reportAlerts"
              checked={settings.reportAlerts}
              onChange={updateField}
            />
          </label>

          <label className="admin-settings-toggle">
            <span>
              <strong>Session alerts</strong>
              <small>Enable skill-swap session alert preferences.</small>
            </span>
            <input
              type="checkbox"
              name="sessionAlerts"
              checked={settings.sessionAlerts}
              onChange={updateField}
            />
          </label>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-section-heading">
            <span className="admin-settings-icon">🛡</span>
            <div>
              <h2>Security and access</h2>
              <p>Important controls for protecting the admin workspace.</p>
            </div>
          </div>

          <div className="admin-settings-security-note">
            <strong>Administrator access</strong>
            <p>
              Admin permissions must be checked by your backend on every
              protected request. Hiding a page in React is not sufficient
              security.
            </p>
          </div>

          <div className="admin-settings-security-note">
            <strong>Password and account security</strong>
            <p>
              Password changes and session revocation are not enabled on this
              page yet. They need secure backend endpoints.
            </p>
          </div>

          <div className="admin-settings-security-note">
            <strong>Maintenance mode</strong>
            <p>
              A maintenance switch must be enforced by the backend before it can
              actually restrict access to the platform.
            </p>
          </div>
        </section>

        <div className="admin-settings-actions">
          <button
            type="button"
            className="admin-settings-reset"
            onClick={resetSettings}
          >
            Reset preferences
          </button>

          <button type="submit" className="admin-settings-save">
            Save preferences
          </button>
        </div>

        {message && (
          <p className="admin-settings-message" role="status">
            {message}
          </p>
        )}

        <p className="admin-settings-footnote">
          These preferences are saved in this browser only. They are not shared
          with other administrators and do not change server settings.
        </p>
      </form>
    </div>
  );
}
