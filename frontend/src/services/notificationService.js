const API_URL = 'http://localhost:5000/api/notifications';

function getAuthHeaders() {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Please log in to view your notifications.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function request(endpoint = '', options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to load notifications.');
  }

  return result;
}

export function getNotifications() {
  return request();
}

export async function getUnreadNotificationCount() {
  const result = await request('/unread-count');
  return result.unread_count;
}

export function markNotificationAsRead(id) {
  return request(`/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsAsRead() {
  return request('/read-all', {
    method: 'PATCH',
  });
}
