import bcrypt from "bcryptjs";

/**
 * Jumlah putaran hashing bcrypt. Nilai ini adalah konstanta keamanan, bukan
 * kredensial, sehingga aman berada di kode sumber.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
