// The Pages build aliases this transport to its browser-local database adapter.
export const apiFetch: typeof fetch = (...args) => fetch(...args);
