import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Requests.css';

const STORAGE_KEY = 'swapSkillRequests';

const sampleRequests = [
  {
    id: 'req-1',
    direction: 'incoming',
    name: 'Dawit Alemu',
    initials: 'DA',
    location: 'Addis Ababa',
    offeredSkill: 'Web Development',
    wantedSkill: 'UI/UX Design',
    message:
      "Hi! I can help you learn React and JavaScript. I'd love to learn UI/UX design from you.",
    date: '2026-10-14',
    status: 'Pending',
  },
  {
    id: 'req-2',
    direction: 'incoming',
    name: 'Meron Bekele',
    initials: 'MB',
    location: 'Dire Dawa',
    offeredSkill: 'Flutter Development',
    wantedSkill: 'Graphic Design',
    message:
      "Let's exchange skills! I can teach you Flutter basics and learn graphic design in return.",
    date: '2026-10-13',
    status: 'Pending',
  },
  {
    id: 'req-3',
    direction: 'outgoing',
    name: 'Hana Bekele',
    initials: 'HB',
    location: 'Harar',
    offeredSkill: 'JavaScript',
    wantedSkill: 'English Conversation',
    message:
      "I'd love to exchange JavaScript lessons for English conversation practice.",
    date: '2026-10-12',
    status: 'Pending',
  },
  {
    id: 'req-4',
    direction: 'outgoing',
    name: 'Yonas Tadesse',
    initials: 'YT',
    location: 'Addis Ababa',
    offeredSkill: 'HTML and CSS',
    wantedSkill: 'Photography',
    message: 'I can help with web development if you can teach me photography.',
    date: '2026-10-10',
    status: 'Accepted',
  },
];

function readRequests() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : sampleRequests;
    }

    return sampleRequests;
  } catch (error) {
    console.error('Unable to load skill-swap requests:', error);
    return sampleRequests;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Recently';

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Requests() {
  const [requests, setRequests] = useState(readRequests);
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    offeredSkill: '',
    wantedSkill: '',
    message: '',
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error('Unable to save skill-swap requests:', error);
    }
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesTab = activeTab === 'all' || request.direction === activeTab;

      const matchesStatus =
        statusFilter === 'All' || request.status === statusFilter;

      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        [
          request.name,
          request.location,
          request.offeredSkill,
          request.wantedSkill,
          request.message,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchText));

      return matchesTab && matchesStatus && matchesSearch;
    });
  }, [requests, activeTab, statusFilter, search]);

  const incomingCount = requests.filter(
    (request) =>
      request.direction === 'incoming' && request.status === 'Pending',
  ).length;

  const outgoingCount = requests.filter(
    (request) =>
      request.direction === 'outgoing' && request.status === 'Pending',
  ).length;

  const acceptedCount = requests.filter(
    (request) => request.status === 'Accepted',
  ).length;

  function updateStatus(id, newStatus) {
    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === id ? { ...request, status: newStatus } : request,
      ),
    );

    const messages = {
      Accepted: 'Request accepted successfully.',
      Rejected: 'Request rejected.',
      Cancelled: 'Request cancelled.',
    };

    setNotice(messages[newStatus] || 'Request updated.');
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError('');
  }

  function handleSendRequest(event) {
    event.preventDefault();

    const name = formData.name.trim();
    const offeredSkill = formData.offeredSkill.trim();
    const wantedSkill = formData.wantedSkill.trim();
    const message = formData.message.trim();

    if (!name || !offeredSkill || !wantedSkill || !message) {
      setFormError('Please complete all required fields.');
      return;
    }

    if (offeredSkill.toLowerCase() === wantedSkill.toLowerCase()) {
      setFormError('Choose two different skills for your exchange.');
      return;
    }

    const newRequest = {
      id: `req-${Date.now()}`,
      direction: 'outgoing',
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
      location: formData.location.trim() || 'Location not provided',
      offeredSkill,
      wantedSkill,
      message,
      date: new Date().toLocaleDateString('en-CA'),
      status: 'Pending',
    };

    setRequests((currentRequests) => [newRequest, ...currentRequests]);

    setFormData({
      name: '',
      location: '',
      offeredSkill: '',
      wantedSkill: '',
      message: '',
    });

    setFormError('');
    setShowForm(false);
    setActiveTab('outgoing');
    setStatusFilter('All');
    setSearch('');
    setNotice('Your skill-swap request has been created.');
  }

  function openRequestForm() {
    setNotice('');
    setFormError('');
    setShowForm(true);
  }

  return (
    <div className="requests-page">
      <main className="requests-main">
        <section className="requests-heading">
          <div>
            <span className="requests-eyebrow">YOUR SKILL EXCHANGES</span>
            <h1>Skill Swap Requests</h1>
            <p>
              Connect with people, exchange knowledge, and grow your skills
              together.
            </p>
          </div>

          <button
            type="button"
            className="requests-primary-button"
            onClick={openRequestForm}
          >
            <span aria-hidden="true">＋</span> Create Request
          </button>
        </section>

        {notice && (
          <div className="requests-notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        <section className="requests-stats">
          <article className="requests-stat-card">
            <span className="requests-stat-icon incoming-icon">↙</span>
            <div>
              <p>Incoming Pending</p>
              <strong>{incomingCount}</strong>
            </div>
          </article>

          <article className="requests-stat-card">
            <span className="requests-stat-icon outgoing-icon">↗</span>
            <div>
              <p>Outgoing Pending</p>
              <strong>{outgoingCount}</strong>
            </div>
          </article>

          <article className="requests-stat-card">
            <span className="requests-stat-icon accepted-icon">✓</span>
            <div>
              <p>Accepted Requests</p>
              <strong>{acceptedCount}</strong>
            </div>
          </article>
        </section>

        <section className="requests-workspace">
          <div className="requests-toolbar">
            <div
              className="requests-tabs"
              role="group"
              aria-label="Request type"
            >
              <button
                type="button"
                className={activeTab === 'all' ? 'active' : ''}
                onClick={() => setActiveTab('all')}
              >
                All Requests
                <span>{requests.length}</span>
              </button>

              <button
                type="button"
                className={activeTab === 'incoming' ? 'active' : ''}
                onClick={() => setActiveTab('incoming')}
              >
                Incoming
                <span>
                  {
                    requests.filter((item) => item.direction === 'incoming')
                      .length
                  }
                </span>
              </button>

              <button
                type="button"
                className={activeTab === 'outgoing' ? 'active' : ''}
                onClick={() => setActiveTab('outgoing')}
              >
                Sent
                <span>
                  {
                    requests.filter((item) => item.direction === 'outgoing')
                      .length
                  }
                </span>
              </button>
            </div>

            <div className="requests-filters">
              <label className="requests-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Search requests..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search requests"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="requests-list">
            {filteredRequests.length === 0 ? (
              <div className="requests-empty">
                <span className="requests-empty-icon">⇄</span>
                <h2>No requests found</h2>
                <p>Try another filter or create a new skill-swap request.</p>
                <button
                  type="button"
                  className="requests-primary-button"
                  onClick={openRequestForm}
                >
                  Create Request
                </button>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <article className="request-card" key={request.id}>
                  <div className="request-card-top">
                    <div className="request-person">
                      <div className="request-avatar">
                        {request.initials ||
                          request.name?.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="request-person-info">
                        <h2>{request.name}</h2>
                        <p>
                          <span aria-hidden="true">⌖</span>{' '}
                          {request.location || 'Location not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="request-card-meta">
                      <span
                        className={`request-status status-${request.status.toLowerCase()}`}
                      >
                        <span className="request-status-dot" />
                        {request.status}
                      </span>
                      <span className="request-date">
                        {formatDate(request.date)}
                      </span>
                    </div>
                  </div>

                  <div className="request-skill-exchange">
                    <div className="request-skill-box">
                      <span className="request-skill-label">
                        {request.direction === 'incoming'
                          ? 'THEY OFFER'
                          : 'YOU OFFER'}
                      </span>
                      <strong>{request.offeredSkill}</strong>
                    </div>

                    <span
                      className="request-exchange-icon"
                      aria-label="exchanged for"
                    >
                      ⇄
                    </span>

                    <div className="request-skill-box wanted-skill-box">
                      <span className="request-skill-label">
                        {request.direction === 'incoming'
                          ? 'THEY WANT'
                          : 'YOU WANT'}
                      </span>
                      <strong>{request.wantedSkill}</strong>
                    </div>
                  </div>

                  <div className="request-message">
                    <span className="request-message-mark">“</span>
                    <p>{request.message}</p>
                  </div>

                  <div className="request-card-footer">
                    <span className="request-direction-label">
                      {request.direction === 'incoming'
                        ? '↙ Received request'
                        : '↗ Request sent'}
                    </span>

                    <div className="request-actions">
                      {request.direction === 'incoming' &&
                        request.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              className="request-reject-button"
                              onClick={() =>
                                updateStatus(request.id, 'Rejected')
                              }
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              className="request-accept-button"
                              onClick={() =>
                                updateStatus(request.id, 'Accepted')
                              }
                            >
                              ✓ Accept Request
                            </button>
                          </>
                        )}

                      {request.direction === 'outgoing' &&
                        request.status === 'Pending' && (
                          <button
                            type="button"
                            className="request-cancel-button"
                            onClick={() =>
                              updateStatus(request.id, 'Cancelled')
                            }
                          >
                            Cancel Request
                          </button>
                        )}

                      {request.status === 'Accepted' && (
                        <Link to="/messages" className="request-message-button">
                          Message Partner
                        </Link>
                      )}

                      {request.status === 'Rejected' && (
                        <span className="request-final-label">
                          This request was rejected
                        </span>
                      )}

                      {request.status === 'Cancelled' && (
                        <span className="request-final-label">
                          This request was cancelled
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="requests-help">
          <span className="requests-help-icon">✦</span>
          <div>
            <h3>Make every skill exchange count</h3>
            <p>
              Be clear about what you can teach, communicate respectfully, and
              agree on a session time with your partner.
            </p>
          </div>
          <Link to="/discover">Discover partners →</Link>
        </aside>
      </main>

      {showForm && (
        <div
          className="request-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-modal-title"
          >
            <button
              type="button"
              className="request-modal-close"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              ×
            </button>

            <span className="requests-eyebrow">START CONNECTING</span>
            <h2 id="request-modal-title">Create a skill-swap request</h2>
            <p className="request-modal-description">
              Choose a member and explain which skills you want to exchange.
            </p>

            <form className="request-form" onSubmit={handleSendRequest}>
              <label htmlFor="request-name">Member name *</label>
              <input
                id="request-name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Enter the member's name"
                required
              />

              <label htmlFor="request-location">Member location</label>
              <input
                id="request-location"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                placeholder="e.g. Dire Dawa"
              />

              <div className="request-form-grid">
                <div>
                  <label htmlFor="request-offer">Skill you offer *</label>
                  <input
                    id="request-offer"
                    name="offeredSkill"
                    value={formData.offeredSkill}
                    onChange={handleFormChange}
                    placeholder="e.g. React"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="request-want">Skill you want *</label>
                  <input
                    id="request-want"
                    name="wantedSkill"
                    value={formData.wantedSkill}
                    onChange={handleFormChange}
                    placeholder="e.g. UI/UX Design"
                    required
                  />
                </div>
              </div>

              <label htmlFor="request-message">Your message *</label>
              <textarea
                id="request-message"
                name="message"
                value={formData.message}
                onChange={handleFormChange}
                placeholder="Introduce yourself and explain your skill exchange..."
                rows={4}
                required
              />

              {formError && (
                <p className="request-form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="request-form-actions">
                <button
                  type="button"
                  className="request-form-cancel"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="requests-primary-button">
                  Send Request
                </button>
              </div>

              <p className="request-form-note">
                This frontend demo saves the request in this browser. It does
                not send a notification to another account.
              </p>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Requests;
