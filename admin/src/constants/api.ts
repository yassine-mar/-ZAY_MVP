export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';
export const API_TIMEOUT_MS = 15_000;

/** How long the access token can remain idle before we force re-login. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const IDLE_WARNING_MS = 60 * 1000; // 60-second heads-up
