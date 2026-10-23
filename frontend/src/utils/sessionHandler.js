const EXPIRATION_MESSAGE =
  'Your session has expired. Please log in again to continue.';

export function handleExpiredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  sessionStorage.setItem('sessionExpiredMessage', EXPIRATION_MESSAGE);

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

export function isExpiredTokenResponse(status, message = '') {
  return (
    status === 401 &&
    /invalid or expired token|expired token|token expired|jwt expired/i.test(
      message,
    )
  );
}
