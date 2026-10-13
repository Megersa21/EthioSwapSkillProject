import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LiveSessionRoom.css';

function LiveSessionRoom() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const chatEndRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [turn, setTurn] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'partner', text: 'Can you zoom into the logo grid?' },
    { id: 2, sender: 'you', text: 'Sure, one moment.' },
  ]);
  const [roomNotice, setRoomNotice] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    let stream;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Camera or microphone unavailable:', error);
        setRoomNotice(
          'Camera or microphone access is unavailable. You can still explore the room controls.',
        );
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);

    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
  }

  function toggleVideo() {
    const next = !videoOn;
    setVideoOn(next);

    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
  }

  async function toggleScreenShare() {
    if (sharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setSharing(false);
      setRoomNotice('Screen sharing stopped.');
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setRoomNotice('Screen sharing is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = stream;
      setSharing(true);
      setRoomNotice('Your screen is being shared in this browser.');

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        screenStreamRef.current = null;
        setSharing(false);
        setRoomNotice('Screen sharing stopped.');
      });
    } catch (error) {
      if (error.name !== 'NotAllowedError') {
        setRoomNotice('Unable to start screen sharing.');
      }
    }
  }

  function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), sender: 'you', text },
    ]);

    setMessage('');
  }

  function swapRoles() {
    setTurn((current) => (current === 1 ? 2 : 1));
    setSecondsLeft(25 * 60);
    setRoomNotice(
      turn === 1
        ? 'Roles swapped. Dawit teaches Web development now.'
        : 'Roles swapped. You teach Graphic design now.',
    );
  }

  function leaveSession() {
    const confirmed = window.confirm(
      'Are you sure you want to leave this session?',
    );

    if (!confirmed) return;

    setIsLeaving(true);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    navigate('/session-review');
  }

  return (
    <main className="live-room">
      <header className="live-room-header">
        <div className="live-room-title">
          <a
            href="/sessions"
            className="live-room-brand-icon"
            aria-label="Back to sessions"
          >
            ⇄
          </a>

          <div>
            <h1>Design ⇄ Web development</h1>
            <p>with Dawit A.</p>
          </div>
        </div>

        <div className="live-room-header-status">
          <span className="live-pill">
            <i /> Live · {formatTime(elapsed)}
          </span>

          <span className="turn-pill">
            Turn {turn} of 2 · {formatTime(secondsLeft)} left
          </span>

          <span className="connection-pill">
            <span>▥</span> Good connection
          </span>
        </div>
      </header>

      <div className="live-room-main">
        <section className="live-room-workspace">
          <div className="screen-share-heading">
            <p>
              <span>▣</span>
              {sharing
                ? 'You are sharing your screen'
                : 'Your shared workspace will appear here'}
            </p>

            {sharing && (
              <button type="button" onClick={toggleScreenShare}>
                Stop sharing
              </button>
            )}
          </div>

          <div className="shared-screen">
            <div className="mock-design-window">
              <div className="mock-window-toolbar">
                <div className="window-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span>
                  {sharing ? 'Screen sharing active' : 'brand-sheet.psd'}
                </span>
              </div>

              <div className="mock-window-body">
                <aside className="mock-design-tools">
                  <i />
                  <i />
                  <i />
                  <i />
                </aside>

                <div className="mock-design-canvas">
                  <div className="mock-logo-art">
                    <div className="mock-logo-mark">
                      <span />
                    </div>
                    <div className="mock-logo-line" />
                    <div className="mock-logo-caption" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="live-room-sidebar">
          <div className="live-participant-grid">
            <article className="live-participant partner-active">
              <div className="participant-avatar partner-avatar">DA</div>
              <span className="participant-name">Dawit A.</span>
            </article>

            <article className="live-participant">
              {videoOn ? (
                <video
                  ref={videoRef}
                  className="local-participant-video"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="participant-avatar you-avatar">SU</div>
              )}
              <span className="participant-name">You</span>
            </article>
          </div>

          <section className="room-panel session-plan">
            <h2>Session plan</h2>

            <div className={turn === 1 ? 'plan-row current-turn' : 'plan-row'}>
              <div>
                <strong>Turn 1</strong>
                <span> · You teach Graphic design</span>
              </div>
              {turn === 1 && <b>{formatTime(secondsLeft)} left</b>}
              {turn !== 1 && <span>25 min</span>}
            </div>

            <div className="turn-progress">
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, (secondsLeft / (25 * 60)) * 100))}%`,
                }}
              />
            </div>

            <div className={turn === 2 ? 'plan-row current-turn' : 'plan-row'}>
              <div>
                <strong>Turn 2</strong>
                <span> · Dawit teaches Web development</span>
              </div>
              {turn === 2 && <b>{formatTime(secondsLeft)} left</b>}
              {turn !== 2 && <span>25 min</span>}
            </div>

            <div className="plan-row wrap-up-row">
              <div>
                <strong>Wrap-up</strong>
                <span> · Feedback and next steps</span>
              </div>
              <span>10 min</span>
            </div>
          </section>

          {chatVisible && (
            <section className="room-panel live-chat-panel">
              <h2>Chat</h2>

              <div className="live-chat-messages">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`live-chat-message ${item.sender === 'you' ? 'own-message' : ''}`}
                  >
                    {item.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form className="live-chat-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Type a message..."
                  aria-label="Type a chat message"
                />
                <button type="submit">Send</button>
              </form>
            </section>
          )}

          {roomNotice && (
            <div className="room-notice" role="status">
              {roomNotice}
              <button
                type="button"
                onClick={() => setRoomNotice('')}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}
        </aside>
      </div>

      <footer className="live-room-controls">
        <button
          type="button"
          className={!micOn ? 'room-control control-off' : 'room-control'}
          onClick={toggleMic}
        >
          <span>{micOn ? '♩' : '×'}</span> {micOn ? 'Mute' : 'Unmute'}
        </button>

        <button
          type="button"
          className={!videoOn ? 'room-control control-off' : 'room-control'}
          onClick={toggleVideo}
        >
          <span>▣</span> {videoOn ? 'Stop video' : 'Start video'}
        </button>

        <button
          type="button"
          className={sharing ? 'room-control sharing-active' : 'room-control'}
          onClick={toggleScreenShare}
        >
          <span>▣</span> {sharing ? 'Stop sharing' : 'Share screen'}
        </button>

        <button
          type="button"
          className="room-control"
          onClick={() => setChatVisible((visible) => !visible)}
        >
          <span>▱</span> {chatVisible ? 'Hide chat' : 'Chat'}
        </button>

        <button
          type="button"
          className="room-control swap-role-control"
          onClick={swapRoles}
        >
          <span>⇄</span> Swap roles
        </button>

        <button
          type="button"
          className="room-control leave-control"
          onClick={leaveSession}
          disabled={isLeaving}
        >
          <span>⌁</span> {isLeaving ? 'Leaving...' : 'Leave'}
        </button>
      </footer>
    </main>
  );
}

export default LiveSessionRoom;
