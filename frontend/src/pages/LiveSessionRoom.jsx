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

const isSuccessful = (result) =>
  result?.success === true || result?.status === 'success';

function LiveSessionRoom() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteScreenStreamRef = useRef(null);
  const receivedStreamsRef = useRef(new Map());
  const remoteScreenStreamIdsRef = useRef(new Set());

  const screenStreamRef = useRef(null);
  const screenSenderRef = useRef(null);
  const cameraSenderRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const pendingCandidatesRef = useRef([]);
  const roomJoinedRef = useRef(false);
  const offerInProgressRef = useRef(false);
  const offerPendingRef = useRef(false);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const settingRemoteAnswerRef = useRef(false);
  const politeRef = useRef(false);
  const micOnRef = useRef(true);
  const videoOnRef = useRef(true);
  const sharingRef = useRef(false);
  const createOfferRef = useRef(null);
  const activeRef = useRef(false);

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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
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
      track.enabled = micOnRef.current;
    });

    stream.getVideoTracks().forEach((track) => {
      track.enabled = videoOnRef.current;
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => {});
    }

    return stream;
  }, []);

  const addPendingCandidates = useCallback(async (pc) => {
    if (!pc.remoteDescription) return;

    const candidates = pendingCandidatesRef.current.splice(0);

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        if (!ignoreOfferRef.current) {
          console.error('Could not apply ICE candidate:', error);
        }
      }
    }
  }, []);

  const showRemoteScreen = useCallback((stream) => {
    if (!stream) return;

    remoteScreenStreamRef.current = stream;

    if (!sharingRef.current && screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = stream;
      screenShareVideoRef.current.play().catch(() => {});
    }

    setPartnerSharing(true);
  }, []);

  const showRemoteCamera = useCallback((stream) => {
    if (!stream) return;

    remoteStreamRef.current = stream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
    }

    setRemoteConnected(
      stream.getTracks().some((track) => track.readyState === 'live'),
    );
  }, []);

  const createPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    try {
      const localStream = await ensureLocalStream();

      localStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStream);

        if (track.kind === 'video') {
          cameraSenderRef.current = sender;
        }
      });
    } catch (error) {
      console.error('Could not access camera or microphone:', error);
      setRoomNotice(
        'Allow camera and microphone access to enable video calling.',
      );
    }

    pc.ontrack = (event) => {
      const track = event.track;
      const stream = event.streams?.[0] || new MediaStream([track]);

      receivedStreamsRef.current.set(stream.id, stream);

      if (remoteScreenStreamIdsRef.current.has(stream.id)) {
        showRemoteScreen(stream);
      } else {
        showRemoteCamera(stream);
      }

      track.onended = () => {
        const currentStream = receivedStreamsRef.current.get(stream.id);

        if (currentStream) {
          currentStream.removeTrack(track);
        }

        if (remoteScreenStreamIdsRef.current.has(stream.id)) {
          const hasLiveScreenTrack = currentStream
            ?.getVideoTracks()
            .some((item) => item.readyState === 'live');

          if (!hasLiveScreenTrack) {
            remoteScreenStreamIdsRef.current.delete(stream.id);
            receivedStreamsRef.current.delete(stream.id);
            remoteScreenStreamRef.current = null;
            setPartnerSharing(false);

            if (!sharingRef.current && screenShareVideoRef.current) {
              screenShareVideoRef.current.srcObject = null;
            }
          }
        } else {
          const hasLiveCameraTrack = currentStream
            ?.getTracks()
            .some((item) => item.readyState === 'live');

          if (!hasLiveCameraTrack) {
            setRemoteConnected(false);
          }
        }
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.connected && roomJoinedRef.current) {
        socket.emit('webrtc:ice-candidate', {
          sessionId: String(sessionId),
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
        setConnectionStatus('Connection interrupted');
        setRoomNotice(
          'The video connection was interrupted. Check your network.',
        );
      } else if (pc.connectionState === 'closed') {
        setRemoteConnected(false);
      }
    };

    pc.onnegotiationneeded = () => {
      if (roomJoinedRef.current) {
        createOfferRef.current?.();
      }
    };

    return pc;
  }, [ensureLocalStream, sessionId, showRemoteCamera, showRemoteScreen]);

  const createOffer = useCallback(async () => {
    if (!roomJoinedRef.current) return;

    if (makingOfferRef.current || offerInProgressRef.current) {
      offerPendingRef.current = true;
      return;
    }

    const pc = await createPeerConnection();

    if (pc.signalingState !== 'stable') {
      offerPendingRef.current = true;
      return;
    }

    try {
      makingOfferRef.current = true;
      offerInProgressRef.current = true;
      offerPendingRef.current = false;

      const offer = await pc.createOffer();

      if (pc.signalingState !== 'stable') {
        offerPendingRef.current = true;
        return;
      }

      await pc.setLocalDescription(offer);

      socket.emit(
        'webrtc:offer',
        {
          sessionId: String(sessionId),
          offer: pc.localDescription,
        },
        (result) => {
          if (result && !isSuccessful(result)) {
            setRoomNotice(result.message || 'Could not establish the call.');
          }
        },
      );
    } catch (error) {
      console.error('Could not create offer:', error);
      setRoomNotice('Could not establish the video connection.');
    } finally {
      makingOfferRef.current = false;
      offerInProgressRef.current = false;
    }
  }, [createPeerConnection, sessionId]);

  createOfferRef.current = createOffer;

  const handleOffer = useCallback(
    async (payload) => {
      if (!payload?.offer || !roomJoinedRef.current) return;

      try {
        const pc = await createPeerConnection();

        const offerCollision =
          makingOfferRef.current ||
          (pc.signalingState !== 'stable' && !settingRemoteAnswerRef.current);

        ignoreOfferRef.current = !politeRef.current && offerCollision;

        if (ignoreOfferRef.current) {
          return;
        }

        if (offerCollision && politeRef.current) {
          await Promise.all([pc.setLocalDescription({ type: 'rollback' })]);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

        await addPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit(
          'webrtc:answer',
          {
            sessionId: String(sessionId),
            answer: pc.localDescription,
          },
          (result) => {
            if (result && !isSuccessful(result)) {
              setRoomNotice(result.message || 'Could not answer the call.');
            }
          },
        );

        if (payload.fromUserName || payload.userName) {
          setPartnerName(payload.fromUserName || payload.userName);
        }
      } catch (error) {
        console.error('Could not handle offer:', error);
        setRoomNotice(
          'Could not establish the video connection. Please try rejoining.',
        );
      }
    },
    [addPendingCandidates, createPeerConnection, sessionId],
  );

  const handleAnswer = useCallback(
    async (payload) => {
      const pc = peerConnectionRef.current;

      if (!pc || !payload?.answer) return;

      try {
        settingRemoteAnswerRef.current = true;

        if (pc.signalingState !== 'have-local-offer') return;

        await pc.setRemoteDescription(
          new RTCSessionDescription(payload.answer),
        );

        await addPendingCandidates(pc);

        if (offerPendingRef.current) {
          offerPendingRef.current = false;
          createOfferRef.current?.();
        }
      } catch (error) {
        console.error('Could not apply answer:', error);
        setRoomNotice('Could not complete the video connection.');
      } finally {
        settingRemoteAnswerRef.current = false;
      }
    },
    [addPendingCandidates],
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
      if (!ignoreOfferRef.current) {
        console.error('Could not add ICE candidate:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setConnectionStatus('Missing session ID');
      setRoomNotice('Return to Sessions and open a valid session.');
      return undefined;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      setConnectionStatus('Not authenticated');
      setRoomNotice('Please log in before joining this session.');
      return undefined;
    }

    let active = true;
    activeRef.current = true;

    socket.auth = { ...(socket.auth || {}), token };

    function joinRoom() {
      socket.emit(
        'session:join',
        { sessionId: String(sessionId) },
        async (result) => {
          if (!active) return;

          if (!isSuccessful(result)) {
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

          // Deterministically assign offer-collision roles when IDs exist.
          const localId = String(
            result.userId ?? result.user?.id ?? currentUserId,
          );
          const remoteId = String(result.partnerId ?? result.partner?.id ?? '');

          if (localId && remoteId) {
            politeRef.current = localId > remoteId;
          } else {
            politeRef.current = false;
          }

          try {
            await ensureLocalStream();

            if (active && roomJoinedRef.current) {
              await createPeerConnection();
            }
          } catch (error) {
            console.error('Camera initialization failed:', error);
            setRoomNotice(
              'Camera access failed. Allow camera and microphone access in your browser.',
            );
          }
        },
      );
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

      if (participant?.userName) {
        setPartnerName(participant.userName);
      }

      setRoomNotice(
        `${participant?.userName || 'Your partner'} joined the session.`,
      );

      // Both clients may negotiate; collision handling is in handleOffer.
      createOfferRef.current?.();
    }

    function handleParticipantLeft(participant) {
      if (!active) return;

      setRemoteConnected(false);
      setPartnerSharing(false);
      remoteScreenStreamIdsRef.current.clear();
      receivedStreamsRef.current.clear();

      setRoomNotice(
        `${participant?.userName || 'Your partner'} left the session.`,
      );

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      cameraSenderRef.current = null;
      screenSenderRef.current = null;
      remoteStreamRef.current = null;
      remoteScreenStreamRef.current = null;
      pendingCandidatesRef.current = [];
      offerPendingRef.current = false;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      if (screenShareVideoRef.current && !sharingRef.current) {
        screenShareVideoRef.current.srcObject = null;
      }
    }

    function handleChatMessage(incoming) {
      if (!active || !incoming) return;

      const incomingText =
        typeof incoming.message === 'string'
          ? incoming.message
          : incoming.text || '';

      const senderId = incoming.userId ?? incoming.senderId;

      setMessages((current) => {
        if (incoming.id && current.some((item) => item.id === incoming.id)) {
          return current;
        }

        return [
          ...current,
          {
            id: incoming.id || `${Date.now()}-${Math.random()}`,
            sender: String(senderId) === currentUserId ? 'you' : 'partner',
            senderName:
              incoming.userName || incoming.senderName || 'Skill-swap partner',
            text: incomingText,
            createdAt:
              incoming.sentAt || incoming.createdAt || new Date().toISOString(),
          },
        ];
      });
    }

    function handleScreenShareStarted(payload) {
      if (!active || !payload?.streamId) return;

      const streamId = String(payload.streamId);
      remoteScreenStreamIdsRef.current.add(streamId);

      const stream = receivedStreamsRef.current.get(streamId);

      if (stream) {
        showRemoteScreen(stream);
      }

      if (payload.userName) {
        setPartnerName(payload.userName);
      }
    }

    function handleScreenShareStopped(payload) {
      if (!active) return;

      const streamId = payload?.streamId ? String(payload.streamId) : null;

      if (streamId) {
        remoteScreenStreamIdsRef.current.delete(streamId);
        receivedStreamsRef.current.delete(streamId);
      }

      const currentScreen = remoteScreenStreamRef.current;

      if (!streamId || currentScreen?.id === streamId) {
        remoteScreenStreamRef.current = null;
        setPartnerSharing(false);

        if (!sharingRef.current && screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = null;
        }
      }
    }

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('session:participant-joined', handleParticipantJoined);
    socket.on('session:participant-left', handleParticipantLeft);
    socket.on('session:chat-message', handleChatMessage);
    socket.on('session:screen-share-started', handleScreenShareStarted);
    socket.on('session:screen-share-stopped', handleScreenShareStopped);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    socket.connect();

    if (socket.connected) joinRoom();

    return () => {
      active = false;
      activeRef.current = false;
      roomJoinedRef.current = false;

      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('session:participant-joined', handleParticipantJoined);
      socket.off('session:participant-left', handleParticipantLeft);
      socket.off('session:chat-message', handleChatMessage);
      socket.off('session:screen-share-started', handleScreenShareStarted);
      socket.off('session:screen-share-stopped', handleScreenShareStopped);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);

      if (socket.connected) {
        socket.emit('session:leave');
        socket.disconnect();
      }

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      cameraSenderRef.current = null;
      screenSenderRef.current = null;
      pendingCandidatesRef.current = [];
    };
  }, [
    sessionId,
    currentUserId,
    ensureLocalStream,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    showRemoteScreen,
  ]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => {});
    }

    if (screenShareVideoRef.current) {
      if (sharing && screenStreamRef.current) {
        screenShareVideoRef.current.srcObject = screenStreamRef.current;
      } else if (partnerSharing && remoteScreenStreamRef.current) {
        screenShareVideoRef.current.srcObject = remoteScreenStreamRef.current;
      }
    }
  }, [sharing, partnerSharing, remoteConnected, videoOn, chatVisible]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    sharingRef.current = sharing;
  }, [sharing]);

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
    micOnRef.current = next;
    setMicOn(next);

    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
  }

  function toggleVideo() {
    const next = !videoOn;
    videoOnRef.current = next;
    setVideoOn(next);

    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
  }

  async function toggleScreenShare() {
    if (sharingRef.current) {
      await stopScreenShare();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setRoomNotice(
        'Screen sharing is not supported here. Use a supported browser over HTTPS or localhost.',
      );
      return;
    }

    if (!roomJoinedRef.current) {
      setRoomNotice('Join the session before sharing your screen.');
      return;
    }

    let stream;

    try {
      const pc = await createPeerConnection();

      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];

      if (!track) {
        stream.getTracks().forEach((item) => item.stop());
        setRoomNotice('No screen video track was selected.');
        return;
      }

      screenStreamRef.current = stream;
      sharingRef.current = true;

      // Add a separate sender. Do not replace the camera sender.
      screenSenderRef.current = pc.addTrack(track, stream);

      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = stream;
        screenShareVideoRef.current.play().catch(() => {});
      }

      setSharing(true);
      setRoomNotice('Screen sharing started.');

      socket.emit('session:screen-share-start', {
        sessionId: String(sessionId),
        streamId: stream.id,
      });

      track.addEventListener(
        'ended',
        () => {
          if (sharingRef.current) {
            stopScreenShare();
          }
        },
        { once: true },
      );

      await createOfferRef.current?.();
    } catch (error) {
      console.error('Screen sharing failed:', error);

      const pc = peerConnectionRef.current;

      if (screenSenderRef.current && pc) {
        try {
          pc.removeTrack(screenSenderRef.current);
        } catch {
          // The peer connection may already be closed.
        }
      }

      stream?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      screenSenderRef.current = null;
      sharingRef.current = false;
      setSharing(false);

      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = null;
      }

      setRoomNotice(
        error.name === 'NotAllowedError'
          ? 'Screen sharing was cancelled or permission was denied.'
          : `Unable to share your screen: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async function stopScreenShare() {
    const pc = peerConnectionRef.current;
    const sender = screenSenderRef.current;
    const stream = screenStreamRef.current;

    sharingRef.current = false;

    if (socket.connected && roomJoinedRef.current) {
      socket.emit('session:screen-share-stop', {
        sessionId: String(sessionId),
        streamId: stream?.id || null,
      });
    }

    if (sender && pc) {
      try {
        pc.removeTrack(sender);
      } catch (error) {
        console.error('Could not remove screen sender:', error);
      }
    }

    screenSenderRef.current = null;
    screenStreamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());

    setSharing(false);

    if (screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = null;
    }

    if (remoteScreenStreamRef.current) {
      screenShareVideoRef.current &&
        (screenShareVideoRef.current.srcObject = remoteScreenStreamRef.current);
    }

    setRoomNotice('Screen sharing stopped.');

    if (pc && roomJoinedRef.current) {
      await createOfferRef.current?.();
    }
  }

  function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    if (!text) return;

    if (!socket.connected || !roomJoinedRef.current) {
      setRoomNotice('Join the session before sending messages.');
      return;
    }

    socket.emit('session:chat-send', { message: text }, (result) => {
      if (!isSuccessful(result)) {
        setRoomNotice(result?.message || 'Message could not be sent.');
        return;
      }

      const sentMessage = result.message;
      const sentText =
        typeof sentMessage === 'string'
          ? sentMessage
          : sentMessage?.text || sentMessage?.message || text;

      setMessages((current) => [
        ...current,
        {
          id: sentMessage?.id || `${Date.now()}-${Math.random()}`,
          sender: 'you',
          senderName: sentMessage?.senderName || 'You',
          text: sentText,
          createdAt: sentMessage?.createdAt || new Date().toISOString(),
        },
      ]);

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
    sharingRef.current = false;

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
    cameraSenderRef.current = null;

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
                <video
                  ref={remoteVideoRef}
                  className="remote-participant-video"
                  autoPlay
                  playsInline
                />
                {!remoteConnected && (
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
                    className={`chat-message-row ${item.sender === 'you' ? 'chat-message-row-own' : ''}`}
                  >
                    <div
                      className={`live-chat-message ${item.sender === 'you' ? 'own-message' : ''}`}
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
          <span>⇄</span>Swap roles
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
