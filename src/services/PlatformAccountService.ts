import database from '../database/connection';
import { EncryptionService } from '../utils/encryption';
import { logger } from '../utils/logger';

export interface PlatformAccount {
  id: string;
  userId: string;
  platform: string;
  accountName: string;
  accountIdentifier: string;
  isDefault: boolean;
  isActive: boolean;
  lastValidated: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformAccountWithCredentials extends PlatformAccount {
  credentials: Record<string, string>;
}

/**
 * Service for managing multiple platform accounts per user
 */
export class PlatformAccountService {

  /**
   * Get all accounts for a user on a specific platform
   */
  async getUserPlatformAccounts(
    userId: string,
    platform: string
  ): Promise<PlatformAccount[]> {
    // Si el userId no es UUID, no filtrar por UUID
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);
    let query;
    let params;
    if (isUUID) {
      query = `
        SELECT
          id, user_id, platform, account_name, account_identifier,
          is_default, is_active, last_validated, created_at, updated_at
        FROM platform_credentials
        WHERE user_id = $1 AND platform = $2
        ORDER BY is_default DESC, account_name ASC
      `;
      params = [userId, platform];
    } else {
      query = `
        SELECT
          id, user_id, platform, account_name, account_identifier,
          is_default, is_active, last_validated, created_at, updated_at
        FROM platform_credentials
        WHERE account_identifier = $1 AND platform = $2
        ORDER BY is_default DESC, account_name ASC
      `;
      params = [userId, platform];
    }

    const result = await database.query(query, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      accountName: row.account_name,
      accountIdentifier: row.account_identifier,
      isDefault: row.is_default,
      isActive: row.is_active,
      lastValidated: row.last_validated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get all accounts for a user across all platforms
   */
  async getAllUserAccounts(userId: string): Promise<PlatformAccount[]> {
    const query = `
      SELECT
        id, user_id, platform, account_name, account_identifier,
        is_default, is_active, last_validated, created_at, updated_at
      FROM platform_credentials
      WHERE user_id = $1
      ORDER BY platform ASC, is_default DESC, account_name ASC
    `;

    const result = await database.query(query, [userId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      accountName: row.account_name,
      accountIdentifier: row.account_identifier,
      isDefault: row.is_default,
      isActive: row.is_active,
      lastValidated: row.last_validated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get a specific account by ID with decrypted credentials
   */
  async getAccountById(
    accountId: string,
    userId: string
  ): Promise<PlatformAccountWithCredentials | null> {
    const query = `
      SELECT
        id, user_id, platform, account_name, account_identifier,
        is_default, is_active, last_validated, created_at, updated_at,
        credentials
      FROM platform_credentials
      WHERE id = $1 AND user_id = $2
    `;

    const result = await database.query(query, [accountId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const decryptedCredentials = JSON.parse(
      EncryptionService.decrypt(row.credentials)
    );

    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      accountName: row.account_name,
      accountIdentifier: row.account_identifier,
      isDefault: row.is_default,
      isActive: row.is_active,
      lastValidated: row.last_validated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      credentials: decryptedCredentials,
    };
  }

  /**
   * Get the default account for a platform
   */
  async getDefaultAccount(
    userId: string,
    platform: string
  ): Promise<PlatformAccountWithCredentials | null> {
    const query = `
      SELECT
        id, user_id, platform, account_name, account_identifier,
        is_default, is_active, last_validated, created_at, updated_at,
        credentials
      FROM platform_credentials
      WHERE user_id = $1 AND platform = $2 AND is_default = true
      LIMIT 1
    `;

    const result = await database.query(query, [userId, platform]);

    if (result.rows.length === 0) {
      // If no default, get the first active account
      return this.getFirstActiveAccount(userId, platform);
    }

    const row = result.rows[0];
    const decryptedCredentials = JSON.parse(
      EncryptionService.decrypt(row.credentials)
    );

    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      accountName: row.account_name,
      accountIdentifier: row.account_identifier,
      isDefault: row.is_default,
      isActive: row.is_active,
      lastValidated: row.last_validated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      credentials: decryptedCredentials,
    };
  }

  /**
   * Get the first active account for a platform (fallback)
   */
  private async getFirstActiveAccount(
    userId: string,
    platform: string
  ): Promise<PlatformAccountWithCredentials | null> {
    const query = `
      SELECT
        id, user_id, platform, account_name, account_identifier,
        is_default, is_active, last_validated, created_at, updated_at,
        credentials
      FROM platform_credentials
      WHERE user_id = $1 AND platform = $2 AND is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    `;

    const result = await database.query(query, [userId, platform]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const decryptedCredentials = JSON.parse(
      EncryptionService.decrypt(row.credentials)
    );

    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      accountName: row.account_name,
      accountIdentifier: row.account_identifier,
      isDefault: row.is_default,
      isActive: row.is_active,
      lastValidated: row.last_validated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      credentials: decryptedCredentials,
    };
  }

  /**
   * Add a new platform account
   */
  async addAccount(
    userId: string,
    platform: string,
    accountName: string,
    accountIdentifier: string,
    credentials: Record<string, string>,
    isDefault: boolean = false
  ): Promise<PlatformAccount> {
    // If this is set as default, unset other defaults for this platform
    if (isDefault) {
      await this.unsetDefaultAccounts(userId, platform);
    }

    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials));

    const query = `
      INSERT INTO platform_credentials
        (user_id, platform, account_name, account_identifier, credentials, is_default, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING
        id, user_id, platform, account_name, account_identifier,
        is_default, is_active, last_validated, created_at, updated_at
    `;

    const result = await database.query(query, [
      userId,
      platform,
      accountName,
      accountIdentifier,
      encryptedCredentials,
      isDefault,
    ]);

    const row = result.rows[0];

    logger.info(
      `Added new ${platform} account "${accountName}" for user ${userId}`
    );

    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      accountName: row.account_name,
      accountIdentifier: row.account_identifier,
      isDefault: row.is_default,
      isActive: row.is_active,
      lastValidated: row.last_validated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update an existing account
   */
  async updateAccount(
    accountId: string,
    userId: string,
    updates: {
      accountName?: string;
      accountIdentifier?: string;
      credentials?: Record<string, string>;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ): Promise<PlatformAccount> {
    // Build the update query dynamically
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.accountName !== undefined) {
      setClauses.push(`account_name = $${paramCount++}`);
      values.push(updates.accountName);
    }

    if (updates.accountIdentifier !== undefined) {
      setClauses.push(`account_identifier = $${paramCount++}`);
      values.push(updates.accountIdentifier);
    }

    if (updates.credentials !== undefined) {
      const encryptedCredentials = EncryptionService.encrypt(
        JSON.stringify(updates.credentials)
      );
      setClauses.push(`credentials = $${paramCount++}`);
      values.push(encryptedCredentials);
    }

    if (updates.isDefault !== undefined) {
      // If setting as default, unset other defaults first
      if (updates.isDefault) {
        const platformQuery = `SELECT platform FROM platform_credentials WHERE id = $1`;
        const platformResult = await database.query(platformQuery, [accountId]);
        if (platformResult.rows.length > 0) {
          await this.unsetDefaultAccounts(userId, platformResult.rows[0].platform);
        }
      }
      setClauses.push(`is_default = $${paramCount++}`);
      values.push(updates.isDefault);
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(accountId);
    values.push(userId);

    const query = `
      UPDATE platform_credentials
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING
        id, user_id, platform, account_name, account_identifier,
        is_default, is_active, last_validated, created_at, updated_at
    `;

    const result = await database.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Account not found or unauthorized');
    }

    const row = result.rows[0];

    logger.info(`Updated account ${accountId} for user ${userId}`);

    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      accountName: row.account_name,
      accountIdentifier: row.account_identifier,
      isDefault: row.is_default,
      isActive: row.is_active,
      lastValidated: row.last_validated,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Delete an account
   */
  async deleteAccount(accountId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM platform_credentials
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await database.query(query, [accountId, userId]);

    if (result.rows.length > 0) {
      logger.info(`Deleted account ${accountId} for user ${userId}`);
      return true;
    }

    return false;
  }

  /**
   * Set an account as the default for its platform
   */
  async setAsDefault(accountId: string, userId: string): Promise<boolean> {
    // Get the platform for this account
    const platformQuery = `
      SELECT platform FROM platform_credentials
      WHERE id = $1 AND user_id = $2
    `;
    const platformResult = await database.query(platformQuery, [
      accountId,
      userId,
    ]);

    if (platformResult.rows.length === 0) {
      return false;
    }

    const platform = platformResult.rows[0].platform;

    // Unset all defaults for this platform
    await this.unsetDefaultAccounts(userId, platform);

    // Set this account as default
    const updateQuery = `
      UPDATE platform_credentials
      SET is_default = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `;

    const result = await database.query(updateQuery, [accountId, userId]);

    logger.info(
      `Set account ${accountId} as default ${platform} account for user ${userId}`
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Unset all default accounts for a user's platform
   */
  private async unsetDefaultAccounts(
    userId: string,
    platform: string
  ): Promise<void> {
    const query = `
      UPDATE platform_credentials
      SET is_default = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND platform = $2 AND is_default = true
    `;

    await database.query(query, [userId, platform]);
  }

  /**
   * Get accounts count by platform for a user
   */
  async getAccountsCount(userId: string): Promise<Record<string, number>> {
    const query = `
      SELECT platform, COUNT(*) as count
      FROM platform_credentials
      WHERE user_id = $1 AND is_active = true
      GROUP BY platform
    `;

    const result = await database.query(query, [userId]);

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.platform] = parseInt(row.count, 10);
    }

    return counts;
  }
}

export default new PlatformAccountService();
