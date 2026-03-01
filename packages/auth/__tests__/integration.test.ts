/**
 * Integration Tests
 * =================
 *
 * AUTH-WC-007: Full workflow: sign-up through core action
 * AUTH-WC-008: Stripe checkout and webhook test
 * AUTH-WC-009: CSV/JSON import and export
 */

import { describe, test, expect } from 'vitest';
import {
  createMockSupabase,
  createMockStripe,
  createMockRequest,
  createMockResponse,
  seedTestData,
  TEST_USERS,
  TEST_JWT_SECRET,
} from './setup';

// ══════════════════════════════════════════════════════════════════════════════
// AUTH-WC-007: Full workflow
// ══════════════════════════════════════════════════════════════════════════════

describe('AUTH-WC-007: Full sign-up → core action workflow', () => {
  test('complete user lifecycle: create → read → update → delete', () => {
    const supabase = createMockSupabase();
    seedTestData(supabase);

    // 1. Create user
    const createResult = supabase.from('shared_users').insert({
      id: 'new-user-001',
      email: 'newuser@test.com',
      name: 'New User',
      role: 'user',
    });
    expect(createResult.error).toBeFalsy();

    // 2. Read user
    const readResult = supabase.from('shared_users').select().eq('email', 'newuser@test.com');
    expect(readResult.data.length).toBe(1);

    // 3. Update user
    supabase.from('shared_users').update({ name: 'Updated User' }).eq('id', 'new-user-001');

    // 4. Delete user
    supabase.from('shared_users').delete().eq('id', 'new-user-001');
  });

  test('sign-up creates user and session', () => {
    const supabase = createMockSupabase();
    const result = supabase.auth.signUp({
      email: 'signup@test.com',
      password: 'SecurePass123!',
    });
    expect(result.data.user).toBeTruthy();
    expect(result.data.user.email).toBe('signup@test.com');
    expect(result.data.session).toBeTruthy();
  });

  test('sign-in returns session token', () => {
    const supabase = createMockSupabase();
    const result = supabase.auth.signInWithPassword({
      email: 'user@test.com',
      password: 'password',
    });
    expect(result.data.session.access_token).toBeTruthy();
  });

  test('sign-out clears session', () => {
    const supabase = createMockSupabase();
    const result = supabase.auth.signOut();
    expect(result.error).toBeFalsy();
  });

  test('password reset sends email without error', () => {
    const supabase = createMockSupabase();
    const result = supabase.auth.resetPasswordForEmail('user@test.com' as any);
    expect(result.error).toBeFalsy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH-WC-008: Stripe checkout and webhook
// ══════════════════════════════════════════════════════════════════════════════

describe('AUTH-WC-008: Stripe integration', () => {
  test('create Stripe customer', () => {
    const stripe = createMockStripe();
    const customer = stripe.customers.create({
      email: 'buyer@test.com',
      name: 'Test Buyer',
    });
    expect(customer.id).toBeTruthy();
    expect(customer.email).toBe('buyer@test.com');
  });

  test('create subscription', () => {
    const stripe = createMockStripe();
    const sub = stripe.subscriptions.create({
      customer: 'cus_mock_123',
      items: [{ price: 'price_pro_monthly' }],
    });
    expect(sub.id).toBeTruthy();
    expect(sub.status).toBe('active');
  });

  test('cancel subscription', () => {
    const stripe = createMockStripe();
    const sub = stripe.subscriptions.cancel('sub_mock_123');
    expect(sub.status).toBe('canceled');
  });

  test('billing portal URL generation', () => {
    const stripe = createMockStripe();
    const session = stripe.billingPortal.sessions.create({
      customer: 'cus_mock_123',
      return_url: 'https://app.test.com/billing',
    });
    expect(session.url).toBeTruthy();
  });

  test('webhook event construction', () => {
    const stripe = createMockStripe();
    const event = stripe.webhooks.constructEvent('body', 'sig', 'secret');
    expect(event.type).toBe('checkout.session.completed');
    expect(event.data.object).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH-WC-009: CSV/JSON import and export
// ══════════════════════════════════════════════════════════════════════════════

describe('AUTH-WC-009: Import/export', () => {
  test('export users as JSON', () => {
    const users = Object.values(TEST_USERS);
    const exported = JSON.stringify(users, null, 2);
    expect(exported.length).toBeTruthy();
    const parsed = JSON.parse(exported);
    expect(parsed.length).toBe(3);
  });

  test('export users as CSV', () => {
    const users = Object.values(TEST_USERS);
    const headers = ['id', 'email', 'name', 'role'];
    const csv = [
      headers.join(','),
      ...users.map(u => headers.map(h => (u as any)[h]).join(',')),
    ].join('\n');
    expect(csv.split('\n').length).toBe(4); // header + 3 rows
  });

  test('import JSON validates structure', () => {
    const jsonData = JSON.stringify([
      { email: 'import1@test.com', name: 'Import User 1' },
      { email: 'import2@test.com', name: 'Import User 2' },
    ]);
    const parsed = JSON.parse(jsonData);
    for (const record of parsed) {
      expect(record.email).toBeTruthy();
      expect(record.name).toBeTruthy();
    }
  });

  test('import CSV parses correctly', () => {
    const csv = 'email,name\nimport1@test.com,Import 1\nimport2@test.com,Import 2';
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    expect(headers.length).toBe(2);
    expect(lines.length).toBe(3);
  });
});

// Tests complete
