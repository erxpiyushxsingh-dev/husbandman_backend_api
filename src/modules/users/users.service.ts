import { usersRepository } from "./users.repository";
import type { PublicUser, UserRecord } from "../auth/auth.types";

function toPublicUser(user: UserRecord): PublicUser {
  const { password_hash: _hash, failed_login_attempts: _attempts, locked_until: _locked, ...publicUser } = user;
  return publicUser;
}

export const usersService = {
  async list(tenantId: string | null): Promise<PublicUser[]> {
    const users = await usersRepository.listByTenant(tenantId);
    return users.map(toPublicUser);
  },
};
