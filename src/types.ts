/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Member {
  id?: string;
  name: string;
  dob: string;
  email: string;
  phone: string;
  address: string;
  maritalStatus: 'Solteiro(a)' | 'Casado(a)' | 'Viúvo(a)';
  originChurch: string;
  age?: number;
  photoUrl?: string;
  lgpdConsent: boolean;
  lgpdConsentDate?: string;
  lgpdMetadata?: {
    acceptedAt: string;
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
  } | null;
  createdAt: any; // Firestore Timestamp
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
