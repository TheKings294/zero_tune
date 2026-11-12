import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(pw) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(pw, salt, 32).toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(pw, Buffer.from(salt, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

// Hash factice : un identifiant inconnu coûte le même temps qu'un mauvais mot de passe.
export const DUMMY_HASH = hashPassword('jamais-utilise');

export const newToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (t) => createHash('sha256').update(t).digest('hex');
