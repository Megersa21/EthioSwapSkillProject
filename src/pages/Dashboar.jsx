import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';

const partners = [
  {
    id: 1,
    initials: 'DA',
    name: 'Dawit A.',
    teaches: 'Teaches web dev',
    wants: 'Wants design',
    color: 'teal',
    mutualMatch: true,
  },
  {
    id: 2,
    initials: 'MT',
    name: 'Meron T.',
    teaches: 'Teaches JavaScript',
    wants: 'Wants English',
    color: 'yellow',
    mutualMatch: false,
  },
  {
    id: 3,
    initials: 'YB',
    name: 'Yonas B.',
    teaches: 'Teaches HTML and CSS',
    wants: '',
    color: 'gray',
    mutualMatch: false,
  },
];

const activities = [
  {
    id: 1,
    color: 'yellow',
    content: (
      <>
        Dawit sent you a request. <Link to="/requests">Respond</Link>
      </>
    ),
  },
  {
    id: 2,
    color: 'teal',
    content: 'Your request to Meron was accepted.',
  },
  {
    id: 3,
    color: 'gray',
    content: 'You can now review your swap with Yonas.',
  },
];

function Dashboard() {
  return (
    <div className="dashboard-page">
      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <h1>Hello, Sample</h1>
            <p>Here is what is happening with your swaps.</p>
          </div>

          <Link to="/add-skill" className="dashboard-add-skill">
            + Add a skill
          </Link>
        </section>

        <section className="next-session-banner">
          <div className="session-icon">
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="6" width="13" height="12" rx="2" />
              <path d="m16 10 5-3v10l-5-3" />
            </svg>
          </div>

          <div className="session-information">
            <span className="session-label">NEXT SESSION · TODAY 4:00 PM</span>
            <h2>Design ⇄ Web development with Dawit A.</h2>
            <p>Starts in 25 minutes</p>
          </div>

          <div className="session-actions">
            <Link to="/sessions" className="join-session-button">
              Join room
            </Link>
            <Link to="/sessions" className="all-sessions-button">
              All sessions
            </Link>
          </div>
        </section>

        <section className="dashboard-stats">
          <article className="stat-card">
            <h2>4</h2>
            <p>Active listings</p>
          </article>

          <article className="stat-card">
            <h2>2</h2>
            <p>Pending requests</p>
          </article>

          <article className="stat-card">
            <h2>3</h2>
            <p>New messages</p>
          </article>
        </section>

        <section className="dashboard-bottom-grid">
          <article className="dashboard-panel suggested-panel">
            <div className="panel-heading">
              <h2>Suggested partners</h2>
              <Link to="/discover">See all</Link>
            </div>

            <div className="suggested-partner-list">
              {partners.map((partner) => (
                <div className="suggested-partner" key={partner.id}>
                  <div className={`suggested-avatar ${partner.color}`}>
                    {partner.initials}
                  </div>

                  <div className="suggested-partner-info">
                    <h3>{partner.name}</h3>

                    <div className="partner-skill-tags">
                      <span className="partner-teaches">{partner.teaches}</span>

                      {partner.wants && (
                        <span className="partner-wants">{partner.wants}</span>
                      )}
                    </div>
                  </div>

                  {partner.mutualMatch && (
                    <span className="mutual-match">Mutual match</span>
                  )}

                  <Link
                    to={`/profile/${partner.id}`}
                    className="view-partner-button"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel activity-panel">
            <div className="panel-heading">
              <h2>Recent activity</h2>
            </div>

            <div className="activity-list">
              {activities.map((activity) => (
                <div className="activity-item" key={activity.id}>
                  <span className={`activity-dot ${activity.color}`} />
                  <p>{activity.content}</p>
                </div>
              ))}
            </div>

            <div className="dashboard-tip">
              Tip: complete skill lists get better partner suggestions.
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
