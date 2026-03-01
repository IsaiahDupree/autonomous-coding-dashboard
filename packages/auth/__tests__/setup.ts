/**
 * Test Setup
 * AUTH-WC-025: Coverage config and thresholds
 * AUTH-WC-027: Idempotent test data seeding
 * AUTH-WC-028: Mock external services
 */

// ---------------------------------------------------------------------------
// Mock external services
// ---------------------------------------------------------------------------

/** Mock Supabase client */
export function createMockSupabase() {
  const mockData = new Map<string, Map<string, unknown>>();

  return {
    from: (table: string) => {
      if (!mockData.has(table)) mockData.set(table, new Map());
      const tableData = mockData.get(table)!;

      return {
        select: () => ({
          eq: (col: string, val: unknown) => ({
            single: () => {
              const items = Array.from(tableData.values()).filter(
                (item: any) => item[col] === val,
              );
              return { data: items[0] || null, error: items.length === 0 ? { message: 'Not found' } : null };
            },
            data: Array.from(tableData.values()).filter((item: any) => item[col] === val),
            error: null,
          }),
          data: Array.from(tableData.values()),
          error: null,
        }),
        insert: (row: any) => {
          const id = row.id || `mock_${Date.now()}`;
          tableData.set(id, { ...row, id });
          return { data: { ...row, id }, error: null };
        },
        update: (updates: any) => ({
          eq: (col: string, val: unknown) => {
            for (const [key, item] of tableData) {
              if ((item as any)[col] === val) {
                tableData.set(key, { ...item, ...updates });
              }
            }
            return { data: updates, error: null };
          },
        }),
        delete: () => ({
          eq: (col: string, val: unknown) => {
            for (const [key, item] of tableData) {
              if ((item as any)[col] === val) {
                tableData.delete(key);
              }
            }
            return { data: null, error: null };
          },
        }),
      };
    },
    auth: {
      signUp: ({ email, password }: { email: string; password: string }) => ({
        data: { user: { id: `user_${Date.now()}`, email }, session: { access_token: 'mock_token' } },
        error: null,
      }),
      signInWithPassword: ({ email }: { email: string }) => ({
        data: { user: { id: `user_${Date.now()}`, email }, session: { access_token: 'mock_token' } },
        error: null,
      }),
      signOut: () => ({ error: null }),
      getSession: () => ({ data: { session: null }, error: null }),
      resetPasswordForEmail: () => ({ error: null }),
    },
    _data: mockData,
    _clear: () => mockData.clear(),
  };
}

/** Mock Stripe client */
export function createMockStripe() {
  return {
    customers: {
      create: (params: any) => ({
        id: `cus_mock_${Date.now()}`,
        email: params.email,
        name: params.name,
      }),
      retrieve: (id: string) => ({
        id,
        email: 'test@example.com',
        name: 'Test User',
      }),
    },
    subscriptions: {
      create: (params: any) => ({
        id: `sub_mock_${Date.now()}`,
        customer: params.customer,
        status: 'active',
        items: { data: [{ price: { id: params.items[0]?.price } }] },
      }),
      cancel: (id: string) => ({
        id,
        status: 'canceled',
      }),
    },
    billingPortal: {
      sessions: {
        create: (params: any) => ({
          url: `https://billing.stripe.com/mock/${params.customer}`,
        }),
      },
    },
    webhooks: {
      constructEvent: (_body: string, _sig: string, _secret: string) => ({
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_mock', subscription: 'sub_mock' } },
      }),
    },
  };
}

/** Mock Express request */
export function createMockRequest(overrides: Partial<any> = {}): any {
  return {
    method: 'GET',
    path: '/',
    url: '/',
    headers: {},
    cookies: {},
    body: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    get: (name: string) => (overrides.headers as any)?.[name.toLowerCase()],
    ...overrides,
  };
}

/** Mock Express response */
export function createMockResponse(): any {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    cookies: {} as Record<string, { value: string; options: any }>,
    status: function (code: number) { res.statusCode = code; return res; },
    json: function (data: any) { res.body = data; return res; },
    send: function (data: any) { res.body = data; return res; },
    end: function () { return res; },
    setHeader: function (name: string, value: string) { res.headers[name] = value; return res; },
    getHeader: function (name: string) { return res.headers[name]; },
    cookie: function (name: string, value: string, options: any = {}) {
      res.cookies[name] = { value, options };
      return res;
    },
  };
  return res;
}

/** Mock next function */
export function createMockNext(): any {
  const fn: any = function (err?: Error) { fn.called = true; fn.error = err; };
  fn.called = false;
  fn.error = undefined;
  return fn;
}

// ---------------------------------------------------------------------------
// Test data seeding (idempotent)
// ---------------------------------------------------------------------------

export const TEST_USERS = {
  admin: {
    id: 'test-admin-001',
    email: 'admin@test.acd.dev',
    name: 'Test Admin',
    role: 'admin',
    products: ['portal28', 'softwarehub', 'waitlistlab'],
  },
  user: {
    id: 'test-user-001',
    email: 'user@test.acd.dev',
    name: 'Test User',
    role: 'user',
    products: ['softwarehub'],
  },
  viewer: {
    id: 'test-viewer-001',
    email: 'viewer@test.acd.dev',
    name: 'Test Viewer',
    role: 'viewer',
    products: [],
  },
};

export const TEST_JWT_SECRET = 'test-jwt-secret-for-testing-only-not-production';
export const TEST_ENCRYPTION_KEY = 'test-encryption-key-for-testing-purposes';

/**
 * Seed test data into mock databases (idempotent).
 */
export function seedTestData(supabase: ReturnType<typeof createMockSupabase>) {
  supabase._clear();
  for (const user of Object.values(TEST_USERS)) {
    supabase.from('shared_users').insert(user);
  }
  supabase.from('shared_entitlements').insert({
    id: 'ent-001',
    user_id: TEST_USERS.admin.id,
    product: 'portal28',
    plan: 'pro',
  });
  supabase.from('shared_entitlements').insert({
    id: 'ent-002',
    user_id: TEST_USERS.user.id,
    product: 'softwarehub',
    plan: 'free',
  });
}
