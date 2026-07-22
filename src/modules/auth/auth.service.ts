import crypto from "crypto";
import { v4 as uuid } from "uuid";
import ms from "../../common/utils/ms";
import { ApiError } from "../../common/utils/ApiError";
import { comparePassword, hashPassword } from "../../common/utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../common/utils/jwt";
import { env } from "../../config/env";
import { authRepository } from "./auth.repository";
import type { AuthTokens, PublicUser, UserRecord } from "./auth.types";
import type { LoginInput, RegisterInput, ChangePasswordInput } from "./auth.validators";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function toPublicUser(user: UserRecord): PublicUser {
  const { password_hash: _hash, failed_login_attempts: _attempts, locked_until: _locked, ...publicUser } = user;
  return publicUser;
}

function hashToken(token: string): string {
  // Refresh tokens are random+signed JWTs; we store only a SHA-256 hash so a
  // database read alone can never be replayed as a live session.
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueTokens(user: UserRecord, meta: { userAgent?: string; ipAddress?: string }): Promise<AuthTokens> {
  const tokenId = uuid();

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id ?? undefined,
  });

  const refreshToken = signRefreshToken({ sub: user.id, tokenId });

  await authRepository.storeRefreshToken({
    id: tokenId,
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN)),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: PublicUser }> {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      branch: input.branch,
    });

    return { user: toPublicUser(user) };
  },

  async login(
    input: LoginInput,
    meta: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await authRepository.findByEmail(input.email);

    // Same generic error whether the email doesn't exist or the password is
    // wrong — never reveal which one it was, that leaks account existence.
    const invalidCredentialsError = ApiError.unauthorized("Invalid email or password");

    if (!user) {
      throw invalidCredentialsError;
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw ApiError.forbidden("Account temporarily locked due to too many failed attempts. Try again later.");
    }

    if (!user.is_active) {
      throw ApiError.forbidden("This account has been deactivated");
    }

    const passwordMatches = await comparePassword(input.password, user.password_hash);

    if (!passwordMatches) {
      const attempts = user.failed_login_attempts + 1;
      const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
      await authRepository.recordLoginFailure(user.id, attempts, lockedUntil);
      throw invalidCredentialsError;
    }

    await authRepository.recordLoginSuccess(user.id);
    const tokens = await issueTokens(user, meta);

    return { user: toPublicUser(user), tokens };
  },

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ipAddress?: string }
  ): Promise<{ tokens: AuthTokens }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const stored = await authRepository.findRefreshTokenById(payload.tokenId);

    if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
      throw ApiError.unauthorized("Refresh token is no longer valid");
    }

    if (stored.token_hash !== hashToken(refreshToken)) {
      // Token id matched but the token itself doesn't — treat as compromised
      // and revoke every session for this user as a precaution.
      await authRepository.revokeAllRefreshTokensForUser(stored.user_id);
      throw ApiError.unauthorized("Refresh token mismatch — all sessions revoked");
    }

    const user = await authRepository.findById(stored.user_id);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized("Account is no longer active");
    }

    // Rotate: revoke the used refresh token and issue a brand new pair.
    await authRepository.revokeRefreshToken(stored.id);
    const tokens = await issueTokens(user, meta);

    return { tokens };
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await authRepository.revokeRefreshToken(payload.tokenId);
    } catch {
      // Already invalid/expired — logout is a no-op in that case, not an error.
    }
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const matches = await comparePassword(input.currentPassword, user.password_hash);
    if (!matches) {
      throw ApiError.unauthorized("Current password is incorrect");
    }

    const newHash = await hashPassword(input.newPassword);
    await authRepository.updatePassword(userId, newHash);
    // Force re-login everywhere after a password change.
    await authRepository.revokeAllRefreshTokensForUser(userId);
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return toPublicUser(user);
  },
};
