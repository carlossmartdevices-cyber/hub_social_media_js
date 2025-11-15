import { Platform } from '../../core/content/types';

export interface PlatformCredential {
  id: string;
  userId: string;
  platform: Platform;
  credentials: string; // Encrypted JSON
  isActive: boolean;
  lastValidated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCredentialDTO {
  userId: string;
  platform: Platform;
  credentials: Record<string, string>;
}

export interface UpdateCredentialDTO {
  credentials?: Record<string, string>;
  isActive?: boolean;
}
