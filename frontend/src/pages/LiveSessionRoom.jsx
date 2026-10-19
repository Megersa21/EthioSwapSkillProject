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
  const screenShareVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteScreenStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenSenderRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const pendingCandidatesRef = useRef([]);
  const roomJoinedRef = useRef(false);
  const offerInProgressRef = useRef(false);
  const offerPendingRef = useRef(false);
  const mountedRef = useRef(false);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [partnerSharing, setPartnerSharing] = useState(false);
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

    stream.getAudioTracks().forEach((track) => {
      track.enabled = micOn;
    });

    stream.getVideoTracks().forEach((track) => {
      track.enabled = videoOn;
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }, [micOn, videoOn]);

  const createPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    try {
      const stream = await ensureLocalStream();

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    } catch (error) {
      console.error('Could not access camera or microphone:', error);
      setRoomNotice(
        'Allow camera and microphone access to enable video calling.',
      );
    }

    pc.ontrack = (event) => {
      const track = event.track;

      if (track.kind === 'video') {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }

        const cameraAlreadyReceived =
          remoteStreamRef.current.getVideoTracks().length > 0;

        // The initial video track is the partner's camera.
        // A second video track is the separately added screen.
        if (cameraAlreadyReceived) {
          if (!remoteScreenStreamRef.current) {
            remoteScreenStreamRef.current = new MediaStream();
          }

          const screenStream = remoteScreenStreamRef.current;

          if (!screenStream.getTracks().some((t) => t.id === track.id)) {
            screenStream.addTrack(track);
          }

          setPartnerSharing(true);

          if (screenShareVideoRef.current) {
            screenShareVideoRef.current.srcObject = screenStream;
            screenShareVideoRef.current.play().catch(() => {});
          }

          track.addEventListener(
            'ended',
            () => {
              if (remoteScreenStreamRef.current) {
                remoteScreenStreamRef.current
                  .getTracks()
                  .filter((t) => t.id === track.id)
                  .forEach((t) => {
                    remoteScreenStreamRef.current.removeTrack(t);
                  });

                if (
                  remoteScreenStreamRef.current.getVideoTracks().length === 0
                ) {
                  remoteScreenStreamRef.current = null;
                  setPartnerSharing(false);

                  if (screenShareVideoRef.current) {
                    screenShareVideoRef.current.srcObject = null;
                  }
                }
              }
            },
            { once: true },
          );

          return;
        }
      }

      const remoteStream = remoteStreamRef.current || new MediaStream();
      remoteStreamRef.current = remoteStream;

      if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
        remoteStream.addTrack(track);
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }

      setRemoteConnected(true);
      setConnectionStatus('Video connected');
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
        setConnectionStatus('Video connected');
        setRoomNotice('');
      } else if (pc.connectionState === 'connecting') {
        setConnectionStatus('Connecting video...');
      } else if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected'
      ) {
        setRemoteConnected(false);
        setConnectionStatus('Connection interrupted');
        setRoomNotice(
          'The video connection was interrupted. Check your network.',
        );
      } else if (pc.connectionState === 'closed') {
        setRemoteConnected(false);
      }
    };

    // Retry a pending offer after the current negotiation finishes.
    pc.onsignalingstatechange = () => {
      if (
        pc.signalingState === 'stable' &&
        offerPendingRef.current &&
        !offerInProgressRef.current
      ) {
        offerPendingRef.current = false;
        createOffer();
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
        console.error('Could not apply ICE candidate:', error);
      }
    }
  }, []);

  const createOffer = useCallback(async () => {
    if (!roomJoinedRef.current) return;

    if (offerInProgressRef.current) {
      offerPendingRef.current = true;
      return;
    }

    try {
      const pc = await createPeerConnection();

      if (pc.signalingState !== 'stable') {
        offerPendingRef.current = true;
        return;
      }

      offerInProgressRef.current = true;
      offerPendingRef.current = false;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', { offer: pc.localDescription }, (result) => {
        if (result?.status && result.status !== 'success') {
          setRoomNotice(result.message || 'Could not establish the call.');
        }
      });
    } catch (error) {
      console.error('Could not create offer:', error);
      setRoomNotice('Could not establish the video connection.');
    } finally {
      offerInProgressRef.current = false;
    }
  }, [createPeerConnection]);

  const handleOffer = useCallback(
    async (payload) => {
      if (!payload?.offer || !roomJoinedRef.current) return;

      try {
        const pc = await createPeerConnection();

        if (pc.signalingState !== 'stable') {
          console.warn('Offer received while connection is negotiating.');
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

        await addPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit(
          'webrtc:answer',
          { answer: pc.localDescription },
          (result) => {
            if (result?.status && result.status !== 'success') {
              setRoomNotice(result.message || 'Could not answer the call.');
            }
          },
        );

        if (payload.fromUserName) {
          setPartnerName(payload.fromUserName);
        }
      } catch (error) {
        console.error('Could not answer offer:', error);
        setRoomNotice('Could not answer the call. Please rejoin the session.');
      }
    },
    [addPendingCandidates, createPeerConnection],
  );

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

        if (offerPendingRef.current) {
          offerPendingRef.current = false;
          await createOffer();
        }
      } catch (error) {
        console.error('Could not apply answer:', error);
        setRoomNotice('Could not complete the video connection.');
      }
    },
    [addPendingCandidates, createOffer],
  );

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

  useEffect(() => {
    if (!sessionId) {
      setConnectionStatus('Missing session ID');
      setRoomNotice('Return to Sessions and open a valid session.');
      return undefined;
    }

    if (!localStorage.getItem('token')) {
      setConnectionStatus('Not authenticated');
      setRoomNotice('Please log in before joining this session.');
      return undefined;
    }

    let active = true;
    mountedRef.current = true;

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
        setPartnerName(
          result.partnerName || result.userName || 'Skill-swap partner',
        );
        setRoomNotice('You joined the session. Waiting for your partner...');
      });
    }

    function handleConnect() {
      if (active) joinRoom();
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
        `${participant.userName || 'Your partner'} joined the session.`,
      );

      createOffer();
    }

    function handleParticipantLeft(participant) {
      if (!active) return;

      setRemoteConnected(false);
      setPartnerSharing(false);

      setRoomNotice(
        `${participant.userName || 'Your partner'} left the session.`,
      );

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      remoteStreamRef.current = null;
      remoteScreenStreamRef.current = null;
      pendingCandidatesRef.current = [];
      offerPendingRef.current = false;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = null;
      }
    }

    function handleChatMessage(incoming) {
      if (!active || !incoming) return;

      setMessages((current) => {
        if (incoming.id && current.some((item) => item.id === incoming.id)) {
          return current;
        }

        return [
          ...current,
          {
            id: incoming.id || `${Date.now()}-${Math.random()}`,
            sender:
              String(incoming.senderId) === currentUserId ? 'you' : 'partner',
            senderName: incoming.senderName || 'Skill-swap partner',
            text: incoming.text || '',
            createdAt: incoming.createdAt || new Date().toISOString(),
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
      mountedRef.current = false;
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

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }

    if (screenShareVideoRef.current) {
      if (sharing && screenStreamRef.current) {
        screenShareVideoRef.current.srcObject = screenStreamRef.current;
      } else if (partnerSharing && remoteScreenStreamRef.current) {
        screenShareVideoRef.current.srcObject = remoteScreenStreamRef.current;
      }
    }
  }, [sharing, partnerSharing, remoteConnected, videoOn]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
    };
  }, []);

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
      await stopScreenShare();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setRoomNotice(
        'Screen sharing is not supported here. Open the site in a supported browser using HTTPS or localhost.',
      );
      return;
    }

    if (!roomJoinedRef.current) {
      setRoomNotice('Join the session before sharing your screen.');
      return;
    }

    try {
      const pc = await createPeerConnection();

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];

      if (!track) {
        stream.getTracks().forEach((item) => item.stop());
        setRoomNotice('No screen video track was selected.');
        return;
      }

      screenStreamRef.current = stream;

      // Add a separate video track. The camera track remains active.
      screenSenderRef.current = pc.addTrack(track, stream);

      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = stream;
        screenShareVideoRef.current.play().catch(() => {});
      }

      setSharing(true);
      setRoomNotice('Screen selected. Connecting the shared screen...');

      track.addEventListener(
        'ended',
        () => {
          if (screenStreamRef.current) {
            stopScreenShare();
          }
        },
        { once: true },
      );

      // Renegotiate the peer connection to send the new screen track.
      await createOffer();

      setRoomNotice('Screen sharing started.');
    } catch (error) {
      console.error('Screen sharing failed:', error);

      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      screenSenderRef.current = null;
      setSharing(false);

      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = null;
      }

      if (error.name === 'NotAllowedError') {
        setRoomNotice('Screen sharing was cancelled or permission was denied.');
      } else {
        setRoomNotice(
          `Unable to share your screen: ${error.message || 'Unknown error'}`,
        );
      }
    }
  }

  async function stopScreenShare() {
    const pc = peerConnectionRef.current;
    const sender = screenSenderRef.current;

    if (sender && pc) {
      try {
        pc.removeTrack(sender);
      } catch (error) {
        console.error('Could not remove screen sender:', error);
      }
    }

    screenSenderRef.current = null;

    const stream = screenStreamRef.current;
    screenStreamRef.current = null;

    stream?.getTracks().forEach((track) => {
      track.stop();
    });

    setSharing(false);

    if (screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = null;
    }

    if (pc && roomJoinedRef.current) {
      offerPendingRef.current = true;
      await createOffer();
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
        if (
          sentMessage?.id &&
          current.some((item) => item.id === sentMessage.id)
        ) {
          return current;
        }

        return [
          ...current,
          {
            id: sentMessage?.id || `${Date.now()}-${Math.random()}`,
            sender: 'you',
            senderName: sentMessage?.senderName || 'You',
            text: sentMessage?.text || text,
            createdAt: sentMessage?.createdAt || new Date().toISOString(),
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
    roomJoinedRef.current = false;

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
    screenSenderRef.current = null;

    navigate(`/session-review/${sessionId}`);
  }

  const initials = partnerName
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
            <p>Skill swap with {partnerName}</p>
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
              {sharing
                ? 'You are sharing your screen'
                : partnerSharing
                  ? `${partnerName} is sharing their screen`
                  : 'Shared workspace'}
            </p>

            {sharing && (
              <button type="button" onClick={stopScreenShare}>
                Stop sharing
              </button>
            )}
          </div>

          <div className="shared-screen">
            {sharing || partnerSharing ? (
              <video
                ref={screenShareVideoRef}
                className="shared-screen-video"
                autoPlay
                playsInline
                muted={sharing}
              />
            ) : (
              <div className="shared-screen-empty">
                <div className="workspace-icon">▣</div>
                <h2>Shared workspace</h2>
                <p>
                  Share your screen to demonstrate a design, write code
                  together, or explain a skill.
                </p>
                <button
                  type="button"
                  className="workspace-share-button"
                  onClick={toggleScreenShare}
                  disabled={!roomJoined}
                >
                  Share your screen
                </button>
              </div>
            )}
          </div>

          <div className="workspace-caption">
            {sharing
              ? 'Your screen is being shared with your partner.'
              : partnerSharing
                ? `${partnerName}'s shared screen`
                : 'Work together and learn from each other in real time.'}
          </div>
        </section>

        <aside className="live-room-sidebar">
          <section className="room-panel participants-panel">
            <div className="panel-heading">
              <h2>Participants</h2>
              <span className="participant-count">2 people</span>
            </div>

            <div className="live-participant-grid">
              <article className="live-participant partner-active">
                {remoteConnected ? (
                  <video
                    ref={remoteVideoRef}
                    className="remote-participant-video"
                    autoPlay
                    playsInline
                  />
                ) : (
                  <div className="participant-avatar partner-avatar">
                    {initials || 'SP'}
                  </div>
                )}

                <div className="participant-caption">
                  <span className="participant-name">{partnerName}</span>
                  <span className="participant-state">
                    {remoteConnected ? 'Connected' : 'Waiting for video'}
                  </span>
                </div>
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

                <div className="participant-caption">
                  <span className="participant-name">You</span>
                  <span className="participant-state">
                    {micOn ? 'Microphone on' : 'Microphone muted'}
                  </span>
                </div>
              </article>
            </div>
          </section>

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
                  width:
                    turn === 1
                      ? `${Math.max(0, Math.min(100, (secondsLeft / 1500) * 100))}%`
                      : '0%',
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
              <div className="panel-heading">
                <h2>Session chat</h2>
                <span className="chat-online-indicator">
                  {roomJoined ? 'Session joined' : 'Connecting'}
                </span>
              </div>

              <div className="live-chat-messages">
                {messages.length === 0 && (
                  <div className="chat-empty">
                    <span className="chat-empty-icon">✉</span>
                    <strong>Start your conversation</strong>
                    <p>
                      Ask questions and share ideas while learning together.
                    </p>
                  </div>
                )}

                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`chat-message-row ${
                      item.sender === 'you' ? 'chat-message-row-own' : ''
                    }`}
                  >
                    <div
                      className={`live-chat-message ${
                        item.sender === 'you' ? 'own-message' : ''
                      }`}
                    >
                      {item.sender !== 'you' && (
                        <span className="chat-sender">
                          {item.senderName || partnerName}
                        </span>
                      )}
                      <span className="chat-message-text">{item.text}</span>
                      <time className="chat-message-time">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </time>
                    </div>
                  </div>
                ))}
                <div />
              </div>

              <form className="live-chat-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={
                    roomJoined
                      ? 'Write a message...'
                      : 'Connecting to session...'
                  }
                  aria-label="Type a chat message"
                  maxLength={2000}
                  disabled={!roomJoined}
                />
                <button
                  type="submit"
                  disabled={!roomJoined || !message.trim()}
                  aria-label="Send message"
                >
                  Send
                </button>
              </form>
            </section>
          )}

          {roomNotice && (
            <div className="room-notice" role="status">
              <span>{roomNotice}</span>
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
          disabled={!roomJoined}
        >
          <span>▧</span>
          {sharing ? 'Stop sharing' : 'Share screen'}
        </button>

        <button
          type="button"
          className="room-control"
          onClick={() => setChatVisible((visible) => !visible)}
        >
          <span>▱</span>
          {chatVisible ? 'Hide chat' : 'Show chat'}
        </button>

        <button
          type="button"
          className="room-control swap-role-control"
          onClick={swapRoles}
        >
          <span>⇄</span>
          Swap roles
        </button>

        <button
          type="button"
          className="room-control leave-control"
          onClick={leaveSession}
          disabled={isLeaving}
        >
          <span>↗</span>
          {isLeaving ? 'Leaving...' : 'Leave session'}
        </button>
      </footer>
    </main>
  );
}

export default LiveSessionRoom;
