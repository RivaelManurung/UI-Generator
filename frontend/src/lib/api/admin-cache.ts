// Shared so both the auth layer (to reset on logout) and the useIsAdmin hook
// can read/clear the cached admin flag without a circular import.
let cachedAdmin: boolean | null = null;

export function getCachedAdmin(): boolean | null {
  return cachedAdmin;
}

export function setCachedAdmin(value: boolean | null): void {
  cachedAdmin = value;
}
