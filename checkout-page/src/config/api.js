// Shared API base so the checkout app works in both local dev and Docker.
export const API_BASE = import.meta.env.VITE_API_URL
    || ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        ? 'http://api:8000'
        : 'http://localhost:8000');
