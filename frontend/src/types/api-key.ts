export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  createdAt: string;
  lastUsedAt: string;
  revokedAt?: string;
  lastUsed?: string; // Support for settings page compatibility
}
