export interface UserRecord {
  id: string;
  tenant_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  role: "owner" | "admin" | "manager" | "staff";
  branch: string | null;
  is_active: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<UserRecord, "password_hash" | "failed_login_attempts" | "locked_until">;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
