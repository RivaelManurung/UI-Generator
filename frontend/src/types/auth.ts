export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
