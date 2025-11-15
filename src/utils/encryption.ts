import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;

export class EncryptionService {
  /**
   * 🔴 CRITICAL FIX: Use dynamic salt instead of hard-coded 'salt'
   * Encrypts text using AES-256-CBC with dynamic salt
   * Format: salt:iv:encrypted
   */
  static encrypt(text: string): string {
    // Generate random salt for each encryption
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive key from password + salt using scrypt
    const key = crypto.scryptSync(config.encryption.key, salt, 32);

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Encrypt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return salt:iv:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts text that was encrypted with dynamic salt
   * Supports both old format (iv:encrypted) and new format (salt:iv:encrypted)
   */
  static decrypt(text: string): string {
    const parts = text.split(':');

    // Check if this is old format (2 parts) or new format (3 parts)
    if (parts.length === 2) {
      // Old format: iv:encrypted (backward compatibility)
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];

      // Use old hard-coded salt for backward compatibility
      const key = crypto.scryptSync(config.encryption.key, 'salt', 32);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else if (parts.length === 3) {
      // New format: salt:iv:encrypted
      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];

      // Derive key from password + salt
      const key = crypto.scryptSync(config.encryption.key, salt, 32);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else {
      throw new Error('Invalid encrypted text format');
    }
  }

  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Hash with salt for passwords (use bcrypt for passwords instead)
   */
  static hashWithSalt(text: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(text, usedSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: usedSalt };
  }
}

export default EncryptionService;
