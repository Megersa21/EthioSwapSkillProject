import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Requests.css';

const initialRequests = [
  {
    id: 1,
    name: 'Dawit Alemu',
    initials: 'DA',
    location: 'Addis Ababa',
    teaches: 'JavaScript',
    wants: 'UI/UX Design',
    direction: 'incoming',
    status: 'Pending',
    color: 'teal',
  },
  {
    id: 2,
    name: 'Meron Tadesse',
    initials: 'MT',
    location: 'Dire Dawa',
    teaches: 'English',
    wants: 'Web Development',
    direction: 'incoming',
    status: 'Pending',
    color: 'yellow',
  },
  {
    id: 3,
    name: 'Yonas Bekele',
    initials: 'YB',
    location: 'Hawassa',
    teaches: 'Python',
    wants: 'JavaScript',
    direction: 'outgoing',
    status: 'Pending',
    color: 'gray',
  },
];

export default function Requests() {
  const [requests, setRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('swapSkillRequests');
      return saved ? JSON.parse(saved) : initialRequests;
    } catch {
      return initialRequests;
    }
  });

  const [activeTab, setActiveTab] = useState('incoming');

  function updateStatus(id, status) {
    setRequests((previous) => {
      const updated = previous.map((request) =>
        request.id === id ? { ...request, status } : request,
      );

      localStorage.setItem('swapSkillRequests', JSON.stringify(updated));
      return updated;
    });
  }

  const visibleRequests = requests.filter(
    (request) => request.direction === activeTab,
  );

  const pendingCount = requests.filter(
    (request) =>
      request.direction === 'incoming' && request.status === 'Pending',
  ).length;

  return (
    <main className="requests-page">
      <div className="requests-container">
        <Link to="/dashboard" className="requests-back">
          ← Back to dashboard
        </Link>

        <header className="requests-heading">
          <div>
            <span className="requests-eyebrow">YOUR SKILL EXCHANGES</span>
            <h1>Skill requests</h1>
            <p>Manage requests and connect with people who want to learn.</p>
          </div>

          <Link to="/discover" className="find-partners-button">
            Find partners
          </Link>
        </header>

        <section className="requests-summary">
          <div>
            <span className="requests-summary-number">{pendingCount}</span>
            <span className="requests-summary-label">Pending incoming</span>
          </div>
          <div>
            <span className="requests-summary-number">
              {requests.filter((r) => r.status === 'Accepted').length}
            </span>
            <span className="requests-summary-label">Accepted</span>
          </div>
          <div>
            <span className="requests-summary-number">
              {requests.filter((r) => r.direction === 'outgoing').length}
            </span>
            <span className="requests-summary-label">Sent requests</span>
          </div>
        </section>

        <section className="requests-panel">
          <div className="requests-tabs">
            <button
              type="button"
              className={activeTab === 'incoming' ? 'active' : ''}
              onClick={() => setActiveTab('incoming')}
            >
              Incoming requests
            </button>
            <button
              type="button"
              className={activeTab === 'outgoing' ? 'active' : ''}
              onClick={() => setActiveTab('outgoing')}
            >
              Sent requests
            </button>
          </div>

          <div className="requests-list">
            {visibleRequests.length > 0 ? (
              visibleRequests.map((request) => (
                <article className="request-card" key={request.id}>
                  <div className={`request-avatar ${request.color}`}>
                    {request.initials}
                  </div>

                  <div className="request-details">
                    <h2>{request.name}</h2>
                    <p className="request-location">{request.location}</p>

                    <div className="request-skill-exchange">
                      <span className="request-teaches">
                        Teaches: {request.teaches}
                      </span>
                      <span className="request-exchange-icon">⇄</span>
                      <span className="request-wants">
                        Wants: {request.wants}
                      </span>
                    </div>

                    <p className="request-description">
                      {request.direction === 'incoming'
                        ? 'Would like to exchange skills with you.'
                        : 'Your skill exchange request.'}
                    </p>
                  </div>

                  <div className="request-actions">
                    <span
                      className={`request-status ${request.status.toLowerCase()}`}
                    >
                      {request.status}
                    </span>

                    {request.status === 'Pending' &&
                      request.direction === 'incoming' && (
                        <div className="request-action-buttons">
                          <button
                            type="button"
                            className="accept-request"
                            onClick={() => updateStatus(request.id, 'Accepted')}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="decline-request"
                            onClick={() => updateStatus(request.id, 'Declined')}
                          >
                            Decline
                          </button>
                        </div>
                      )}

                    {request.status === 'Pending' &&
                      request.direction === 'outgoing' && (
                        <button
                          type="button"
                          className="decline-request"
                          onClick={() => updateStatus(request.id, 'Cancelled')}
                        >
                          Cancel request
                        </button>
                      )}

                    <Link
                      to={`/profile/${request.id}`}
                      className="request-profile-link"
                    >
                      View profile →
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="requests-empty">
                <span>⇄</span>
                <h2>No requests here yet</h2>
                <p>
                  When you receive or send skill exchange requests, they will
                  appear here.
                </p>
                <Link to="/discover">Discover skill partners</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
