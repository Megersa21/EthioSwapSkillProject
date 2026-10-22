import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../styles/videoCall.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function VideoCall() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(
    'Preparing camera...',
  );
  const [error, setError] = useState('');

  const flushCandidates = useCallback(async (pc) => {
    const candidates = pendingCandidatesRef.current.splice(0);

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error('Could not add queued ICE candidate:', err);
      }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const stream = localStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.ontrack = (event) => {
      const incomingStream = event.streams?.[0];

      if (incomingStream) {
        remoteStreamRef.current = incomingStream;
        setRemoteStream(incomingStream);
      } else {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }

        remoteStreamRef.current.addTrack(event.track);
        setRemoteStream(remoteStreamRef.current);
      }

      setConnectionStatus('Connected');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit(
          'video:ice-candidate',
          event.candidate.toJSON(),
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectionStatus('Connected');
      } else if (pc.connectionState === 'connecting') {
        setConnectionStatus('Connecting...');
      } else if (pc.connectionState === 'disconnected') {
        setConnectionStatus('Connection interrupted');
      } else if (pc.connectionState === 'failed') {
        setConnectionStatus('Connection failed. Check your network.');
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    let cancelled = false;

    async function startCall() {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Please log in before joining a video call.');
        setConnectionStatus('Not authenticated');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'Camera access requires localhost or a secure HTTPS connection.',
        );
        setConnectionStatus('Camera unavailable');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const socket = io(SOCKET_URL, {
          auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setConnectionStatus('Joining session...');
          socket.emit('video:join', {
            sessionId: Number(sessionId),
          });
        });

        socket.on('connect_error', (err) => {
          setError(err.message || 'Could not connect to the video server.');
          setConnectionStatus('Connection error');
        });

        socket.on('video:error', (data) => {
          setError(data.message || 'A video-call error occurred.');
        });

        socket.on('video:joined', () => {
          setError('');
          setConnectionStatus('Waiting for the other participant...');
        });

        socket.on('video:peer-joined', async () => {
          try {
            const pc = createPeerConnection();
            const offer = await pc.createOffer();

            await pc.setLocalDescription(offer);
            socket.emit('video:offer', pc.localDescription);
            setConnectionStatus('Calling participant...');
          } catch (err) {
            console.error('Could not create offer:', err);
            setError('Could not start the call. Please try again.');
          }
        });

        socket.on('video:offer', async (offer) => {
          try {
            const pc = createPeerConnection();

            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            await flushCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('video:answer', pc.localDescription);
            setConnectionStatus('Connecting...');
          } catch (err) {
            console.error('Could not answer call:', err);
            setError('Could not answer the video call.');
          }
        });

        socket.on('video:answer', async (answer) => {
          try {
            const pc = peerConnectionRef.current;

            if (!pc || pc.signalingState !== 'have-local-offer') {
              return;
            }

            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            await flushCandidates(pc);
          } catch (err) {
            console.error('Could not process answer:', err);
          }
        });

        socket.on('video:ice-candidate', async (candidate) => {
          try {
            const pc = createPeerConnection();
            const iceCandidate = new RTCIceCandidate(candidate);

            if (pc.remoteDescription) {
              await pc.addIceCandidate(iceCandidate);
            } else {
              pendingCandidatesRef.current.push(iceCandidate);
            }
          } catch (err) {
            console.error('Could not add ICE candidate:', err);
          }
        });

        socket.on('video:peer-left', () => {
          setRemoteStream(null);
          remoteStreamRef.current = null;

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }

          peerConnectionRef.current?.close();
          peerConnectionRef.current = null;
          pendingCandidatesRef.current = [];

          setConnectionStatus('The other participant left the call.');
        });
      } catch (err) {
        console.error('Could not access camera or microphone:', err);

        setError(
          err.name === 'NotAllowedError'
            ? 'Camera or microphone permission was denied. Allow access in your browser.'
            : 'Could not access your camera or microphone. Check that they are connected and not being used by another app.',
        );

        setConnectionStatus('Camera unavailable');
      }
    }

    startCall();

    return () => {
      cancelled = true;

      socketRef.current?.emit('video:leave');
      socketRef.current?.disconnect();
      socketRef.current = null;

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;

      remoteStreamRef.current = null;
      pendingCandidatesRef.current = [];
    };
  }, [sessionId, createPeerConnection, flushCandidates]);

  function toggleCamera() {
    const nextValue = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextValue;
    });

    setCameraOn(nextValue);
  }

  function toggleMicrophone() {
    const nextValue = !micOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextValue;
    });

    setMicOn(nextValue);
  }

  function leaveCall() {
    socketRef.current?.emit('video:leave');
    socketRef.current?.disconnect();
    peerConnectionRef.current?.close();

    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    socketRef.current = null;
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    navigate('/sessions');
  }

  return (
    <main className="video-call-page">
      <header className="video-call-header">
        <Link to="/sessions" className="video-call-brand">
          ⇄ EthioSwapSkill
        </Link>

        <div className="video-call-session-label">Session #{sessionId}</div>
      </header>

      <section className="video-call-content">
        <div className="video-call-heading">
          <span className="video-call-eyebrow">SKILL EXCHANGE</span>
          <h1>Your video session</h1>
          <p>Meet your skill-swap partner and learn something new together.</p>
          <span className="video-call-status">
            <span className="video-call-status-dot" />
            {connectionStatus}
          </span>
        </div>

        {error && (
          <div className="video-call-error" role="alert">
            {error}
          </div>
        )}

        <div className="video-call-grid">
          <div className="video-tile">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="video-feed"
            />

            {!remoteStream && (
              <div className="video-placeholder">
                <div className="video-placeholder-avatar">P</div>
                <h3>Your partner</h3>
                <p>Waiting for the other participant to join...</p>
              </div>
            )}

            <span className="video-tile-label">Your partner</span>
          </div>

          <div className="video-tile video-tile-local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-feed"
            />

            {!localStream && (
              <div className="video-placeholder">
                <div className="video-placeholder-avatar">Y</div>
                <h3>You</h3>
                <p>Preparing your camera...</p>
              </div>
            )}

            <span className="video-tile-label">You</span>
          </div>
        </div>

        <div className="video-call-controls">
          <button
            type="button"
            className={`video-control ${!micOn ? 'is-off' : ''}`}
            onClick={toggleMicrophone}
            disabled={!localStream}
          >
            {micOn ? '🎙️ Microphone on' : '🔇 Microphone off'}
          </button>

          <button
            type="button"
            className={`video-control ${!cameraOn ? 'is-off' : ''}`}
            onClick={toggleCamera}
            disabled={!localStream}
          >
            {cameraOn ? '📷 Camera on' : '🚫 Camera off'}
          </button>

          <button
            type="button"
            className="video-leave-button"
            onClick={leaveCall}
          >
            Leave call
          </button>
        </div>

        <p className="video-call-tip">
          Tip: Allow camera and microphone access when your browser asks.
        </p>
      </section>
    </main>
  );
}
