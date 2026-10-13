import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Requests.css';

const REQUESTS_KEY = 'swapSkillRequests';
const PROFILE_KEY = 'swapSkillMyProfile';
const LISTINGS_KEY = 'swapSkillListings';
const NOTIFICATIONS_KEY = 'swapSkillNotifications';

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
  }
}

function getRequests() {
  const saved = readStorage(REQUESTS_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

function saveRequests(requests) {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    window.dispatchEvent(new Event('swapSkillRequestsUpdated'));
    return true;
  } catch (error) {
    console.error('Could not save requests:', error);
    return false;
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStatus(request) {
  return String(request.status || 'pending').toLowerCase();
}

function getRequesterName(request) {
  return (
    request.senderName ||
    request.fromName ||
    request.requesterName ||
    request.partnerName ||
    request.name ||
    'SwapSkill member'
  );
}

function getRecipientName(request) {
  return (
    request.receiverName ||
    request.toName ||
    request.recipientName ||
    'SwapSkill member'
  );
}

function getOfferedSkill(request) {
  return (
    request.teachSkill ||
    request.offeredSkill ||
    request.skillOffered ||
    request.mySkill ||
    'Skill not specified'
  );
}

function getWantedSkill(request) {
  return (
    request.learnSkill ||
    request.requestedSkill ||
    request.skillWanted ||
    request.theirSkill ||
    'Skill not specified'
  );
}

function formatDate(value) {
  if (!value) return 'Recently';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function saveNotification(message) {
  const saved = readStorage(NOTIFICATIONS_KEY, []);
  const notifications = Array.isArray(saved) ? saved : [];

  try {
    localStorage.setItem(
      NOTIFICATIONS_KEY,
      JSON.stringify(
        [
          {
            id: createId(),
            title: 'Skill-swap request update',
            message,
            type: 'request',
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...notifications,
        ].slice(0, 50),
      ),
    );

    window.dispatchEvent(new Event('swapSkillNotificationsUpdated'));
  } catch (error) {
    console.error('Could not save notification:', error);
  }
}

function Requests() {
  const [requests, setRequests] = useState(() => getRequests());
  const [activeTab, setActiveTab] = useState('incoming');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [myProfile, setMyProfile] = useState(() =>
    readStorage(PROFILE_KEY, {}),
  );

  const [listings, setListings] = useState(() => {
    const saved = readStorage(LISTINGS_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  const [form, setForm] = useState({
    recipientName: '',
    teachSkill: '',
    customTeachSkill: '',
    learnSkill: '',
    note: '',
  });

  useEffect(() => {
    function refresh() {
      setRequests(getRequests());
      setMyProfile(readStorage(PROFILE_KEY, {}));

      const savedListings = readStorage(LISTINGS_KEY, []);
      setListings(Array.isArray(savedListings) ? savedListings : []);
    }

    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('swapSkillRequestsUpdated', refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('swapSkillRequestsUpdated', refresh);
    };
  }, []);

  const myName =
    myProfile.name ||
    myProfile.fullName ||
    myProfile.displayName ||
    'SwapSkill member';

  const mySkills = useMemo(() => {
    const skills = [];

    if (Array.isArray(listings)) {
      listings.forEach((listing) => {
        if (listing.teachSkill) skills.push(listing.teachSkill);
      });
    }

    if (myProfile.teachSkill) {
      skills.push(myProfile.teachSkill);
    }

    return [
      ...new Set(
        skills
          .filter((skill) => typeof skill === 'string')
          .map((skill) => skill.trim())
          .filter(Boolean),
      ),
    ];
  }, [listings, myProfile]);

  // Incoming requests must be addressed to the current user or explicitly
  // marked as incoming. Outgoing requests never belong in this tab.
  const incomingRequests = useMemo(() => {
    return requests.filter((request) => {
      const direction = String(request.direction || '').toLowerCase();
      const status = getStatus(request);

      if (['sent', 'outgoing'].includes(direction)) return false;
      if (['cancelled', 'deleted'].includes(status)) return false;

      if (
        String(
          request.receiverId || request.toUserId || request.recipientId || '',
        ) === String(myProfile.id || 'me')
      ) {
        return true;
      }

      if (direction === 'incoming') return true;

      // Support older demo requests without direction or user IDs.
      return (
        !direction &&
        !request.senderId &&
        !request.fromUserId &&
        !request.receiverId &&
        !request.toUserId &&
        !request.recipientId
      );
    });
  }, [requests, myProfile.id]);

  const sentRequests = useMemo(() => {
    return requests.filter((request) => {
      const direction = String(request.direction || '').toLowerCase();

      return (
        ['sent', 'outgoing'].includes(direction) ||
        String(request.senderId || request.fromUserId || '') ===
          String(myProfile.id || 'me')
      );
    });
  }, [requests, myProfile.id]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function sendRequest(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const recipientName = form.recipientName.trim();

    const teachSkill =
      form.teachSkill === '__other__'
        ? form.customTeachSkill.trim()
        : form.teachSkill.trim();

    const learnSkill = form.learnSkill.trim();

    if (!recipientName || !teachSkill || !learnSkill) {
      setError('Please complete the partner name and both skill fields.');
      return;
    }

    if (teachSkill.toLowerCase() === learnSkill.toLowerCase()) {
      setError('Choose two different skills for your exchange.');
      return;
    }

    const duplicate = requests.some((request) => {
      const direction = String(request.direction || '').toLowerCase();

      return (
        ['sent', 'outgoing'].includes(direction) &&
        getRecipientName(request).toLowerCase() ===
          recipientName.toLowerCase() &&
        getStatus(request) === 'pending'
      );
    });

    if (duplicate) {
      setError('You already have a pending request to this partner.');
      return;
    }

    const newRequest = {
      id: createId(),
      direction: 'sent',
      senderId: String(myProfile.id || 'me'),
      senderName: myName,
      receiverId: '',
      receiverName: recipientName,
      teachSkill,
      learnSkill,
      note: form.note.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = [newRequest, ...requests];

    if (!saveRequests(updated)) {
      setError('The request could not be saved. Please try again.');
      return;
    }

    setRequests(updated);
    saveNotification(`You sent a skill-swap request to ${recipientName}.`);

    setForm({
      recipientName: '',
      teachSkill: '',
      customTeachSkill: '',
      learnSkill: '',
      note: '',
    });

    setActiveTab('sent');
    setSuccess(`Your request to ${recipientName} has been saved.`);
  }

  // Create an incoming sample request to test the Accept and Reject buttons.
  function addDemoIncomingRequest() {
    setError('');
    setSuccess('');

    const existingDemo = requests.some(
      (request) => request.isDemoIncoming === true,
    );

    if (existingDemo) {
      setSuccess(
        'A demo incoming request already exists. Open Incoming to find it.',
      );
      setActiveTab('incoming');
      return;
    }

    const demoRequest = {
      id: createId(),
      direction: 'incoming',
      senderId: 'demo-hana',
      senderName: 'Hana Bekele',
      receiverId: String(myProfile.id || 'me'),
      receiverName: myName,
      teachSkill: 'Graphic Design',
      learnSkill: 'Web Development',
      note: 'Hi! I can teach you graphic design, and I would love to learn web development from you.',
      status: 'pending',
      createdAt: new Date().toISOString(),
      isDemoIncoming: true,
    };

    const updated = [demoRequest, ...requests];

    if (!saveRequests(updated)) {
      setError('Could not create the demo request. Please try again.');
      return;
    }

    setRequests(updated);
    setActiveTab('incoming');
    setSuccess('Demo request added. You can now test Accept and Reject below.');
  }

  function changeRequestStatus(requestId, nextStatus) {
    const request = requests.find(
      (item) => String(item.id) === String(requestId),
    );

    if (!request) {
      setError('Request not found. Refresh the page and try again.');
      return;
    }

    if (!['accepted', 'rejected'].includes(nextStatus)) return;

    if (getStatus(request) !== 'pending') {
      setError('This request has already been answered.');
      return;
    }

    const updated = requests.map((item) =>
      String(item.id) === String(requestId)
        ? {
            ...item,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );

    if (!saveRequests(updated)) {
      setError('The request status could not be saved.');
      return;
    }

    setRequests(updated);
    setError('');

    const requester = getRequesterName(request);

    if (nextStatus === 'accepted') {
      saveNotification(`You accepted ${requester}'s swap request.`);
      setSuccess(`You accepted ${requester}'s request.`);
    } else {
      saveNotification(`You rejected ${requester}'s swap request.`);
      setSuccess(`You rejected ${requester}'s request.`);
    }
  }

  const visibleRequests =
    activeTab === 'incoming' ? incomingRequests : sentRequests;

  const pendingIncoming = incomingRequests.filter(
    (request) => getStatus(request) === 'pending',
  ).length;

  const pendingSent = sentRequests.filter(
    (request) => getStatus(request) === 'pending',
  ).length;

  return (
    <div className="requests-page">
      <main className="requests-main">
        <header className="requests-header">
          <div>
            <p className="requests-eyebrow">YOUR SKILL EXCHANGES</p>
            <h1>Swap requests</h1>
            <p className="requests-subtitle">
              Offer what you know, learn something new, and agree on a fair
              exchange.
            </p>
          </div>

          <Link to="/discover" className="requests-browse-link">
            Discover partners <span aria-hidden="true">→</span>
          </Link>
        </header>

        <section className="requests-stats" aria-label="Request summary">
          <article className="request-stat-card">
            <span className="request-stat-icon">↓</span>
            <div>
              <span className="request-stat-label">Incoming pending</span>
              <strong>{pendingIncoming}</strong>
            </div>
          </article>

          <article className="request-stat-card">
            <span className="request-stat-icon">↑</span>
            <div>
              <span className="request-stat-label">Sent pending</span>
              <strong>{pendingSent}</strong>
            </div>
          </article>

          <article className="request-stat-card">
            <span className="request-stat-icon">↔</span>
            <div>
              <span className="request-stat-label">Total requests</span>
              <strong>{requests.length}</strong>
            </div>
          </article>
        </section>

        <section className="request-compose-card">
          <div className="request-section-heading">
            <div>
              <h2>Send a swap request</h2>
              <p>Choose what you can teach and what you want to learn.</p>
            </div>
            <span className="request-compose-icon">＋</span>
          </div>

          <form onSubmit={sendRequest} className="request-form">
            <div className="request-form-grid">
              <label>
                Partner name
                <input
                  name="recipientName"
                  value={form.recipientName}
                  onChange={updateForm}
                  placeholder="e.g. Hana Bekele"
                  autoComplete="off"
                  required
                />
              </label>

              <label>
                Skill you will teach
                {mySkills.length > 0 ? (
                  <select
                    name="teachSkill"
                    value={form.teachSkill}
                    onChange={updateForm}
                    required
                  >
                    <option value="">Choose a skill</option>
                    {mySkills.map((skill) => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                    <option value="__other__">Other skill…</option>
                  </select>
                ) : (
                  <input
                    name="teachSkill"
                    value={form.teachSkill}
                    onChange={updateForm}
                    placeholder="e.g. Graphic design"
                    required
                  />
                )}
              </label>

              {mySkills.length > 0 && form.teachSkill === '__other__' && (
                <label>
                  Enter your skill
                  <input
                    name="customTeachSkill"
                    value={form.customTeachSkill}
                    onChange={updateForm}
                    placeholder="Type your skill"
                    required
                  />
                </label>
              )}

              <label>
                Skill you want to learn
                <input
                  name="learnSkill"
                  value={form.learnSkill}
                  onChange={updateForm}
                  placeholder="e.g. Web development"
                  required
                />
              </label>

              <label className="request-note-field">
                Message (optional)
                <textarea
                  name="note"
                  value={form.note}
                  onChange={updateForm}
                  placeholder="Introduce yourself and explain what you hope to exchange."
                  rows={3}
                  maxLength={500}
                />
              </label>
            </div>

            {error && (
              <p className="request-feedback error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="request-feedback success" role="status">
                {success}
              </p>
            )}

            <div className="request-form-footer">
              <p>
                <span aria-hidden="true">🔒</span> Be respectful and agree on
                clear learning goals.
              </p>
              <button type="submit" className="request-primary-button">
                Send request
              </button>
            </div>
          </form>
        </section>

        <section className="request-list-section">
          <div
            className="request-tabs"
            role="tablist"
            aria-label="Request type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'incoming'}
              className={activeTab === 'incoming' ? 'active' : ''}
              onClick={() => {
                setActiveTab('incoming');
                setError('');
                setSuccess('');
              }}
            >
              Incoming <span>{incomingRequests.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sent'}
              className={activeTab === 'sent' ? 'active' : ''}
              onClick={() => {
                setActiveTab('sent');
                setError('');
                setSuccess('');
              }}
            >
              Sent <span>{sentRequests.length}</span>
            </button>
          </div>

          <div className="request-list-heading">
            <div>
              <h2>
                {activeTab === 'incoming'
                  ? 'Requests received'
                  : 'Requests you sent'}
              </h2>
              <p>
                {activeTab === 'incoming'
                  ? 'Accept a request to move forward, or reject it if it is not a good match.'
                  : 'Check the status of your skill exchange invitations.'}
              </p>
            </div>

            {activeTab === 'incoming' && (
              <button
                type="button"
                className="request-primary-button"
                onClick={addDemoIncomingRequest}
              >
                + Add demo request
              </button>
            )}
          </div>

          {visibleRequests.length === 0 ? (
            <div className="requests-empty-state">
              <div className="requests-empty-icon">↔</div>
              <h3>
                {activeTab === 'incoming'
                  ? 'No incoming requests yet'
                  : "You haven't sent any requests"}
              </h3>
              <p>
                {activeTab === 'incoming'
                  ? 'For now, add a demo request to test accepting and rejecting requests.'
                  : 'Send a request from Discover to start planning your first skill swap.'}
              </p>

              {activeTab === 'incoming' ? (
                <button
                  type="button"
                  className="request-primary-button"
                  onClick={addDemoIncomingRequest}
                >
                  Add demo request
                </button>
              ) : (
                <Link to="/discover" className="requests-empty-link">
                  Find a skill partner
                </Link>
              )}
            </div>
          ) : (
            <div className="request-cards">
              {visibleRequests.map((request) => {
                const status = getStatus(request);
                const incoming = activeTab === 'incoming';
                const personName = incoming
                  ? getRequesterName(request)
                  : getRecipientName(request);

                return (
                  <article className="request-card" key={request.id}>
                    <div className="request-person-avatar">
                      {personName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()}
                    </div>

                    <div className="request-card-content">
                      <div className="request-card-topline">
                        <div>
                          <h3>{personName}</h3>
                          <p className="request-date">
                            {formatDate(request.createdAt || request.date)}
                          </p>
                        </div>

                        <span className={`request-status ${status}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>

                      <div className="request-swap-details">
                        <div>
                          <span>{incoming ? 'THEY TEACH' : 'YOU TEACH'}</span>
                          <strong>{getOfferedSkill(request)}</strong>
                        </div>

                        <span className="request-swap-arrow">⇄</span>

                        <div>
                          <span>
                            {incoming
                              ? 'THEY WANT TO LEARN'
                              : 'YOU WANT TO LEARN'}
                          </span>
                          <strong>{getWantedSkill(request)}</strong>
                        </div>
                      </div>

                      {request.note && (
                        <p className="request-message">“{request.note}”</p>
                      )}

                      {status === 'pending' && incoming && (
                        <div className="request-card-actions">
                          <button
                            type="button"
                            className="request-accept-button"
                            onClick={() =>
                              changeRequestStatus(request.id, 'accepted')
                            }
                          >
                            Accept request
                          </button>

                          <button
                            type="button"
                            className="request-reject-button"
                            onClick={() =>
                              changeRequestStatus(request.id, 'rejected')
                            }
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {status === 'pending' && !incoming && (
                        <p className="request-waiting">
                          Waiting for {personName} to respond.
                        </p>
                      )}

                      {status === 'accepted' && (
                        <div className="request-accepted-note">
                          <span aria-hidden="true">✓</span>
                          Request accepted. You can now plan your exchange.
                        </div>
                      )}

                      {status === 'rejected' && (
                        <p className="request-rejected-note">
                          This request was rejected.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Requests;
