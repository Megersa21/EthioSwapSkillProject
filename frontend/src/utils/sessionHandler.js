const EXPIRATION_MESSAGE =
  'Your session has expired. Please log in again to continue.';

let redirectInProgress = false;

export function handleExpiredSession() {
  if (redirectInProgress) return;

  redirectInProgress = true;

  localStorage.removeItem('token');
  localStorage.removeItem('user');

  sessionStorage.setItem('sessionExpiredMessage', EXPIRATION_MESSAGE);

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

export function isExpiredTokenResponse(status, message = '') {
  if (status !== 401) return false;

  return /invalid or expired token|expired token|token expired|jwt expired|session is no longer valid|account not found/i.test(
    message,
  );
}

/**
 * Install once to handle expired sessions across existing fetch() calls.
 * Login and public form errors are not intercepted unless they contain
 * a recognized invalid-session response and use a Bearer token.
 */
export function installSessionHandler() {
  if (window.__ethioSwapSessionHandlerInstalled) return;

  window.__ethioSwapSessionHandlerInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
      const request = args[0];
      const options = args[1] || {};

      const headers = new Headers(
        request instanceof Request ? request.headers : undefined,
      );

      if (options.headers) {
        new Headers(options.headers).forEach((value, key) => {
          headers.set(key, value);
        });
      }

      const authorization = headers.get('Authorization') || '';
      const hasBearerToken = /^Bearer\s+\S+/i.test(authorization);

      const requestUrl =
        typeof request === 'string'
          ? request
          : request instanceof URL
            ? request.href
            : request.url;

      const pathname = new URL(requestUrl, window.location.origin).pathname;

      const isLoginRequest = /\/auth\/login\/?$/.test(pathname);

      if (
        hasBearerToken &&
        !isLoginRequest &&
        isExpiredTokenResponse(
          response.status,
          (await response.clone().json()).message || '',
        )
      ) {
        handleExpiredSession();
      }
    } catch {
      // Leave the original response untouched if it is not JSON
      // or cannot be inspected.
    }

    return response;
  };
}
