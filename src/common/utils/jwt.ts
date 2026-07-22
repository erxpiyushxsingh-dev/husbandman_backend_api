import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  tenantId?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string; // maps to a row in refresh_tokens, so it can be revoked
}

/**
 * Access tokens are short-lived and carry the claims controllers need
 * (id/role/tenant) so most requests never have to hit the database just to
 * know who's calling. Refresh tokens are long-lived, carry almost no
 * claims, and are only ever exchanged for a new access token.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
