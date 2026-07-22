import bcrypt from "bcrypt";
import { env } from "../../config/env";

/**
 * Password hashing lives in exactly one place so the salt-round policy is
 * consistent everywhere. Never store or log plaintext passwords.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
