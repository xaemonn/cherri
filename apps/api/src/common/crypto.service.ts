import { Inject, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { ENV, type Env } from '../config/env';

const VERSION = 'v1';

/**
 * Field-level encryption for sensitive health text (notes, chat, report snapshots).
 * AES-256-GCM with a random IV per value; the auth tag makes tampering detectable.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(@Inject(ENV) env: Env) {
    this.key = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
  }

  decrypt(payload: string): string {
    const [version, iv, tag, ciphertext] = payload.split('.');
    if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error('Unrecognised ciphertext format');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  encryptNullable(value: string | null | undefined): string | null | undefined {
    return value == null ? value : this.encrypt(value);
  }

  decryptNullable(value: string | null): string | null {
    return value == null ? null : this.decrypt(value);
  }

  encryptJson(value: unknown): string {
    return this.encrypt(JSON.stringify(value));
  }

  decryptJson<T>(payload: string): T {
    return JSON.parse(this.decrypt(payload)) as T;
  }

  /** Keyed hash so IP addresses in audit logs can be correlated but not reversed. */
  hashIp(ip: string | undefined): string | null {
    if (!ip) return null;
    return createHmac('sha256', this.key).update(ip).digest('hex').slice(0, 32);
  }

  static sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  static randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }
}
