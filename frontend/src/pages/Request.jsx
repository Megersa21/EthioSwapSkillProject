import { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/Requests.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Your session has expired. Please log in again.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'The request could not be completed.');
  }

  return data;
}

function formatDate(date) {
  if (!date) return 'Date unavailable';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable';
  }

  return parsedDate.toLocaleString();
}
function getStoredUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.userId ?? user?.id ?? user?.user?.id ?? null;
  } catch {
    return null;
  }
}

function Requests() {
  const [requests, setRequests] = useState([]);
  const [direction, setDirection] = useState('received');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentUserId = getStoredUserId();

  const isIncomingRequest = (request) => {
    if (direction === 'received') return true;
    if (direction === 'sent') return false;

    return (
      currentUserId !== null &&
      String(request.recipient_id) === String(currentUserId)
    );
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest(`/requests?direction=${direction}`);

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError(err.message || 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;

    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const handleDecision = async (requestId, action) => {
    const actionLabel = action === 'accept' ? 'accept' : 'reject';

    setBusyId(requestId);
    setError('');
    setSuccess('');

    try {
      const result = await apiRequest(`/requests/${requestId}/${action}`, {
        method: 'PATCH',
      });

      setSuccess(
        result.message ||
          `Swap request ${action === 'accept' ? 'accepted' : 'rejected'} successfully.`,
      );

      await loadRequests();
    } catch (err) {
      setError(err.message || `Could not ${actionLabel} this request.`);
    } finally {
      setBusyId(null);
    }
  };

  const getPartnerName = (request) =>
    isIncomingRequest(request)
      ? request.requester_name
      : request.recipient_name;

  const statusClass = (status) => {
    switch (status) {
      case 'accepted':
        return 'request-status accepted';
      case 'rejected':
        return 'request-status rejected';
      default:
        return 'request-status pending';
    }
  };

  return (
    <main className="requests-page">
      <section className="requests-header">
        <div>
          <span className="requests-eyebrow">YOUR SKILL EXCHANGE</span>
          <h1>Swap Requests</h1>
          <p>
            Manage incoming requests and track the skill swaps you have sent to
            other members.
          </p>
        </div>

        <button
          className="requests-refresh"
          type="button"
          onClick={loadRequests}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </section>

      <section className="requests-tabs" aria-label="Request direction">
        <button
          type="button"
          className={direction === 'received' ? 'active' : ''}
          onClick={() => {
            setDirection('received');
            setStatusFilter('all');
            setSuccess('');
          }}
        >
          Received
        </button>

        <button
          type="button"
          className={direction === 'sent' ? 'active' : ''}
          onClick={() => {
            setDirection('sent');
            setStatusFilter('all');
            setSuccess('');
          }}
        >
          Sent
        </button>

        <button
          type="button"
          className={direction === 'all' ? 'active' : ''}
          onClick={() => {
            setDirection('all');
            setStatusFilter('all');
            setSuccess('');
          }}
        >
          All requests
        </button>
      </section>

      <section className="requests-toolbar">
        <label htmlFor="request-status">Filter by status</label>

        <select
          id="request-status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>

        <span className="requests-count">
          {filteredRequests.length}{' '}
          {filteredRequests.length === 1 ? 'request' : 'requests'}
        </span>
      </section>

      {error && (
        <div className="requests-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="requests-alert success" role="status">
          {success}
        </div>
      )}

      {loading ? (
        <div className="requests-empty">
          <p>Loading your requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="requests-empty">
          <div className="requests-empty-icon">⇄</div>
          <h2>No requests found</h2>
          <p>
            {direction === 'received'
              ? 'When another member requests a skill swap with you, it will appear here.'
              : direction === 'sent'
                ? 'Requests you send to other members will appear here.'
                : 'Your incoming and sent requests will appear here.'}
          </p>
        </div>
      ) : (
        <section className="requests-list">
          {filteredRequests.map((request) => {
            const isIncoming = isIncomingRequest(request);
            const isPending = request.status === 'pending';
            const isBusy = busyId === request.id;

            return (
              <article className="request-card" key={request.id}>
                <div className="request-card-top">
                  <div className="request-person">
                    <div className="request-avatar">
                      {(getPartnerName(request) || '?')
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h2>
                        {getPartnerName(request) || 'EthioSwapSkill member'}
                      </h2>
                      <p>
                        {isIncoming
                          ? 'Sent you a swap request'
                          : direction === 'sent'
                            ? 'You sent a swap request'
                            : `Request #${request.id}`}
                      </p>
                    </div>
                  </div>

                  <span className={statusClass(request.status)}>
                    {request.status || 'pending'}
                  </span>
                </div>

                <div className="request-swap-details">
                  <div className="request-skill-box">
                    <span>{isIncoming ? 'THEY OFFER' : 'YOU OFFER'}</span>
                    <strong>
                      {request.offered_skill_name || 'Skill not available'}
                    </strong>
                  </div>

                  <div className="request-swap-arrow" aria-hidden="true">
                    ⇄
                  </div>

                  <div className="request-skill-box">
                    <span>{isIncoming ? 'THEY WANT' : 'YOU WANT'}</span>
                    <strong>
                      {request.wanted_skill_name || 'Skill not available'}
                    </strong>
                  </div>
                </div>

                {request.message && (
                  <div className="request-message">
                    <span>Message</span>
                    <p>{request.message}</p>
                  </div>
                )}

                <div className="request-card-bottom">
                  <span className="request-date">
                    {formatDate(request.created_at)}
                  </span>

                  {isIncoming && isPending && (
                    <div className="request-actions">
                      <button
                        type="button"
                        className="request-reject"
                        onClick={() => handleDecision(request.id, 'reject')}
                        disabled={isBusy}
                      >
                        {isBusy ? 'Please wait...' : 'Reject'}
                      </button>

                      <button
                        type="button"
                        className="request-accept"
                        onClick={() => handleDecision(request.id, 'accept')}
                        disabled={isBusy}
                      >
                        {isBusy ? 'Please wait...' : 'Accept'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default Requests;
