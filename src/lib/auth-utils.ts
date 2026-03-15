// lib/auth-utils.ts
export function redirectToAuth(type: 'login' | 'signup') {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.pathname = '/sign-in';
    url.searchParams.set('mode', type);
    window.location.href = url.toString();
  }
}
