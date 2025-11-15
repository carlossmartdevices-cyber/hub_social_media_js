import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(config.encryption.key, 'salt', 32);
const IV_LENGTH = 16;

export class EncryptionService {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  static decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

export default EncryptionService;
