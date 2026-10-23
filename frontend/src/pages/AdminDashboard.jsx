import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSettings from './AdminSettings';
import '../styles/AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const THEME_STORAGE_KEY = 'ethioSwapSkillDarkMode';

function readDarkModePreference() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'true';
  } catch {
    return document.documentElement.dataset.theme === 'dark';
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function getArray(result, key = 'data') {
  if (Array.isArray(result?.[key])) return result[key];
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

async function adminFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Your login session was not found. Please log in again.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message ||
        (response.status === 401
          ? 'Your session has expired. Please log in again.'
          : response.status === 403
            ? 'You do not have permission to perform this action.'
            : `Request failed (${response.status}).`),
    );
  }

  return result;
}

function statusClass(status) {
  if (status === 'active') return 'status-active';

  if (status === 'resolved' || status === 'reviewed' || status === 'read') {
    return 'status-reviewed';
  }

  if (status === 'suspended' || status === 'pending' || status === 'new') {
    return 'status-pending';
  }

  return 'status-rejected';
}

function AdminDashboard() {
  const location = useLocation();

  const [activePage, setActivePage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('section') === 'settings' ? 'Settings' : 'Dashboard';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(readDarkModePreference);

  const [currentRole, setCurrentRole] = useState('');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [administrators, setAdministrators] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [contactStatusFilter, setContactStatusFilter] = useState('all');
  const [contactLoading, setContactLoading] = useState(false);
  const [updatingContactId, setUpdatingContactId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportFilter, setReportFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [adminForm, setAdminForm] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [savingReportId, setSavingReportId] = useState(null);
  const [changingAccountId, setChangingAccountId] = useState(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSuperAdmin = currentRole === 'super_admin';

  function toggleDarkMode() {
    const nextDarkMode = !darkMode;
    document.documentElement.dataset.theme = nextDarkMode ? 'dark' : 'light';
    setDarkMode(nextDarkMode);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, String(nextDarkMode));
    } catch {
      setError('Could not save the appearance preference in this browser.');
    }
  }

  // Keep the dashboard section synchronized with the URL.
  // This lets the account dropdown open the existing Settings component.
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('section') === 'settings') {
      setActivePage('Settings');
    } else {
      setActivePage((current) =>
        current === 'Settings' ? 'Dashboard' : current,
      );
    }
  }, [location.search]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [verifyResult, statsResult, usersResult] = await Promise.all([
        adminFetch('/admin/verify'),
        adminFetch('/admin/stats'),
        adminFetch('/admin/users'),
      ]);

      setCurrentRole(verifyResult.admin?.role || '');
      setStats(statsResult.data ?? statsResult.stats ?? null);
      setUsers(getArray(usersResult));
    } catch (err) {
      console.error('Could not load admin dashboard:', err);
      setError(err.message || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setError('');

    try {
      const result = await adminFetch('/admin/reports');
      setReports(getArray(result));
    } catch (err) {
      console.error('Could not load reports:', err);
      setError(err.message || 'Could not load reports.');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setError('');

    try {
      const result = await adminFetch('/admin/audit-logs');
      setAuditLogs(getArray(result));
    } catch (err) {
      console.error('Could not load audit log:', err);
      setError(err.message || 'Could not load audit log.');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const loadContactMessages = useCallback(async () => {
    setContactLoading(true);
    setError('');

    try {
      const result = await adminFetch(
        `/admin/contact-messages?status=${encodeURIComponent(contactStatusFilter)}`,
      );

      setContactMessages(getArray(result));
    } catch (err) {
      console.error('Could not load contact messages:', err);
      setError(err.message || 'Could not load contact messages.');
    } finally {
      setContactLoading(false);
    }
  }, [contactStatusFilter]);

  useEffect(() => {
    if (activePage === 'Contact Messages') {
      loadContactMessages();
    }
  }, [activePage, loadContactMessages]);

  const loadAdministrators = useCallback(async () => {
    if (currentRole !== 'super_admin') return;

    setAdminsLoading(true);
    setError('');

    try {
      const result = await adminFetch('/admin/administrators');
      setAdministrators(
        Array.isArray(result.admins) ? result.admins : getArray(result),
      );
    } catch (err) {
      console.error('Could not load administrators:', err);
      setError(err.message || 'Could not load administrator accounts.');
    } finally {
      setAdminsLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (activePage === 'Reports') loadReports();
    if (activePage === 'Audit log') loadAuditLogs();
  }, [activePage, loadReports, loadAuditLogs]);

  useEffect(() => {
    if (activePage === 'Administrators' && isSuperAdmin) {
      loadAdministrators();
    }
  }, [activePage, isSuperAdmin, loadAdministrators]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    if (!search) return users;

    return users.filter((user) =>
      [
        user.full_name,
        user.email,
        user.id,
        user.role,
        user.account_status,
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search),
      ),
    );
  }, [users, userSearch]);

  const recentUsers = useMemo(
    () =>
      [...users]
        .sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        )
        .slice(0, 5),
    [users],
  );

  const filteredReports = useMemo(() => {
    const search = reportSearch.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus =
        reportFilter === 'all' || report.status === reportFilter;

      const matchesSearch = [
        report.id,
        report.report_type,
        report.description,
        report.status,
        report.reporter_name,
        report.reported_user_name,
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search),
      );

      return matchesStatus && matchesSearch;
    });
  }, [reports, reportSearch, reportFilter]);

  function navigate(page) {
    setActivePage(page);
    setMobileNavOpen(false);
    setNotice('');
    setError('');

    // Remove the Settings query parameter when navigating to another section.
    if (page !== 'Settings' && location.search) {
      window.history.replaceState({}, '', '/admin');
    }
  }

  function findAccount(event) {
    event.preventDefault();
    setUserSearch(accountSearch);
    setActivePage('Users');
    setNotice(
      accountSearch.trim()
        ? `Showing account results for "${accountSearch.trim()}".`
        : 'Showing all registered accounts.',
    );
  }

  async function changeUserStatus(user, nextStatus) {
    const actionText =
      nextStatus === 'active'
        ? 'restore'
        : nextStatus === 'banned'
          ? 'ban'
          : 'suspend';

    if (
      !window.confirm(
        `Are you sure you want to ${actionText} ${user.full_name}'s account?`,
      )
    ) {
      return;
    }

    setChangingAccountId(user.id);
    setError('');
    setNotice('');

    try {
      const result = await adminFetch(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      const updatedUser = result.user;

      setUsers((current) =>
        current.map((item) =>
          String(item.id) === String(user.id)
            ? { ...item, ...(updatedUser || {}), account_status: nextStatus }
            : item,
        ),
      );

      setNotice(
        result.message || `${user.full_name}'s account is now ${nextStatus}.`,
      );

      await loadAuditLogsIfVisible();
    } catch (err) {
      setError(err.message || 'Could not update this account.');
    } finally {
      setChangingAccountId(null);
    }
  }

  async function deleteUser(user) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this account?\n\n` +
        `Name: ${user.full_name}\n` +
        `Email: ${user.email}\n\n` +
        `This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingUserId(user.id);
    setError('');
    setNotice('');

    try {
      const result = await adminFetch(`/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      setUsers((current) =>
        current.filter((item) => String(item.id) !== String(user.id)),
      );

      setNotice(result.message || 'User deleted successfully.');
    } catch (error) {
      setError(error.message || 'Failed to delete this user.');
    } finally {
      setDeletingUserId(null);
    }
  }

  async function loadAuditLogsIfVisible() {
    if (activePage === 'Audit log') {
      await loadAuditLogs();
    }
  }

  async function changeRole(user, nextRole) {
    if (user.role === nextRole) return;

    if (
      !window.confirm(
        `Change ${user.full_name}'s role from ${user.role} to ${nextRole}? Their existing login tokens will be invalidated.`,
      )
    ) {
      return;
    }

    setChangingAccountId(user.id);
    setError('');
    setNotice('');

    try {
      const result = await adminFetch(`/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });

      setUsers((current) =>
        current.map((item) =>
          String(item.id) === String(user.id)
            ? { ...item, ...(result.user || {}), role: nextRole }
            : item,
        ),
      );

      setNotice(result.message || 'Account role updated successfully.');

      await loadAdminData();

      if (activePage === 'Administrators') {
        await loadAdministrators();
      }

      await loadAuditLogsIfVisible();
    } catch (err) {
      setError(err.message || 'Could not change this account role.');
    } finally {
      setChangingAccountId(null);
    }
  }

  async function createAdministrator(event) {
    event.preventDefault();

    if (!isSuperAdmin) {
      setError('Only a super administrator can create administrator accounts.');
      return;
    }

    setCreatingAdmin(true);
    setError('');
    setNotice('');

    try {
      const result = await adminFetch('/admin/administrators', {
        method: 'POST',
        body: JSON.stringify(adminForm),
      });

      setNotice(result.message || 'Administrator account created.');
      setAdminForm({ full_name: '', email: '', password: '' });

      await loadAdministrators();
      await loadAdminData();
      await loadAuditLogsIfVisible();
    } catch (err) {
      setError(err.message || 'Could not create administrator account.');
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function updateReport(report) {
    setSavingReportId(report.id);
    setError('');
    setNotice('');

    try {
      const result = await adminFetch(`/admin/reports/${report.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: report.status,
          admin_notes: report.admin_notes ?? '',
        }),
      });

      setReports((current) =>
        current.map((item) =>
          item.id === report.id ? { ...item, ...(result.data || {}) } : item,
        ),
      );

      setNotice(`Report #${report.id} was updated successfully.`);
      await loadAuditLogsIfVisible();
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Could not update this report.');
    } finally {
      setSavingReportId(null);
    }
  }

  function updateReportField(reportId, field, value) {
    setReports((current) =>
      current.map((report) =>
        report.id === reportId ? { ...report, [field]: value } : report,
      ),
    );
  }

  function renderDashboard() {
    return (
      <>
        <div className="admin-page-heading-row">
          <div>
            <h1 className="admin-page-title">Platform overview</h1>
            <p className="admin-page-description">
              Live information from your EthioSwapSkill database.
            </p>
          </div>

          <button
            type="button"
            className="admin-button admin-button-review"
            onClick={loadAdminData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>

        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <strong>{stats ? stats.totalUsers : '—'}</strong>
            <span>Registered users</span>
          </article>
          <article className="admin-stat-card">
            <strong>{stats ? stats.totalSkills : '—'}</strong>
            <span>Skill listings</span>
          </article>
          <article className="admin-stat-card">
            <strong>{stats ? stats.totalRequests : '—'}</strong>
            <span>Total swap requests</span>
          </article>
          <article className="admin-stat-card">
            <strong>{stats ? stats.completedSessions : '—'}</strong>
            <span>Completed sessions</span>
          </article>
        </section>

        {loading && !stats && (
          <section className="admin-panel">
            <p>Loading platform statistics...</p>
          </section>
        )}

        {stats && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Platform activity</h2>
              <span className="admin-count">Live database data</span>
            </div>

            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <strong>{stats.totalSessions}</strong>
                <span>Total sessions</span>
              </article>
              <article className="admin-stat-card">
                <strong>{stats.totalReviews}</strong>
                <span>Reviews submitted</span>
              </article>
              <article className="admin-stat-card">
                <strong>{stats.unreadNotifications}</strong>
                <span>Unread notifications</span>
              </article>
              <article className="admin-stat-card">
                <strong>{stats.pendingReports ?? 0}</strong>
                <span>Pending reports</span>
              </article>
            </div>
          </section>
        )}

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Recently registered users</h2>
            <button
              type="button"
              className="admin-button admin-button-review"
              onClick={() => navigate('Users')}
            >
              View all users
            </button>
          </div>

          <div className="admin-table-wrap">
            <table
              className="admin-table admin-users-table"
              aria-label="Recently registered users"
            >
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="admin-report-name" data-label="User">
                      {user.full_name}
                      <small className="admin-user-id">ID: {user.id}</small>
                    </td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Role">
                      <span
                        className={`admin-status ${statusClass(
                          user.role === 'admin' || user.role === 'super_admin'
                            ? 'reviewed'
                            : 'active',
                        )}`}
                      >
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td data-label="Joined">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
                {!loading && recentUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="admin-no-results">
                      No registered users were found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-account-search">
          <div>
            <h3>Find an account</h3>
            <p>Search the real user records in your database.</p>
          </div>
          <form onSubmit={findAccount} className="admin-search-form">
            <input
              value={accountSearch}
              onChange={(event) => setAccountSearch(event.target.value)}
              placeholder="Search by name, email, or ID"
              aria-label="Search accounts by name, email, or ID"
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
          Manage ordinary user accounts. Account changes are recorded in the
          audit log.
        </p>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>User accounts</h2>
            <span className="admin-count">{filteredUsers.length} accounts</span>
          </div>

          <div className="admin-users-search">
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search name, email, role, status, or ID"
              aria-label="Search registered users"
            />
          </div>

          <div className="admin-table-wrap">
            <table
              className="admin-table admin-users-table"
              aria-label="User accounts"
            >
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Account status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                  {isSuperAdmin && <th>Change role</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const accountStatus = user.account_status || 'active';
                  const isOrdinaryUser = user.role === 'user';
                  const isChanging = changingAccountId === user.id;

                  return (
                    <tr key={user.id}>
                      <td className="admin-report-name" data-label="User">
                        {user.full_name}
                        <small className="admin-user-id">ID: {user.id}</small>
                      </td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Role">
                        <span
                          className={`admin-status ${statusClass(
                            user.role === 'user' ? 'active' : 'reviewed',
                          )}`}
                        >
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td data-label="Account status">
                        <span
                          className={`admin-status ${statusClass(accountStatus)}`}
                        >
                          {accountStatus}
                        </span>
                      </td>
                      <td data-label="Joined">
                        {formatDate(user.created_at)}
                      </td>
                      <td data-label="Actions">
                        {isOrdinaryUser ? (
                          <div
                            className="admin-user-actions"
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            {accountStatus === 'active' ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-button admin-button-review"
                                  disabled={isChanging}
                                  onClick={() =>
                                    changeUserStatus(user, 'suspended')
                                  }
                                >
                                  Suspend
                                </button>
                                <button
                                  type="button"
                                  className="admin-button"
                                  disabled={isChanging}
                                  onClick={() =>
                                    changeUserStatus(user, 'banned')
                                  }
                                >
                                  Ban
                                </button>
                                <button
                                  type="button"
                                  className="admin-button admin-button-delete"
                                  disabled={
                                    isChanging || deletingUserId === user.id
                                  }
                                  onClick={() => deleteUser(user)}
                                >
                                  {deletingUserId === user.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </button>
                              </>
                            ) : accountStatus === 'suspended' ||
                              accountStatus === 'banned' ? (
                              <button
                                type="button"
                                className="admin-button admin-button-review"
                                disabled={isChanging}
                                onClick={() => changeUserStatus(user, 'active')}
                              >
                                Restore
                              </button>
                            ) : (
                              <span>Deactivated</span>
                            )}
                          </div>
                        ) : (
                          <span>Admin account</span>
                        )}
                      </td>

                      {isSuperAdmin && (
                        <td data-label="Change role">
                          <select
                            aria-label={`Change role for ${user.full_name}`}
                            value={user.role}
                            disabled={isChanging}
                            onChange={(event) =>
                              changeRole(user, event.target.value)
                            }
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={isSuperAdmin ? 7 : 6}
                      className="admin-no-results"
                    >
                      No matching accounts found.
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

  function renderAdministrators() {
    return (
      <>
        <h1 className="admin-page-title">Administrator management</h1>
        <p className="admin-page-description">
          Super-admin-only tools for creating and managing administrator
          accounts.
        </p>

        {!isSuperAdmin && (
          <section className="admin-panel">
            <p>Only a super administrator can manage administrator accounts.</p>
          </section>
        )}

        {isSuperAdmin && (
          <>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Create an administrator</h2>
              </div>

              <form
                onSubmit={createAdministrator}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                <input
                  required
                  maxLength={100}
                  value={adminForm.full_name}
                  onChange={(event) =>
                    setAdminForm((form) => ({
                      ...form,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="Full name"
                  aria-label="New administrator full name"
                />
                <input
                  required
                  type="email"
                  maxLength={255}
                  value={adminForm.email}
                  onChange={(event) =>
                    setAdminForm((form) => ({
                      ...form,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Email address"
                  aria-label="New administrator email"
                />
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={adminForm.password}
                  onChange={(event) =>
                    setAdminForm((form) => ({
                      ...form,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Temporary password (8+ characters)"
                  aria-label="New administrator password"
                />
                <button
                  type="submit"
                  className="admin-button admin-button-review"
                  disabled={creatingAdmin}
                >
                  {creatingAdmin ? 'Creating...' : 'Create administrator'}
                </button>
              </form>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Administrator accounts</h2>
                <button
                  type="button"
                  className="admin-button admin-button-review"
                  disabled={adminsLoading}
                  onClick={loadAdministrators}
                >
                  {adminsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {adminsLoading && <p>Loading administrator accounts...</p>}

              {!adminsLoading && administrators.length === 0 && (
                <p className="admin-no-results">
                  No administrator accounts were returned.
                </p>
              )}

              {!adminsLoading && administrators.length > 0 && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Administrator</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {administrators.map((admin) => (
                        <tr key={admin.id}>
                          <td className="admin-report-name">
                            {admin.full_name}
                            <small className="admin-user-id">
                              ID: {admin.id}
                            </small>
                          </td>
                          <td>{admin.email}</td>
                          <td>{admin.role}</td>
                          <td>
                            <span
                              className={`admin-status ${statusClass(
                                admin.account_status || 'active',
                              )}`}
                            >
                              {admin.account_status || 'active'}
                            </span>
                          </td>
                          <td>{formatDate(admin.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </>
    );
  }

  function renderReports() {
    return (
      <>
        <div className="admin-page-heading-row">
          <div>
            <h1 className="admin-page-title">Reports</h1>
            <p className="admin-page-description">
              Review reports stored in your PostgreSQL database.
            </p>
          </div>
          <button
            type="button"
            className="admin-button admin-button-review"
            onClick={loadReports}
            disabled={reportsLoading}
          >
            {reportsLoading ? 'Loading...' : 'Refresh reports'}
          </button>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Report management</h2>
            <span className="admin-count">
              {filteredReports.length} reports
            </span>
          </div>

          <div className="admin-users-search">
            <input
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              placeholder="Search reports, users, descriptions, or IDs"
              aria-label="Search reports"
            />
            <select
              value={reportFilter}
              onChange={(event) => setReportFilter(event.target.value)}
              aria-label="Filter reports by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {reportsLoading && <p>Loading reports...</p>}

          {!reportsLoading && reports.length === 0 && (
            <p className="admin-no-results">
              No reports have been submitted yet. Reports will appear here when
              users submit them.
            </p>
          )}

          {!reportsLoading && filteredReports.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table admin-reports-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Reporter</th>
                    <th>Reported user</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th>Admin notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td data-label="Report">
                        <strong>#{report.id}</strong>
                        <small className="admin-user-id">
                          {report.report_type}
                        </small>
                        <small className="admin-user-id">
                          {formatDate(report.created_at)}
                        </small>
                      </td>
                      <td data-label="Reporter">
                        {report.reporter_name || 'Unknown'}
                        <small className="admin-user-id">
                          ID: {report.reporter_id ?? '—'}
                        </small>
                      </td>
                      <td data-label="Reported user">
                        {report.reported_user_name || 'Not specified'}
                        <small className="admin-user-id">
                          ID: {report.reported_user_id ?? '—'}
                        </small>
                      </td>
                      <td data-label="Details">
                        <div className="admin-report-description">
                          {report.description}
                        </div>
                      </td>
                      <td data-label="Status">
                        <select
                          value={report.status}
                          onChange={(event) =>
                            updateReportField(
                              report.id,
                              'status',
                              event.target.value,
                            )
                          }
                          aria-label={`Status for report ${report.id}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="resolved">Resolved</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </td>
                      <td data-label="Admin notes">
                        <textarea
                          value={report.admin_notes ?? ''}
                          onChange={(event) =>
                            updateReportField(
                              report.id,
                              'admin_notes',
                              event.target.value,
                            )
                          }
                          rows={3}
                          placeholder="Add admin notes..."
                          aria-label={`Admin notes for report ${report.id}`}
                        />
                      </td>
                      <td data-label="Action">
                        <button
                          type="button"
                          className="admin-button admin-button-review"
                          disabled={savingReportId === report.id}
                          onClick={() => updateReport(report)}
                        >
                          {savingReportId === report.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  function renderAuditLog() {
    return (
      <>
        <div className="admin-page-heading-row">
          <div>
            <h1 className="admin-page-title">Audit log</h1>
            <p className="admin-page-description">
              Persistent history of recorded administrator actions.
            </p>
          </div>
          <button
            type="button"
            className="admin-button admin-button-review"
            onClick={loadAuditLogs}
            disabled={auditLoading}
          >
            {auditLoading ? 'Loading...' : 'Refresh log'}
          </button>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Admin activity history</h2>
            <span className="admin-count">{auditLogs.length} entries</span>
          </div>

          {auditLoading && <p>Loading audit log...</p>}

          {!auditLoading && auditLogs.length === 0 && (
            <p className="admin-no-results">
              No administrative actions have been recorded yet.
            </p>
          )}

          {!auditLoading && auditLogs.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table admin-audit-table">
                <thead>
                  <tr>
                    <th>Date and time</th>
                    <th>Administrator</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td data-label="Date and time">
                        {formatDate(entry.created_at)}
                      </td>
                      <td data-label="Administrator">
                        {entry.admin_name || 'Former/unavailable account'}
                        <small className="admin-user-id">
                          {entry.admin_email || `ID: ${entry.admin_id ?? '—'}`}
                        </small>
                      </td>
                      <td data-label="Action">
                        {String(entry.action).replaceAll('_', ' ')}
                      </td>
                      <td data-label="Target">
                        {entry.target_type || '—'}
                        {entry.target_id != null ? ` #${entry.target_id}` : ''}
                      </td>
                      <td data-label="Details">
                        <pre className="admin-audit-details">
                          {JSON.stringify(entry.details || {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  async function updateContactStatus(contact, nextStatus) {
    if (!contact?.id) {
      setError('Invalid contact message.');
      return;
    }

    if (!['read', 'resolved'].includes(nextStatus)) {
      setError('Invalid contact message status.');
      return;
    }

    setUpdatingContactId(contact.id);
    setError('');
    setNotice('');

    try {
      const action = nextStatus === 'read' ? 'read' : 'resolve';

      const result = await adminFetch(
        `/admin/contact-messages/${contact.id}/${action}`,
        { method: 'PATCH' },
      );

      setContactMessages((current) =>
        current.map((item) =>
          String(item.id) === String(contact.id)
            ? {
                ...item,
                ...(result.data || {}),
                status: nextStatus,
              }
            : item,
        ),
      );

      setNotice(
        result.message ||
          (nextStatus === 'read'
            ? 'Message marked as read.'
            : 'Message resolved successfully.'),
      );

      // Refresh the current filter after the update.
      await loadContactMessages();
    } catch (err) {
      console.error('Could not update contact message:', err);
      setError(err.message || 'Could not update this contact message.');
    } finally {
      setUpdatingContactId(null);
    }
  }

  function renderContactMessages() {
    const newCount = contactMessages.filter(
      (message) => message.status === 'new',
    ).length;

    const selectedMessage = selectedContact
      ? contactMessages.find(
          (message) => String(message.id) === String(selectedContact.id),
        ) || selectedContact
      : null;

    return (
      <>
        <div className="admin-page-heading-row">
          <div>
            <h1 className="admin-page-title">Contact Messages</h1>
            <p className="admin-page-description">
              Read messages from the EthioSwapSkill Contact Us page and respond
              to users.
            </p>
          </div>

          <button
            type="button"
            className="admin-button admin-button-review"
            onClick={loadContactMessages}
            disabled={contactLoading}
          >
            {contactLoading ? 'Refreshing...' : 'Refresh messages'}
          </button>
        </div>

        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <strong>{contactMessages.length}</strong>
            <span>Messages displayed</span>
          </article>

          <article className="admin-stat-card">
            <strong>{newCount}</strong>
            <span>New messages displayed</span>
          </article>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Inbox</h2>

            <select
              value={contactStatusFilter}
              onChange={(event) => {
                setContactStatusFilter(event.target.value);
                setSelectedContact(null);
              }}
              aria-label="Filter contact messages by status"
            >
              <option value="all">All messages</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {contactLoading && <p>Loading contact messages...</p>}

          {!contactLoading && contactMessages.length === 0 && (
            <p className="admin-no-results">
              No messages found for this filter.
            </p>
          )}

          {!contactLoading && contactMessages.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table admin-contact-table">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Topic</th>
                    <th>Message</th>
                    <th>Received</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {contactMessages.map((contact) => {
                    const updating =
                      String(updatingContactId) === String(contact.id);

                    return (
                      <tr key={contact.id}>
                        <td className="admin-report-name" data-label="Sender">
                          {contact.name}
                          <a
                            href={`mailto:${contact.email}`}
                            style={{
                              display: 'block',
                              marginTop: 5,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {contact.email}
                          </a>
                        </td>

                        <td data-label="Topic">{contact.topic}</td>

                        <td data-label="Message">
                          <div
                            style={{
                              minWidth: 180,
                              maxWidth: 300,
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {contact.message.length > 100
                              ? `${contact.message.slice(0, 100)}...`
                              : contact.message}
                          </div>
                        </td>

                        <td data-label="Received">
                          {formatDate(contact.created_at)}
                        </td>

                        <td data-label="Status">
                          <span
                            className={`admin-status ${statusClass(
                              contact.status,
                            )}`}
                          >
                            {contact.status}
                          </span>
                        </td>

                        <td data-label="Actions">
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            <button
                              type="button"
                              className="admin-button admin-button-review"
                              onClick={() => setSelectedContact(contact)}
                            >
                              View details
                            </button>

                            {contact.status === 'new' && (
                              <button
                                type="button"
                                className="admin-button admin-button-review"
                                disabled={updating}
                                onClick={() =>
                                  updateContactStatus(contact, 'read')
                                }
                              >
                                {updating ? 'Saving...' : 'Mark read'}
                              </button>
                            )}

                            {contact.status !== 'resolved' && (
                              <button
                                type="button"
                                className="admin-button"
                                disabled={updating}
                                onClick={() =>
                                  updateContactStatus(contact, 'resolved')
                                }
                              >
                                {updating ? 'Saving...' : 'Resolve'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedMessage && (
          <div
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedContact(null);
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(8, 15, 30, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              overflowY: 'auto',
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="contact-details-title"
              className="admin-panel admin-contact-dialog"
              style={{
                width: '100%',
                maxWidth: 650,
                maxHeight: '90vh',
                overflowY: 'auto',
                margin: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="admin-panel-heading">
                <h2 id="contact-details-title">Message details</h2>

                <button
                  type="button"
                  className="admin-button"
                  onClick={() => setSelectedContact(null)}
                  aria-label="Close message details"
                >
                  Close ×
                </button>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <strong>From</strong>
                  <p style={{ margin: '5px 0' }}>{selectedMessage.name}</p>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {selectedMessage.email}
                  </a>
                </div>

                <div>
                  <strong>Topic</strong>
                  <p style={{ margin: '5px 0' }}>{selectedMessage.topic}</p>
                </div>

                <div>
                  <strong>Received</strong>
                  <p style={{ margin: '5px 0' }}>
                    {formatDate(selectedMessage.created_at)}
                  </p>
                </div>

                <div>
                  <strong>Status</strong>
                  <p>
                    <span
                      className={`admin-status ${statusClass(
                        selectedMessage.status,
                      )}`}
                    >
                      {selectedMessage.status}
                    </span>
                  </p>
                </div>

                <div>
                  <strong>Full message</strong>
                  <div
                    style={{
                      marginTop: 8,
                      padding: 16,
                      borderRadius: 10,
                      border: '1px solid var(--admin-border, #d8dee9)',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.7,
                    }}
                  >
                    {selectedMessage.message}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginTop: 8,
                  }}
                >
                  <a
                    className="admin-button admin-button-review"
                    href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(
                      `Re: ${selectedMessage.topic}`,
                    )}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    Reply by email
                  </a>

                  {selectedMessage.status === 'new' && (
                    <button
                      type="button"
                      className="admin-button admin-button-review"
                      disabled={
                        String(updatingContactId) === String(selectedMessage.id)
                      }
                      onClick={async () => {
                        await updateContactStatus(selectedMessage, 'read');
                        setSelectedContact((current) =>
                          current &&
                          String(current.id) === String(selectedMessage.id)
                            ? { ...current, status: 'read' }
                            : current,
                        );
                      }}
                    >
                      Mark as read
                    </button>
                  )}

                  {selectedMessage.status !== 'resolved' && (
                    <button
                      type="button"
                      className="admin-button"
                      disabled={
                        String(updatingContactId) === String(selectedMessage.id)
                      }
                      onClick={async () => {
                        await updateContactStatus(selectedMessage, 'resolved');
                        setSelectedContact((current) =>
                          current &&
                          String(current.id) === String(selectedMessage.id)
                            ? { ...current, status: 'resolved' }
                            : current,
                        );
                      }}
                    >
                      Resolve message
                    </button>
                  )}
                </div>

                <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 0 }}>
                  Reply by email opens your configured email application. You
                  can review and send the reply there.
                </p>
              </div>
            </section>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="admin-layout">
      {mobileNavOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close admin navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar ${
          mobileNavOpen ? 'admin-sidebar-open' : ''
        }`}
      >
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <span className="admin-brand-icon" aria-hidden="true">
              ⇄
            </span>
            <span>Admin</span>
          </div>
          <button
            type="button"
            className="admin-sidebar-close"
            aria-label="Close admin navigation"
            onClick={() => setMobileNavOpen(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav
          className="admin-navigation"
          id="admin-navigation"
        >
          {[
            { name: 'Dashboard', icon: '▦' },
            { name: 'Users', icon: '♙' },
            { name: 'Reports', icon: '⚑' },
            { name: 'Contact Messages', icon: '✉' },
            { name: 'Audit log', icon: '◷' },
            ...(isSuperAdmin ? [{ name: 'Administrators', icon: '♜' }] : []),
          ].map((item) => (
            <button
              key={item.name}
              type="button"
              className={`admin-nav-item ${
                activePage === item.name ? 'active' : ''
              }`}
              onClick={() => navigate(item.name)}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-online-dot" />
          {isSuperAdmin ? 'Super admin workspace' : 'Admin workspace'}
        </div>

        <button
          type="button"
          className="admin-theme-toggle"
          onClick={toggleDarkMode}
          aria-pressed={darkMode}
        >
          <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
          {darkMode ? 'Light mode' : 'Dark mode'}
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-mobile-bar">
          <button
            type="button"
            className="admin-menu-toggle"
            aria-label="Open admin navigation"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <span>{activePage}</span>
        </div>
        <div className="admin-mobile-brand">EthioSwapSkill / Admin</div>

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

        {error && (
          <div className="admin-notice" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {activePage === 'Dashboard' && renderDashboard()}
        {activePage === 'Users' && renderUsers()}
        {activePage === 'Reports' && renderReports()}
        {activePage === 'Contact Messages' && renderContactMessages()}
        {activePage === 'Audit log' && renderAuditLog()}
        {activePage === 'Administrators' && renderAdministrators()}
        {activePage === 'Settings' && <AdminSettings />}
      </main>
    </div>
  );
}

export default AdminDashboard;
