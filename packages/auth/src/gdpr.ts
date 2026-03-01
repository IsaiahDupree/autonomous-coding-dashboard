/**
 * AUTH-WC-045: GDPR/Privacy Compliance
 * ====================================
 *
 * Data export, deletion, and consent management utilities
 * for GDPR compliance across all ACD products.
 *
 * @example
 * ```ts
 * import { exportUserData, deleteUserData, updateConsent } from '@acd/auth';
 *
 * // Export all user data
 * const data = await exportUserData(userId);
 *
 * // Delete user account and all data
 * await deleteUserData(userId);
 *
 * // Update consent preferences
 * await updateConsent(userId, { marketing: true, analytics: false });
 * ```
 */

import { createSupabaseAdmin } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    created_at: string;
    metadata: Record<string, any>;
  };
  profile?: Record<string, any>;
  entitlements: Array<Record<string, any>>;
  events: Array<Record<string, any>>;
  assets: Array<Record<string, any>>;
  sessions: Array<Record<string, any>>;
  consent: ConsentPreferences;
  exported_at: string;
  format_version: string;
}

export interface ConsentPreferences {
  marketing: boolean;
  analytics: boolean;
  personalization: boolean;
  third_party: boolean;
  updated_at: string;
}

export interface DataDeletionResult {
  user_id: string;
  deleted_at: string;
  tables_affected: string[];
  records_deleted: number;
  anonymized: boolean;
}

export interface ConsentUpdateResult {
  user_id: string;
  preferences: ConsentPreferences;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Data Export (Right to Access)
// ---------------------------------------------------------------------------

/**
 * Export all user data in machine-readable format (GDPR Article 20)
 */
export async function exportUserData(
  userId: string,
  options: {
    format?: 'json' | 'csv';
    includeAssets?: boolean;
  } = {}
): Promise<UserDataExport> {
  const supabase = createSupabaseAdmin();

  // Fetch user data from auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser) {
    throw new Error(`User not found: ${userId}`);
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from('shared_users')
    .select('*')
    .eq('id', userId)
    .single();

  // Fetch entitlements
  const { data: entitlements } = await supabase
    .from('shared_entitlements')
    .select('*')
    .eq('user_id', userId);

  // Fetch events (analytics)
  const { data: events } = await supabase
    .from('shared_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000); // Limit to recent 1000 events

  // Fetch assets
  const { data: assets } = options.includeAssets
    ? await supabase
        .from('shared_assets')
        .select('*')
        .eq('user_id', userId)
    : { data: [] };

  // Fetch consent preferences
  const consent = await getConsentPreferences(userId);

  // Compile export
  const exportData: UserDataExport = {
    user: {
      id: authUser.user.id,
      email: authUser.user.email || '',
      created_at: authUser.user.created_at,
      metadata: authUser.user.user_metadata || {},
    },
    profile: profile || undefined,
    entitlements: entitlements || [],
    events: events || [],
    assets: assets || [],
    sessions: [], // Sessions are ephemeral, include if needed
    consent,
    exported_at: new Date().toISOString(),
    format_version: '1.0',
  };

  return exportData;
}

/**
 * Generate downloadable data export file
 */
export async function generateDataExportFile(
  userId: string,
  format: 'json' | 'csv' = 'json'
): Promise<{ filename: string; content: string; mimeType: string }> {
  const data = await exportUserData(userId, { includeAssets: true });

  if (format === 'json') {
    return {
      filename: `user-data-export-${userId}-${Date.now()}.json`,
      content: JSON.stringify(data, null, 2),
      mimeType: 'application/json',
    };
  }

  // CSV format - flatten to CSV
  const csv = convertToCSV(data);
  return {
    filename: `user-data-export-${userId}-${Date.now()}.csv`,
    content: csv,
    mimeType: 'text/csv',
  };
}

// ---------------------------------------------------------------------------
// Data Deletion (Right to Erasure)
// ---------------------------------------------------------------------------

/**
 * Delete all user data (GDPR Article 17 - Right to Erasure)
 */
export async function deleteUserData(
  userId: string,
  options: {
    anonymize?: boolean; // Keep records but anonymize
    keepAuditLog?: boolean;
  } = { anonymize: false, keepAuditLog: true }
): Promise<DataDeletionResult> {
  const supabase = createSupabaseAdmin();
  const deletedTables: string[] = [];
  let recordsDeleted = 0;

  if (options.anonymize) {
    // Anonymize instead of delete (for audit/compliance)
    return await anonymizeUserData(userId);
  }

  // Delete from all tables (cascade from shared_users)
  const tablesToDelete = [
    'shared_events',
    'shared_assets',
    'shared_entitlements',
    // Add other tables as needed
  ];

  for (const table of tablesToDelete) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .select();

    if (!error && data) {
      deletedTables.push(table);
      recordsDeleted += data.length;
    }
  }

  // Delete user profile
  const { error: profileError } = await supabase
    .from('shared_users')
    .delete()
    .eq('id', userId);

  if (!profileError) {
    deletedTables.push('shared_users');
    recordsDeleted += 1;
  }

  // Delete auth user (last step)
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (!authError) {
    deletedTables.push('auth.users');
    recordsDeleted += 1;
  }

  // Log deletion for audit trail
  if (options.keepAuditLog) {
    await logDataDeletion(userId, deletedTables, recordsDeleted);
  }

  return {
    user_id: userId,
    deleted_at: new Date().toISOString(),
    tables_affected: deletedTables,
    records_deleted: recordsDeleted,
    anonymized: false,
  };
}

/**
 * Anonymize user data instead of deleting (keep for legal/audit)
 */
async function anonymizeUserData(userId: string): Promise<DataDeletionResult> {
  const supabase = createSupabaseAdmin();
  const anonymizedTables: string[] = [];
  let recordsAnonymized = 0;

  // Anonymize profile
  const { error: profileError } = await supabase
    .from('shared_users')
    .update({
      email: `deleted-user-${userId}@anonymized.local`,
      name: 'Deleted User',
      avatar_url: null,
      metadata: {},
    })
    .eq('id', userId);

  if (!profileError) {
    anonymizedTables.push('shared_users');
    recordsAnonymized += 1;
  }

  // Anonymize events (remove PII)
  const { data: events } = await supabase
    .from('shared_events')
    .update({
      properties: {}, // Remove event properties that might contain PII
    })
    .eq('user_id', userId)
    .select();

  if (events) {
    anonymizedTables.push('shared_events');
    recordsAnonymized += events.length;
  }

  return {
    user_id: userId,
    deleted_at: new Date().toISOString(),
    tables_affected: anonymizedTables,
    records_deleted: recordsAnonymized,
    anonymized: true,
  };
}

// ---------------------------------------------------------------------------
// Consent Management
// ---------------------------------------------------------------------------

/**
 * Get user's consent preferences
 */
export async function getConsentPreferences(userId: string): Promise<ConsentPreferences> {
  const supabase = createSupabaseAdmin();

  const { data } = await supabase
    .from('shared_users')
    .select('consent_preferences')
    .eq('id', userId)
    .single();

  return (
    data?.consent_preferences || {
      marketing: false,
      analytics: false,
      personalization: false,
      third_party: false,
      updated_at: new Date().toISOString(),
    }
  );
}

/**
 * Update user's consent preferences
 */
export async function updateConsent(
  userId: string,
  preferences: Partial<Omit<ConsentPreferences, 'updated_at'>>
): Promise<ConsentUpdateResult> {
  const supabase = createSupabaseAdmin();

  const current = await getConsentPreferences(userId);
  const updated: ConsentPreferences = {
    ...current,
    ...preferences,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('shared_users')
    .update({ consent_preferences: updated })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update consent: ${error.message}`);
  }

  // Log consent change for audit
  await logConsentChange(userId, current, updated);

  return {
    user_id: userId,
    preferences: updated,
    updated_at: updated.updated_at,
  };
}

/**
 * Check if user has given consent for a specific purpose
 */
export async function hasConsent(
  userId: string,
  purpose: keyof Omit<ConsentPreferences, 'updated_at'>
): Promise<boolean> {
  const preferences = await getConsentPreferences(userId);
  return preferences[purpose] === true;
}

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------

async function logDataDeletion(
  userId: string,
  tables: string[],
  recordCount: number
): Promise<void> {
  const supabase = createSupabaseAdmin();

  await supabase.from('audit_log').insert({
    event_type: 'data_deletion',
    user_id: userId,
    details: {
      tables_affected: tables,
      records_deleted: recordCount,
      timestamp: new Date().toISOString(),
    },
  });
}

async function logConsentChange(
  userId: string,
  oldPreferences: ConsentPreferences,
  newPreferences: ConsentPreferences
): Promise<void> {
  const supabase = createSupabaseAdmin();

  await supabase.from('audit_log').insert({
    event_type: 'consent_change',
    user_id: userId,
    details: {
      old: oldPreferences,
      new: newPreferences,
      timestamp: new Date().toISOString(),
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertToCSV(data: UserDataExport): string {
  const rows: string[][] = [];

  // User data
  rows.push(['Type', 'Key', 'Value']);
  rows.push(['User', 'ID', data.user.id]);
  rows.push(['User', 'Email', data.user.email]);
  rows.push(['User', 'Created', data.user.created_at]);

  // Profile
  if (data.profile) {
    Object.entries(data.profile).forEach(([key, value]) => {
      rows.push(['Profile', key, String(value)]);
    });
  }

  // Entitlements
  data.entitlements.forEach((ent, i) => {
    rows.push(['Entitlement', `${i + 1}`, JSON.stringify(ent)]);
  });

  // Consent
  Object.entries(data.consent).forEach(([key, value]) => {
    rows.push(['Consent', key, String(value)]);
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}
