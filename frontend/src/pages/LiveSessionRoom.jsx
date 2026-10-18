import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../socket';
import '../styles/LiveSessionRoom.css';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function LiveSessionRoom() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const roomJoinedRef = useRef(false);
  const pendingCandidatesRef = useRef([]);
  const chatEndRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [turn, setTurn] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [roomNotice, setRoomNotice] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [roomJoined, setRoomJoined] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [partnerName, setPartnerName] = useState('Skill-swap partner');
  const [isLeaving, setIsLeaving] = useState(false);

  const [currentUserId] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return String(user.id ?? user.userId ?? user.user_id ?? '');
    } catch {
      return '';
    }
  });

  // Obtain camera and microphone access.
  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'Camera and microphone are not supported by this browser.',
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }, []);

  // Restore the local camera preview whenever the video element becomes available.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [roomJoined, remoteConnected, videoOn]);

  // Create a WebRTC peer connection and exchange network candidates.
  const createPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    try {
      const localStream = await ensureLocalStream();

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } catch (error) {
      console.error('Could not obtain local media:', error);
      setRoomNotice(
        'Allow camera and microphone access, then reload the session to enable calling.',
      );
    }

    pc.ontrack = (event) => {
      let remoteStream = event.streams?.[0];

      if (!remoteStream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }

        remoteStreamRef.current.addTrack(event.track);
        remoteStream = remoteStreamRef.current;
      } else {
        remoteStreamRef.current = remoteStream;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }

      setRemoteConnected(true);
      setRoomNotice('Your partner’s audio/video stream is connected.');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.connected && roomJoinedRef.current) {
        socket.emit('webrtc:ice-candidate', {
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setRemoteConnected(true);
        setRoomNotice('Audio/video connection established.');
      } else if (pc.connectionState === 'connecting') {
        setRoomNotice('Connecting your audio and video...');
      } else if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected'
      ) {
        setRemoteConnected(false);
        setRoomNotice(
          'The media connection was interrupted. Check your network and try rejoining.',
        );
      } else if (pc.connectionState === 'closed') {
        setRemoteConnected(false);
      }
    };

    return pc;
  }, [ensureLocalStream]);

  const addPendingCandidates = useCallback(async (pc) => {
    if (!pc.remoteDescription) return;

    const candidates = pendingCandidatesRef.current.splice(0);

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Could not add queued ICE candidate:', error);
      }
    }
  }, []);

  // The participant who was already in the room starts the call.
  const createOffer = useCallback(async () => {
    try {
      if (!roomJoinedRef.current) return;

      const pc = await createPeerConnection();

      if (pc.signalingState !== 'stable') return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', { offer: pc.localDescription }, (result) => {
        if (result?.status !== 'success') {
          setRoomNotice(result?.message || 'Could not start the video call.');
        }
      });
    } catch (error) {
      console.error('Could not create WebRTC offer:', error);
      setRoomNotice('Could not start the call. Check camera permissions.');
    }
  }, [createPeerConnection]);

  // Answer the other participant's call offer.
  const handleOffer = useCallback(
    async (payload) => {
      if (!payload?.offer || !roomJoinedRef.current) return;

      try {
        const pc = await createPeerConnection();

        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

        await addPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit(
          'webrtc:answer',
          { answer: pc.localDescription },
          (result) => {
            if (result?.status !== 'success') {
              setRoomNotice(
                result?.message || 'Could not answer the video call.',
              );
            }
          },
        );

        if (payload.fromUserName) {
          setPartnerName(payload.fromUserName);
        }
      } catch (error) {
        console.error('Could not answer WebRTC offer:', error);
        setRoomNotice('Could not answer the call. Please try rejoining.');
      }
    },
    [addPendingCandidates, createPeerConnection],
  );

  // Apply the answer received by the caller.
  const handleAnswer = useCallback(
    async (payload) => {
      const pc = peerConnectionRef.current;

      if (!pc || !payload?.answer) return;

      try {
        if (pc.signalingState !== 'have-local-offer') return;

        await pc.setRemoteDescription(
          new RTCSessionDescription(payload.answer),
        );

        await addPendingCandidates(pc);
      } catch (error) {
        console.error('Could not apply WebRTC answer:', error);
        setRoomNotice('Could not complete the call connection.');
      }
    },
    [addPendingCandidates],
  );

  // ICE candidates can arrive before the remote description is ready.
  const handleIceCandidate = useCallback(async (payload) => {
    if (!payload?.candidate) return;

    const pc = peerConnectionRef.current;

    if (!pc || !pc.remoteDescription) {
      pendingCandidatesRef.current.push(payload.candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (error) {
      console.error('Could not add ICE candidate:', error);
    }
  }, []);

  // Join the authorized Socket.IO session room and register call events.
  useEffect(() => {
    if (!sessionId) {
      setConnectionStatus('Missing session ID');
      setRoomNotice('Return to Sessions and open a valid session.');
      return undefined;
    }

    if (!localStorage.getItem('token')) {
      setConnectionStatus('Not authenticated');
      setRoomNotice('Please log in again before joining this session.');
      return undefined;
    }

    let active = true;

    function joinRoom() {
      socket.emit('session:join', { sessionId }, (result) => {
        if (!active) return;

        if (!result || result.status !== 'success') {
          roomJoinedRef.current = false;
          setRoomJoined(false);
          setConnectionStatus('Unable to join');
          setRoomNotice(result?.message || 'Could not join this session.');
          return;
        }

        roomJoinedRef.current = true;
        setRoomJoined(true);
        setConnectionStatus('Waiting for partner...');
        setPartnerName(result.userName || 'Skill-swap partner');
        setRoomNotice('You joined the session. Waiting for your partner...');
      });
    }

    function handleConnect() {
      if (!active) return;
      joinRoom();
    }

    function handleConnectError(error) {
      if (!active) return;

      setConnectionStatus('Connection failed');
      setRoomNotice(error.message || 'Could not connect to the server.');
    }

    function handleParticipantJoined(participant) {
      if (!active) return;

      if (participant.userName) {
        setPartnerName(participant.userName);
      }

      setRoomNotice(
        `${participant.userName || 'Your partner'} joined. Starting the call...`,
      );

      createOffer();
    }

    function handleParticipantLeft(participant) {
      if (!active) return;

      setRemoteConnected(false);
      setRoomNotice(
        `${participant.userName || 'Your partner'} left the session.`,
      );

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      remoteStreamRef.current = null;
      pendingCandidatesRef.current = [];

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }

    function handleChatMessage(incoming) {
      if (!active) return;

      setMessages((current) => {
        if (current.some((item) => item.id === incoming.id)) {
          return current;
        }

        return [
          ...current,
          {
            id: incoming.id,
            sender:
              String(incoming.senderId) === currentUserId ? 'you' : 'partner',
            senderName: incoming.senderName || 'Skill-swap partner',
            text: incoming.text,
            createdAt: incoming.createdAt,
          },
        ];
      });
    }

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('session:participant-joined', handleParticipantJoined);
    socket.on('session:participant-left', handleParticipantLeft);
    socket.on('session:chat-message', handleChatMessage);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    socket.connect();

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      active = false;
      roomJoinedRef.current = false;

      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('session:participant-joined', handleParticipantJoined);
      socket.off('session:participant-left', handleParticipantLeft);
      socket.off('session:chat-message', handleChatMessage);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);

      if (socket.connected) {
        socket.emit('session:leave');
        socket.disconnect();
      }

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      pendingCandidatesRef.current = [];
    };
  }, [
    sessionId,
    currentUserId,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  ]);

  // Release camera, microphone, and screen-sharing tracks on unmount.
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Local session timer.
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
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setRoomNotice('Screen sharing is not supported by this browser.');
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = screenStream;
      setSharing(true);

      const screenTrack = screenStream.getVideoTracks()[0];
      const pc = peerConnectionRef.current;

      if (pc && screenTrack) {
        const videoSender = pc
          .getSenders()
          .find((sender) => sender.track?.kind === 'video');

        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, screenStream);
        }
      }

      setRoomNotice(
        'Screen sharing started. Your partner should receive it when the WebRTC connection is active.',
      );

      screenTrack?.addEventListener(
        'ended',
        () => {
          restoreCameraTrack();
        },
        { once: true },
      );
    } catch (error) {
      if (error.name !== 'NotAllowedError') {
        setRoomNotice('Unable to start screen sharing.');
      }
    }
  }

  async function restoreCameraTrack() {
    const screenStream = screenStreamRef.current;
    screenStreamRef.current = null;

    screenStream?.getTracks().forEach((track) => track.stop());
    setSharing(false);

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    const pc = peerConnectionRef.current;

    if (pc && cameraTrack) {
      const videoSender = pc
        .getSenders()
        .find((sender) => sender.track?.kind === 'video');

      if (videoSender) {
        try {
          await videoSender.replaceTrack(cameraTrack);
        } catch (error) {
          console.error('Could not restore camera track:', error);
        }
      }
    }

    setRoomNotice('Screen sharing stopped.');
  }

  function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text) return;

    if (!socket.connected || !roomJoinedRef.current) {
      setRoomNotice('Join the session before sending messages.');
      return;
    }

    socket.emit('session:chat-send', { text }, (result) => {
      if (!result || result.status !== 'success') {
        setRoomNotice(result?.message || 'Message could not be sent.');
        return;
      }

      const sentMessage = result.message;

      setMessages((current) => {
        if (current.some((item) => item.id === sentMessage.id)) {
          return current;
        }

        return [
          ...current,
          {
            id: sentMessage.id,
            sender: 'you',
            senderName: sentMessage.senderName || 'You',
            text: sentMessage.text,
            createdAt: sentMessage.createdAt,
          },
        ];
      });

      setMessage('');
    });
  }

  function swapRoles() {
    const nextTurn = turn === 1 ? 2 : 1;

    setTurn(nextTurn);
    setSecondsLeft(25 * 60);
    setRoomNotice(
      nextTurn === 2
        ? 'Roles swapped. Your partner teaches Web development now.'
        : 'Roles swapped. You teach Graphic design now.',
    );
  }

  function leaveSession() {
    if (!window.confirm('Are you sure you want to leave this session?')) {
      return;
    }

    setIsLeaving(true);

    if (socket.connected) {
      socket.emit('session:leave');
      socket.disconnect();
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());

    localStreamRef.current = null;
    screenStreamRef.current = null;

    navigate('/session-review');
  }

  return (
    <main className="live-room">
      <header className="live-room-header">
        <div className="live-room-title">
          <button
            type="button"
            className="live-room-brand-icon"
            aria-label="Back to sessions"
            onClick={() => navigate('/sessions')}
          >
            ⇄
          </button>

          <div>
            <h1>Design ⇄ Web development</h1>
            <p>with {partnerName}</p>
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
            {remoteConnected ? '● Video connected' : connectionStatus}
          </span>
        </div>
      </header>

      <div className="live-room-main">
        <section className="live-room-workspace">
          <div className="screen-share-heading">
            <p>
              <span>▣</span>
              {sharing ? 'You are sharing your screen' : 'Shared workspace'}
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
                <span>EthioSwapSkill · Live workspace</span>
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

          <p className="participant-name">
            Note: the workspace illustration is a placeholder. Your actual
            shared screen is transmitted as a video track.
          </p>
        </section>

        <aside className="live-room-sidebar">
          <div className="live-participant-grid">
            <article className="live-participant partner-active">
              {remoteConnected ? (
                <video
                  ref={remoteVideoRef}
                  className="remote-participant-video"
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '150px',
                    objectFit: 'cover',
                    background: '#101827',
                    borderRadius: '12px',
                  }}
                />
              ) : (
                <div className="participant-avatar partner-avatar">
                  {partnerName
                    .split(' ')
                    .map((part) => part[0] || '')
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <span className="participant-name">{partnerName}</span>
              <span className="participant-name">
                {remoteConnected ? 'Connected' : 'Waiting for partner video'}
              </span>
            </article>

            <article className="live-participant">
              {videoOn ? (
                <video
                  ref={localVideoRef}
                  className="local-participant-video"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="participant-avatar you-avatar">You</div>
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
              <span>
                {turn === 1 ? `${formatTime(secondsLeft)} left` : '25 min'}
              </span>
            </div>

            <div className="turn-progress">
              <span
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (secondsLeft / (25 * 60)) * 100),
                  )}%`,
                }}
              />
            </div>

            <div className={turn === 2 ? 'plan-row current-turn' : 'plan-row'}>
              <div>
                <strong>Turn 2</strong>
                <span> · Partner teaches Web development</span>
              </div>
              <span>
                {turn === 2 ? `${formatTime(secondsLeft)} left` : '25 min'}
              </span>
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
                {messages.length === 0 && (
                  <p className="participant-name">
                    No messages yet. Start the conversation!
                  </p>
                )}

                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`live-chat-message ${
                      item.sender === 'you' ? 'own-message' : ''
                    }`}
                  >
                    {item.sender !== 'you' && (
                      <strong>{item.senderName}: </strong>
                    )}
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
                  placeholder={
                    roomJoined ? 'Type a message...' : 'Connecting...'
                  }
                  aria-label="Type a chat message"
                  maxLength={2000}
                  disabled={!roomJoined}
                />
                <button type="submit" disabled={!roomJoined}>
                  Send
                </button>
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
          <span>{micOn ? '♩' : '×'}</span>
          {micOn ? 'Mute' : 'Unmute'}
        </button>

        <button
          type="button"
          className={!videoOn ? 'room-control control-off' : 'room-control'}
          onClick={toggleVideo}
        >
          <span>▣</span>
          {videoOn ? 'Stop video' : 'Start video'}
        </button>

        <button
          type="button"
          className={sharing ? 'room-control sharing-active' : 'room-control'}
          onClick={toggleScreenShare}
        >
          <span>▣</span>
          {sharing ? 'Stop sharing' : 'Share screen'}
        </button>

        <button
          type="button"
          className="room-control"
          onClick={() => setChatVisible((visible) => !visible)}
        >
          <span>▱</span>
          {chatVisible ? 'Hide chat' : 'Chat'}
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
          <span>⌁</span>
          {isLeaving ? 'Leaving...' : 'Leave'}
        </button>
      </footer>
    </main>
  );
}

export default LiveSessionRoom;
