import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/PreJionSession.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function getUserId(user) {
  const id = user.id ?? user.userId ?? user.user_id;
  return id == null ? '' : String(id);
}

function formatSessionTime(session) {
  if (!session?.scheduled_at) {
    return 'Scheduled session';
  }

  const start = new Date(session.scheduled_at);

  if (Number.isNaN(start.getTime())) {
    return 'Scheduled session';
  }

  const duration = Number(session.duration_minutes) || 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const date = start.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const startTime = start.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const endTime = end.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${date} · ${startTime} – ${endTime}`;
}

function PreJoinSession() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraId, setCameraId] = useState('');
  const [micId, setMicId] = useState('');
  const [speakerId, setSpeakerId] = useState('');

  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [speakers, setSpeakers] = useState([]);

  const [cameraStatus, setCameraStatus] = useState('Checking camera...');
  const [micStatus, setMicStatus] = useState('Checking microphone...');
  const [connectionStatus, setConnectionStatus] = useState(
    'Checking connection...',
  );

  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const [session, setSession] = useState(null);
  const [partnerName, setPartnerName] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  // Load the actual session and identify its other participant.
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setSessionLoading(true);
      setSessionError('');

      try {
        if (!sessionId) {
          throw new Error('Session ID is missing. Return to your sessions.');
        }

        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('Please log in to view this session.');
        }

        const response = await fetch(`${API_URL}/sessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || result.error || 'Could not load your session.',
          );
        }

        const sessions = Array.isArray(result)
          ? result
          : result.sessions || result.data?.sessions || [];

        const found = sessions.find(
          (item) => String(item.id) === String(sessionId),
        );

        if (!found) {
          throw new Error(
            'This session was not found in your account. Return to Sessions and open one of your scheduled sessions.',
          );
        }

        const user = getStoredUser();
        const localId = getUserId(user);

        const requesterId =
          found.requester_id ?? found.requesterId ?? found.requester?.id;

        const recipientId =
          found.recipient_id ?? found.recipientId ?? found.recipient?.id;

        let name = '';

        if (localId && requesterId != null && String(requesterId) === localId) {
          name =
            found.recipient_name ||
            found.recipientName ||
            found.recipient?.name ||
            '';
        } else if (
          localId &&
          recipientId != null &&
          String(recipientId) === localId
        ) {
          name =
            found.requester_name ||
            found.requesterName ||
            found.requester?.name ||
            '';
        }

        // Some API responses provide the partner directly.
        if (!name) {
          name =
            found.partner_name ||
            found.partnerName ||
            found.partner?.name ||
            '';
        }

        if (!cancelled) {
          setSession(found);
          setPartnerName(name);
        }
      } catch (err) {
        if (!cancelled) {
          setSessionError(err.message || 'Could not load session details.');
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function startMedia(
    selectedCamera = cameraId,
    selectedMic = micId,
    enableCamera = cameraOn,
    enableMic = micOn,
  ) {
    try {
      setError('');

      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: enableCamera
          ? selectedCamera
            ? { deviceId: { exact: selectedCamera } }
            : true
          : false,
        audio: enableMic
          ? selectedMic
            ? { deviceId: { exact: selectedMic } }
            : true
          : false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setCameraStatus(enableCamera ? 'Camera detected' : 'Camera is off');
      setMicStatus(enableMic ? 'Microphone working' : 'Microphone is muted');
      setConnectionStatus('Media devices connected');

      const devices = await navigator.mediaDevices.enumerateDevices();

      const availableCameras = devices.filter(
        (device) => device.kind === 'videoinput',
      );
      const availableMics = devices.filter(
        (device) => device.kind === 'audioinput',
      );
      const availableSpeakers = devices.filter(
        (device) => device.kind === 'audiooutput',
      );

      setCameras(availableCameras);
      setMicrophones(availableMics);
      setSpeakers(availableSpeakers);

      if (!selectedCamera && availableCameras.length) {
        setCameraId(availableCameras[0].deviceId);
      }

      if (!selectedMic && availableMics.length) {
        setMicId(availableMics[0].deviceId);
      }

      if (!speakerId && availableSpeakers.length) {
        setSpeakerId(availableSpeakers[0].deviceId);
      }
    } catch (err) {
      console.error('Media setup failed:', err);

      setError(
        'Could not access your camera or microphone. Check your browser permissions and device connections.',
      );

      setCameraStatus('Camera unavailable');
      setMicStatus('Microphone unavailable');
      setConnectionStatus('Check device permissions');
    }
  }

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera and microphone access requires HTTPS or localhost.');
      setCameraStatus('Not supported');
      setMicStatus('Not supported');
      setConnectionStatus('Unavailable');
      return undefined;
    }

    startMedia();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // Initialize the device preview when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleCamera() {
    const next = !cameraOn;
    setCameraOn(next);

    await startMedia(cameraId, micId, next, micOn);
  }

  async function toggleMic() {
    const next = !micOn;
    setMicOn(next);

    await startMedia(cameraId, micId, cameraOn, next);
  }

  async function changeCamera(event) {
    const id = event.target.value;
    setCameraId(id);
    await startMedia(id, micId);
  }

  async function changeMicrophone(event) {
    const id = event.target.value;
    setMicId(id);
    await startMedia(cameraId, id);
  }

  function joinSession() {
    if (!sessionId) {
      setError('Session ID is missing. Return to your sessions.');
      return;
    }

    if (sessionLoading || !session) {
      setError('Please wait until the session details finish loading.');
      return;
    }

    if (sessionError) {
      setError(sessionError);
      return;
    }

    setJoining(true);
    setError('');

    navigate(`/sessions/${sessionId}/live`);
  }

  const initials = partnerName
    ? partnerName
        .trim()
        .split(/\s+/)
        .map((part) => part[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const teachSkill =
    session?.offered_skill_name ||
    session?.offeredSkillName ||
    session?.teach_skill ||
    '';

  const learnSkill =
    session?.wanted_skill_name ||
    session?.wantedSkillName ||
    session?.learn_skill ||
    '';

  const sessionTitle =
    teachSkill && learnSkill
      ? `${teachSkill} ⇄ ${learnSkill}`
      : session?.title || 'Skill-swap session';

  return (
    <main className="prejoin-page">
      <button
        type="button"
        className="prejoin-back"
        onClick={() => navigate('/sessions')}
      >
        ← Back to sessions
      </button>

      <div className="prejoin-layout">
        <section className="prejoin-preview-column">
          <div className="prejoin-video">
            <span className="prejoin-preview-label">
              {cameraOn ? 'Your camera preview' : 'Camera is turned off'}
            </span>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={
                cameraOn ? 'prejoin-live-video' : 'prejoin-hidden-video'
              }
            />

            {!cameraOn && <div className="prejoin-initials">YOU</div>}

            <div className="prejoin-video-controls">
              <button
                type="button"
                className={!micOn ? 'device-off' : ''}
                onClick={toggleMic}
                aria-label={micOn ? 'Mute microphone' : 'Turn microphone on'}
                title={micOn ? 'Mute microphone' : 'Turn microphone on'}
              >
                {micOn ? '🎙' : '🔇'}
              </button>

              <button
                type="button"
                className={!cameraOn ? 'device-off' : ''}
                onClick={toggleCamera}
                aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {cameraOn ? '▣' : '□'}
              </button>
            </div>
          </div>

          <div className="prejoin-status-grid">
            <div className="prejoin-status-item">
              <span>✓</span>
              <p>{cameraStatus}</p>
            </div>
            <div className="prejoin-status-item">
              <span>✓</span>
              <p>{micStatus}</p>
            </div>
            <div className="prejoin-status-item full-width">
              <span>✓</span>
              <p>{connectionStatus}</p>
            </div>
          </div>
        </section>

        <aside className="prejoin-settings-card">
          <h1>Ready to join?</h1>

          <p className="prejoin-time">
            {sessionLoading
              ? 'Loading scheduled session...'
              : sessionError
                ? 'Session details unavailable'
                : formatSessionTime(session)}
          </p>

          <div className="prejoin-partner">
            <div className="prejoin-partner-avatar">{initials}</div>
            <div>
              <h2>{sessionTitle}</h2>
              <p>
                {sessionLoading
                  ? 'Loading your swap partner...'
                  : sessionError
                    ? 'Partner details unavailable'
                    : partnerName
                      ? `${partnerName} · Your swap partner`
                      : 'Your scheduled swap partner'}
              </p>
            </div>
          </div>

          {sessionError && (
            <p className="prejoin-message" role="alert">
              {sessionError}
            </p>
          )}

          <label className="prejoin-label" htmlFor="prejoin-camera">
            Camera
          </label>
          <select id="prejoin-camera" value={cameraId} onChange={changeCamera}>
            {cameras.length === 0 && (
              <option value="">No camera detected</option>
            )}
            {cameras.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>

          <label className="prejoin-label" htmlFor="prejoin-mic">
            Microphone
          </label>
          <select id="prejoin-mic" value={micId} onChange={changeMicrophone}>
            {microphones.length === 0 && (
              <option value="">No microphone detected</option>
            )}
            {microphones.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>

          <div className="prejoin-audio-level" aria-label="Microphone status">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <label className="prejoin-label" htmlFor="prejoin-speaker">
            Speaker
          </label>
          <select
            id="prejoin-speaker"
            value={speakerId}
            onChange={(event) => setSpeakerId(event.target.value)}
          >
            {speakers.length === 0 && <option value="">Default speaker</option>}
            {speakers.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Speaker ${index + 1}`}
              </option>
            ))}
          </select>

          {error && (
            <p className="prejoin-message" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="prejoin-join-button"
            onClick={joinSession}
            disabled={joining || sessionLoading || !session || !!sessionError}
          >
            {joining ? 'Preparing...' : 'Join session'}
          </button>

          <p className="prejoin-community-note">
            By joining you agree to follow the community rules. Be respectful
            and keep to your turn times.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default PreJoinSession;
