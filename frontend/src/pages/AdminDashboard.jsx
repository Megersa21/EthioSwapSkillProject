import { useMemo, useState } from 'react';
import '../styles/AdminDashboard.css';

const REPORTS_KEY = 'swapSkillAdminReports';
const USERS_KEY = 'swapSkillAdminUsers';
const AUDIT_KEY = 'swapSkillAdminAuditLog';

const INITIAL_REPORTS = [
  {
    id: 4001,
    target: 'Review #4001',
    reason: 'Abusive language',
    status: 'Open',
  },
  {
    id: 4002,
    target: 'Profile #102',
    reason: 'Misleading skill claims',
    status: 'Open',
  },
  {
    id: 4003,
    target: 'Message #30018',
    reason: 'Spam',
    status: 'Open',
  },
  {
    id: 4004,
    target: 'Profile #115',
    reason: 'Inappropriate content',
    status: 'Reviewed',
  },
  {
    id: 4005,
    target: 'Review #4012',
    reason: 'Suspicious activity',
    status: 'Dismissed',
  },
];

const INITIAL_USERS = [
  {
    id: 101,
    name: 'Hana Bekele',
    email: 'hana@example.com',
    status: 'Active',
  },
  {
    id: 102,
    name: 'Dawit Alemu',
    email: 'dawit@example.com',
    status: 'Active',
  },
  {
    id: 103,
    name: 'Sara Mohammed',
    email: 'sara@example.com',
    status: 'Suspended',
  },
  {
    id: 104,
    name: 'Yonas Tadesse',
    email: 'yonas@example.com',
    status: 'Active',
  },
];

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);

    if (saved === null) return fallback;

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save ${key}:`, error);
    return false;
  }
}

function createAuditEntry(action, details) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    details,
    date: new Date().toLocaleString(),
  };
}

function AdminDashboard() {
  const [activePage, setActivePage] = useState('Dashboard');

  const [reportFilter, setReportFilter] = useState('Open');

  const [reports, setReports] = useState(() =>
    readStorage(REPORTS_KEY, INITIAL_REPORTS),
  );

  const [users, setUsers] = useState(() =>
    readStorage(USERS_KEY, INITIAL_USERS),
  );

  const [auditLog, setAuditLog] = useState(() =>
    readStorage(AUDIT_KEY, [
      createAuditEntry(
        'Admin dashboard opened',
        'Demo administration session started.',
      ),
    ]),
  );

  const [userSearch, setUserSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [notice, setNotice] = useState('');

  const openReports = reports.filter((report) => report.status === 'Open');

  const activeListings = 342;
  const exchanges = 61;

  const filteredReports = useMemo(() => {
    if (reportFilter === 'All') return reports;

    return reports.filter((report) => report.status === reportFilter);
  }, [reports, reportFilter]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    if (!search) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        String(user.id).includes(search),
    );
  }, [users, userSearch]);

  function persistAudit(nextAudit) {
    if (!saveStorage(AUDIT_KEY, nextAudit)) {
      setNotice(
        'The action occurred, but its audit record could not be saved.',
      );
    }
  }

  function recordAction(action, details) {
    const entry = createAuditEntry(action, details);

    setAuditLog((current) => {
      const updated = [entry, ...current].slice(0, 500);
      persistAudit(updated);
      return updated;
    });
  }

  function updateReport(reportId, nextStatus) {
    const report = reports.find((item) => item.id === reportId);

    if (!report || report.status !== 'Open') return;

    const updated = reports.map((item) =>
      item.id === reportId ? { ...item, status: nextStatus } : item,
    );

    if (!saveStorage(REPORTS_KEY, updated)) {
      setNotice('Could not save the report update. Please try again.');
      return;
    }

    setReports(updated);

    const message = `${report.target} marked ${nextStatus.toLowerCase()}.`;

    setNotice(message);
    recordAction(`Report ${nextStatus.toLowerCase()}`, message);
  }

  function removeReport(reportId) {
    const report = reports.find((item) => item.id === reportId);

    if (!report) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${report.target} from the demo moderation list?\n\nThis removes the report entry from this dashboard. It does not delete real website content.`,
    );

    if (!confirmed) return;

    const updated = reports.filter((item) => item.id !== reportId);

    if (!saveStorage(REPORTS_KEY, updated)) {
      setNotice('Could not remove the report. Please try again.');
      return;
    }

    setReports(updated);

    const message = `${report.target} was removed from the demo moderation list.`;

    setNotice(message);
    recordAction('Report entry removed', message);
  }

  function toggleUserStatus(userId) {
    const user = users.find((item) => item.id === userId);

    if (!user) return;

    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';

    const updated = users.map((item) =>
      item.id === userId ? { ...item, status: nextStatus } : item,
    );

    if (!saveStorage(USERS_KEY, updated)) {
      setNotice('Could not save the account status. Please try again.');
      return;
    }

    setUsers(updated);

    const message = `${user.name}'s demo account is now ${nextStatus.toLowerCase()}.`;

    setNotice(message);
    recordAction(`Account ${nextStatus.toLowerCase()}`, message);
  }

  function findAccount(event) {
    event.preventDefault();

    setUserSearch(accountSearch);
    setActivePage('Users');

    setNotice(
      accountSearch.trim()
        ? `Showing account results for "${accountSearch.trim()}".`
        : 'Showing all demo accounts.',
    );
  }

  function navigate(page) {
    setActivePage(page);
    setNotice('');
  }

  function renderDashboard() {
    return (
      <>
        <h1 className="admin-page-title">Platform overview</h1>

        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <strong>{users.length === 4 ? 128 : users.length}</strong>
            <span>Registered users</span>
          </article>

          <article className="admin-stat-card">
            <strong>{activeListings}</strong>
            <span>Active listings</span>
          </article>

          <article className="admin-stat-card admin-stat-warning">
            <strong>{openReports.length}</strong>
            <span>Pending reports</span>
          </article>

          <article className="admin-stat-card">
            <strong>{exchanges}</strong>
            <span>Exchanges</span>
          </article>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Reports awaiting review</h2>

            <div className="admin-filter-tabs">
              {['Open', 'Reviewed', 'Dismissed'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={reportFilter === filter ? 'selected' : ''}
                  onClick={() => setReportFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="admin-report-name">{report.target}</td>

                    <td>{report.reason}</td>

                    <td>
                      <span
                        className={`admin-status status-${report.status.toLowerCase()}`}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td>
                      <div className="admin-row-actions">
                        {report.status === 'Open' ? (
                          <>
                            <button
                              type="button"
                              className="admin-button admin-button-review"
                              onClick={() =>
                                updateReport(report.id, 'Reviewed')
                              }
                            >
                              Review
                            </button>

                            <button
                              type="button"
                              className="admin-button admin-button-neutral"
                              onClick={() =>
                                updateReport(report.id, 'Dismissed')
                              }
                            >
                              Dismiss
                            </button>

                            <button
                              type="button"
                              className="admin-button admin-button-danger"
                              onClick={() => removeReport(report.id)}
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <span className="admin-completed-label">
                            No pending action
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="4" className="admin-no-results">
                      No reports in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="admin-panel-footnote">
            Every decision is recorded in the demo audit log.
          </p>
        </section>

        <section className="admin-account-search">
          <div>
            <h3>Manage accounts</h3>
            <p>Search for a user, then suspend or reactivate the account.</p>
          </div>

          <form onSubmit={findAccount} className="admin-search-form">
            <input
              value={accountSearch}
              onChange={(event) => setAccountSearch(event.target.value)}
              placeholder="Search by name or email"
              aria-label="Search accounts by name or email"
            />

            <button type="submit">Find</button>
          </form>
        </section>
      </>
    );
  }

  function renderUsers() {
    return (
      <>
        <h1 className="admin-page-title">Manage users</h1>

        <p className="admin-page-description">
          Search accounts and manage their demo status.
        </p>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>User accounts</h2>

            <span className="admin-count">{filteredUsers.length} users</span>
          </div>

          <div className="admin-users-search">
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search name, email, or user ID"
              aria-label="Search users"
            />
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="admin-report-name">
                      {user.name}
                      <small className="admin-user-id">ID: {user.id}</small>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <span
                        className={`admin-status status-${user.status.toLowerCase()}`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={`admin-button ${
                          user.status === 'Active'
                            ? 'admin-button-danger'
                            : 'admin-button-review'
                        }`}
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.status === 'Active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="admin-no-results">
                      No matching users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  function renderAuditLog() {
    return (
      <>
        <h1 className="admin-page-title">Audit log</h1>

        <p className="admin-page-description">
          A history of actions taken in this demo dashboard.
        </p>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Recent admin activity</h2>

            <span className="admin-count">{auditLog.length} events</span>
          </div>

          <div className="admin-audit-list">
            {auditLog.map((entry) => (
              <article className="admin-audit-item" key={entry.id}>
                <span className="admin-audit-dot" />

                <div>
                  <h3>{entry.action}</h3>
                  <p>{entry.details}</p>
                  <time>{entry.date}</time>
                </div>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon" aria-hidden="true">
            ⇄
          </span>
          <span>Admin</span>
        </div>

        <nav className="admin-navigation" aria-label="Admin navigation">
          {[
            { name: 'Dashboard', icon: '▦' },
            { name: 'Users', icon: '♙' },
            { name: 'Reports', icon: '⚑' },
            { name: 'Audit log', icon: '◷' },
          ].map((item) => (
            <button
              type="button"
              key={item.name}
              className={`admin-nav-item ${
                activePage === item.name ||
                (item.name === 'Reports' && activePage === 'Dashboard')
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                if (item.name === 'Reports') {
                  setReportFilter('Open');
                  navigate('Dashboard');
                } else {
                  navigate(item.name);
                }
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-online-dot" />
          Admin workspace
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-mobile-brand">SwapSkill / Admin</div>

        {notice && (
          <div className="admin-notice" role="status">
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

        {activePage === 'Dashboard' && renderDashboard()}
        {activePage === 'Users' && renderUsers()}
        {activePage === 'Audit log' && renderAuditLog()}
      </main>
    </div>
  );
}

export default AdminDashboard;
