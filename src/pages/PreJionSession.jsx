import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PreJionSession.css';

function PreJoinSession() {
  const navigate = useNavigate();
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

  async function startMedia(selectedCamera = cameraId, selectedMic = micId) {
    try {
      setError();

      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraOn
          ? selectedCamera
            ? { deviceId: { exact: selectedCamera } }
            : true
          : false,
        audio: micOn
          ? selectedMic
            ? { deviceId: { exact: selectedMic } }
            : true
          : false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraStatus(cameraOn ? 'Camera detected' : 'Camera is off');
      setMicStatus(micOn ? 'Microphone working' : 'Microphone is muted');
      setConnectionStatus('Media devices connected');

      const devices = await navigator.mediaDevices.enumerateDevices();
      const availableCameras = devices.filter((d) => d.kind === 'videoinput');
      const availableMics = devices.filter((d) => d.kind === 'audioinput');
      const availableSpeakers = devices.filter((d) => d.kind === 'audiooutput');

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
      return;
    }

    startMedia();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // Start the preview once when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleCamera() {
    const next = !cameraOn;
    setCameraOn(next);

    if (next) {
      await startMedia(cameraId, micId);
    } else {
      streamRef.current?.getVideoTracks().forEach((track) => track.stop());
      setCameraStatus('Camera is off');
    }
  }

  async function toggleMic() {
    const next = !micOn;
    setMicOn(next);

    if (next) {
      await startMedia(cameraId, micId);
    } else {
      streamRef.current?.getAudioTracks().forEach((track) => track.stop());
      setMicStatus('Microphone is muted');
    }
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

  async function joinSession() {
    navigate('/session-room');

    // The real multi-user video room will be connected later.
    // This demo confirms the selected devices and permissions.
    setTimeout(() => {
      setJoining(false);
      setError(
        'Your devices are ready. The live video room will be connected in the next development step.',
      );
    }, 300);
  }

  return (
    <main className="prejoin-page">
      <header className="prejoin-header">
        <a className="prejoin-brand" href="/">
          <span className="prejoin-brand-icon">⇄</span>
          <span>SwapSkill</span>
        </a>

        <button
          type="button"
          className="prejoin-back"
          onClick={() => navigate('/sessions')}
        >
          ← Back to sessions
        </button>
      </header>

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

            {!cameraOn && <div className="prejoin-initials">SU</div>}

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
          <p className="prejoin-time">Today · 4:00 PM to 5:00 PM</p>

          <div className="prejoin-partner">
            <div className="prejoin-partner-avatar">DA</div>
            <div>
              <h2>Design ⇄ Web development</h2>
              <p>Dawit A. · Your swap partner</p>
            </div>
          </div>

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

          {error && <p className="prejoin-message">{error}</p>}

          <button
            type="button"
            className="prejoin-join-button"
            onClick={joinSession}
            disabled={joining}
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
