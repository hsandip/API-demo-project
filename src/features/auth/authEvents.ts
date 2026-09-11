// Lets the axios layer (outside the React tree) signal that the session is
// no longer valid — e.g. a 401 that survived a token refresh attempt —
// without importing AuthContext and creating a cycle back into lib/axios.ts.
const SESSION_EXPIRED_EVENT = 'auth:session-expired'

export function emitSessionExpired() {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

export function onSessionExpired(callback: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, callback)
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, callback)
}
