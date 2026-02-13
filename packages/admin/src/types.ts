/**
 * types.ts - Zod schemas and TypeScript types for all 37 features
 *
 * ADMIN-001..006, MT-001..005, AFF-001..005, DX-002/004..007,
 * SCALE-001/002, SH-001/BC-001/VH-001/VP-001/SL-001,
 * MP-CF-001/MP-SL-001/CC-001, GAPRADAR-001/002, MOBILE-001/002
 */

import { z } from 'zod';

// ─── Common / Shared ──────────────────────────────────────────────

export const PaginationParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(25),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const PaginatedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  });

export const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Timestamps = z.infer<typeof TimestampsSchema>;

// ─── ADMIN-001 User Management ────────────────────────────────────

export const UserStatusEnum = z.enum(['active', 'inactive', 'suspended', 'pending']);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const UserRoleEnum = z.enum(['super_admin', 'admin', 'manager', 'member', 'viewer']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: UserRoleEnum,
  status: UserStatusEnum,
  products: z.array(z.string()),
  organizationId: z.string().optional(),
  lastLoginAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const UserFilterSchema = z.object({
  role: UserRoleEnum.optional(),
  status: UserStatusEnum.optional(),
  product: z.string().optional(),
  search: z.string().optional(),
}).merge(PaginationParamsSchema);
export type UserFilter = z.infer<typeof UserFilterSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: UserRoleEnum,
  products: z.array(z.string()).default([]),
  organizationId: z.string().optional(),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: UserRoleEnum.optional(),
  status: UserStatusEnum.optional(),
  products: z.array(z.string()).optional(),
});
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

// ─── ADMIN-002 Role Management ────────────────────────────────────

export const PermissionSchema = z.object({
  resource: z.string(),
  actions: z.array(z.enum(['create', 'read', 'update', 'delete', 'manage'])),
});
export type Permission = z.infer<typeof PermissionSchema>;

export const RoleDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(PermissionSchema),
  parentRoleId: z.string().uuid().nullable(),
  level: z.number().int().min(0),
  isSystem: z.boolean().default(false),
}).merge(TimestampsSchema);
export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;

export const CreateRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  permissions: z.array(PermissionSchema),
  parentRoleId: z.string().uuid().nullable().default(null),
  level: z.number().int().min(0),
});
export type CreateRole = z.infer<typeof CreateRoleSchema>;

export const RoleAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  scope: z.enum(['global', 'organization', 'product']),
  scopeId: z.string().optional(),
}).merge(TimestampsSchema);
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;

// ─── ADMIN-003 Product Management ─────────────────────────────────

export const ProductStatusEnum = z.enum(['active', 'beta', 'deprecated', 'disabled']);
export type ProductStatus = z.infer<typeof ProductStatusEnum>;

export const ProductRegistryEntrySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  status: ProductStatusEnum,
  version: z.string(),
  tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
  features: z.array(z.string()),
  maxUsersPerOrg: z.number().int().optional(),
}).merge(TimestampsSchema);
export type ProductRegistryEntry = z.infer<typeof ProductRegistryEntrySchema>;

export const ProductAccessSchema = z.object({
  productId: z.string().uuid(),
  entityType: z.enum(['user', 'organization']),
  entityId: z.string().uuid(),
  enabled: z.boolean(),
  tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
  expiresAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type ProductAccess = z.infer<typeof ProductAccessSchema>;

export const CreateProductSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
  features: z.array(z.string()).default([]),
  maxUsersPerOrg: z.number().int().optional(),
});
export type CreateProduct = z.infer<typeof CreateProductSchema>;

// ─── ADMIN-004 Billing Management ─────────────────────────────────

export const PlanEnum = z.enum(['free', 'starter', 'pro', 'enterprise', 'custom']);
export type Plan = z.infer<typeof PlanEnum>;

export const SubscriptionStatusEnum = z.enum(['active', 'past_due', 'canceled', 'trialing', 'paused']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  plan: PlanEnum,
  status: SubscriptionStatusEnum,
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  stripeSubscriptionId: z.string().optional(),
  monthlyAmountCents: z.number().int(),
}).merge(TimestampsSchema);
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CreditApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amountCents: z.number().int(),
  reason: z.string(),
  appliedBy: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type CreditApplication = z.infer<typeof CreditApplicationSchema>;

export const PlanOverrideSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  originalPlan: PlanEnum,
  overridePlan: PlanEnum,
  reason: z.string(),
  overriddenBy: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type PlanOverride = z.infer<typeof PlanOverrideSchema>;

export const ApplyCreditSchema = z.object({
  userId: z.string().uuid(),
  amountCents: z.number().int().min(1),
  reason: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});
export type ApplyCredit = z.infer<typeof ApplyCreditSchema>;

export const OverridePlanSchema = z.object({
  userId: z.string().uuid(),
  overridePlan: PlanEnum,
  reason: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});
export type OverridePlan = z.infer<typeof OverridePlanSchema>;

// ─── ADMIN-005 System Config ──────────────────────────────────────

export const ConfigValueTypeEnum = z.enum(['string', 'number', 'boolean', 'json']);
export type ConfigValueType = z.infer<typeof ConfigValueTypeEnum>;

export const SystemConfigEntrySchema = z.object({
  key: z.string(),
  value: z.string(),
  valueType: ConfigValueTypeEnum,
  description: z.string(),
  isSecret: z.boolean().default(false),
  environment: z.enum(['development', 'staging', 'production', 'all']),
  category: z.string(),
  lastModifiedBy: z.string().uuid(),
}).merge(TimestampsSchema);
export type SystemConfigEntry = z.infer<typeof SystemConfigEntrySchema>;

export const FeatureToggleSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  description: z.string(),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  targetUsers: z.array(z.string().uuid()).default([]),
  targetOrganizations: z.array(z.string().uuid()).default([]),
  environment: z.enum(['development', 'staging', 'production', 'all']),
}).merge(TimestampsSchema);
export type FeatureToggle = z.infer<typeof FeatureToggleSchema>;

export const EnvVarDefinitionSchema = z.object({
  name: z.string(),
  value: z.string(),
  isSecret: z.boolean(),
  environment: z.enum(['development', 'staging', 'production', 'all']),
  service: z.string(),
  description: z.string(),
});
export type EnvVarDefinition = z.infer<typeof EnvVarDefinitionSchema>;

export const SetConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  valueType: ConfigValueTypeEnum,
  description: z.string().optional(),
  isSecret: z.boolean().optional(),
  environment: z.enum(['development', 'staging', 'production', 'all']),
  category: z.string().optional(),
});
export type SetConfig = z.infer<typeof SetConfigSchema>;

export const SetFeatureToggleSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  description: z.string().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  targetUsers: z.array(z.string().uuid()).optional(),
  targetOrganizations: z.array(z.string().uuid()).optional(),
  environment: z.enum(['development', 'staging', 'production', 'all']),
});
export type SetFeatureToggle = z.infer<typeof SetFeatureToggleSchema>;

// ─── ADMIN-006 Admin Analytics Overview ───────────────────────────

export const TimeRangeEnum = z.enum(['24h', '7d', '30d', '90d', '1y', 'all']);
export type TimeRange = z.infer<typeof TimeRangeEnum>;

export const SystemMetricsSchema = z.object({
  totalUsers: z.number().int(),
  activeUsers: z.number().int(),
  newUsersToday: z.number().int(),
  totalOrganizations: z.number().int(),
  totalRevenueCents: z.number().int(),
  mrrCents: z.number().int(),
  arrCents: z.number().int(),
  churnRate: z.number(),
  avgRevenuePerUser: z.number(),
  timestamp: z.string().datetime(),
});
export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;

export const UserGrowthPointSchema = z.object({
  date: z.string(),
  totalUsers: z.number().int(),
  newUsers: z.number().int(),
  churned: z.number().int(),
});
export type UserGrowthPoint = z.infer<typeof UserGrowthPointSchema>;

export const RevenueTrendPointSchema = z.object({
  date: z.string(),
  revenueCents: z.number().int(),
  subscriptionsCents: z.number().int(),
  oneTimeCents: z.number().int(),
});
export type RevenueTrendPoint = z.infer<typeof RevenueTrendPointSchema>;

export const AdminAnalyticsSchema = z.object({
  metrics: SystemMetricsSchema,
  userGrowth: z.array(UserGrowthPointSchema),
  revenueTrends: z.array(RevenueTrendPointSchema),
  topProducts: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    activeUsers: z.number().int(),
    revenueCents: z.number().int(),
  })),
  timeRange: TimeRangeEnum,
});
export type AdminAnalytics = z.infer<typeof AdminAnalyticsSchema>;

// ─── MT-001 Tenant Provisioning ───────────────────────────────────

export const TenantStatusEnum = z.enum(['provisioning', 'active', 'suspended', 'deprovisioning', 'archived']);
export type TenantStatus = z.infer<typeof TenantStatusEnum>;

export const TenantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  status: TenantStatusEnum,
  plan: PlanEnum,
  ownerId: z.string().uuid(),
  region: z.string(),
  databaseUrl: z.string().optional(),
  storageNamespace: z.string(),
  maxUsers: z.number().int(),
  maxStorageBytes: z.number().int(),
  metadata: z.record(z.string()).default({}),
}).merge(TimestampsSchema);
export type Tenant = z.infer<typeof TenantSchema>;

export const CreateTenantSchema = z.object({
  slug: z.string().min(2).max(63),
  name: z.string().min(1),
  plan: PlanEnum,
  ownerId: z.string().uuid(),
  region: z.string().default('us-east-1'),
  maxUsers: z.number().int().default(10),
  maxStorageBytes: z.number().int().default(1073741824), // 1 GB
  metadata: z.record(z.string()).optional(),
});
export type CreateTenant = z.infer<typeof CreateTenantSchema>;

export const TenantResourceSchema = z.object({
  tenantId: z.string().uuid(),
  resourceType: z.enum(['database', 'storage', 'cache', 'queue', 'search']),
  resourceId: z.string(),
  status: z.enum(['provisioning', 'ready', 'error', 'deprovisioning']),
  config: z.record(z.unknown()).default({}),
}).merge(TimestampsSchema);
export type TenantResource = z.infer<typeof TenantResourceSchema>;

// ─── MT-002 Tenant Isolation ──────────────────────────────────────

export const IsolationLevelEnum = z.enum(['shared', 'schema', 'database', 'instance']);
export type IsolationLevel = z.infer<typeof IsolationLevelEnum>;

export const TenantContextSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: UserRoleEnum,
  isolationLevel: IsolationLevelEnum,
  permissions: z.array(z.string()),
});
export type TenantContext = z.infer<typeof TenantContextSchema>;

export const IsolationPolicySchema = z.object({
  tenantId: z.string().uuid(),
  isolationLevel: IsolationLevelEnum,
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']),
  encryptionRequired: z.boolean(),
  auditLogging: z.boolean(),
  crossTenantAccess: z.boolean().default(false),
}).merge(TimestampsSchema);
export type IsolationPolicy = z.infer<typeof IsolationPolicySchema>;

export const DataAccessLogSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  resource: z.string(),
  action: z.string(),
  allowed: z.boolean(),
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type DataAccessLog = z.infer<typeof DataAccessLogSchema>;

// ─── MT-003 Tenant Configuration ──────────────────────────────────

export const TenantBrandingSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  customDomain: z.string().optional(),
  companyName: z.string().optional(),
});
export type TenantBranding = z.infer<typeof TenantBrandingSchema>;

export const TenantLimitsSchema = z.object({
  maxUsers: z.number().int(),
  maxStorageBytes: z.number().int(),
  maxApiCallsPerDay: z.number().int(),
  maxProjectsPerUser: z.number().int(),
  maxFileUploadBytes: z.number().int(),
  customLimits: z.record(z.number()).default({}),
});
export type TenantLimits = z.infer<typeof TenantLimitsSchema>;

export const TenantConfigSchema = z.object({
  tenantId: z.string().uuid(),
  branding: TenantBrandingSchema,
  limits: TenantLimitsSchema,
  features: z.record(z.boolean()).default({}),
  settings: z.record(z.unknown()).default({}),
  locale: z.string().default('en'),
  timezone: z.string().default('UTC'),
}).merge(TimestampsSchema);
export type TenantConfig = z.infer<typeof TenantConfigSchema>;

export const UpdateTenantConfigSchema = z.object({
  branding: TenantBrandingSchema.partial().optional(),
  limits: TenantLimitsSchema.partial().optional(),
  features: z.record(z.boolean()).optional(),
  settings: z.record(z.unknown()).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});
export type UpdateTenantConfig = z.infer<typeof UpdateTenantConfigSchema>;

// ─── MT-004 Tenant Billing ────────────────────────────────────────

export const UsageRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  metric: z.string(),
  quantity: z.number(),
  unitCostCents: z.number().int(),
  totalCents: z.number().int(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
}).merge(TimestampsSchema);
export type UsageRecord = z.infer<typeof UsageRecordSchema>;

export const TenantInvoiceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  invoiceNumber: z.string(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']),
  subtotalCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPriceCents: z.number().int(),
    totalCents: z.number().int(),
  })),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  dueDate: z.string().datetime(),
  paidAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type TenantInvoice = z.infer<typeof TenantInvoiceSchema>;

export const UsageAggregationSchema = z.object({
  tenantId: z.string().uuid(),
  period: z.string(),
  metrics: z.record(z.object({
    totalQuantity: z.number(),
    totalCents: z.number().int(),
  })),
  totalCents: z.number().int(),
});
export type UsageAggregation = z.infer<typeof UsageAggregationSchema>;

// ─── MT-005 Tenant Admin ──────────────────────────────────────────

export const TenantMemberSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(['tenant_admin', 'tenant_manager', 'tenant_member', 'tenant_viewer']),
  status: z.enum(['active', 'invited', 'suspended']),
  invitedBy: z.string().uuid().optional(),
  joinedAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type TenantMember = z.infer<typeof TenantMemberSchema>;

export const TenantAdminRoleEnum = z.enum(['tenant_admin', 'tenant_manager', 'tenant_member', 'tenant_viewer']);
export type TenantAdminRole = z.infer<typeof TenantAdminRoleEnum>;

export const InviteTenantMemberSchema = z.object({
  email: z.string().email(),
  role: TenantAdminRoleEnum,
  tenantId: z.string().uuid(),
});
export type InviteTenantMember = z.infer<typeof InviteTenantMemberSchema>;

export const UpdateTenantMemberSchema = z.object({
  role: TenantAdminRoleEnum.optional(),
  status: z.enum(['active', 'suspended']).optional(),
});
export type UpdateTenantMember = z.infer<typeof UpdateTenantMemberSchema>;

// ─── AFF-001 Affiliate Registration ──────────────────────────────

export const AffiliateStatusEnum = z.enum(['pending', 'approved', 'rejected', 'suspended', 'terminated']);
export type AffiliateStatus = z.infer<typeof AffiliateStatusEnum>;

export const AffiliateApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  companyName: z.string().optional(),
  website: z.string().url().optional(),
  promotionMethod: z.string(),
  expectedMonthlyReferrals: z.number().int(),
  taxId: z.string().optional(),
  country: z.string(),
  status: AffiliateStatusEnum,
  reviewedBy: z.string().uuid().optional(),
  reviewNotes: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type AffiliateApplication = z.infer<typeof AffiliateApplicationSchema>;

export const SubmitAffiliateApplicationSchema = z.object({
  companyName: z.string().optional(),
  website: z.string().url().optional(),
  promotionMethod: z.string().min(10),
  expectedMonthlyReferrals: z.number().int().min(1),
  taxId: z.string().optional(),
  country: z.string().min(2).max(2),
});
export type SubmitAffiliateApplication = z.infer<typeof SubmitAffiliateApplicationSchema>;

export const ReviewApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional(),
});
export type ReviewApplication = z.infer<typeof ReviewApplicationSchema>;

// ─── AFF-002 Referral Tracking ────────────────────────────────────

export const ReferralLinkSchema = z.object({
  id: z.string().uuid(),
  affiliateId: z.string().uuid(),
  code: z.string(),
  targetUrl: z.string().url(),
  campaign: z.string().optional(),
  totalClicks: z.number().int().default(0),
  uniqueClicks: z.number().int().default(0),
  conversions: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).merge(TimestampsSchema);
export type ReferralLink = z.infer<typeof ReferralLinkSchema>;

export const ClickEventSchema = z.object({
  id: z.string().uuid(),
  referralLinkId: z.string().uuid(),
  affiliateId: z.string().uuid(),
  ipHash: z.string(),
  userAgent: z.string(),
  referer: z.string().optional(),
  isUnique: z.boolean(),
  timestamp: z.string().datetime(),
});
export type ClickEvent = z.infer<typeof ClickEventSchema>;

export const ConversionEventSchema = z.object({
  id: z.string().uuid(),
  referralLinkId: z.string().uuid(),
  affiliateId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['signup', 'trial', 'purchase', 'upgrade']),
  revenueCents: z.number().int(),
  productId: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type ConversionEvent = z.infer<typeof ConversionEventSchema>;

export const CreateReferralLinkSchema = z.object({
  targetUrl: z.string().url(),
  campaign: z.string().optional(),
});
export type CreateReferralLink = z.infer<typeof CreateReferralLinkSchema>;

// ─── AFF-003 Commission Calculation ──────────────────────────────

export const CommissionTierSchema = z.object({
  minReferrals: z.number().int(),
  maxReferrals: z.number().int().optional(),
  ratePercent: z.number().min(0).max(100),
});
export type CommissionTier = z.infer<typeof CommissionTierSchema>;

export const CommissionRuleSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().optional(),
  type: z.enum(['one_time', 'recurring']),
  baseRatePercent: z.number().min(0).max(100),
  tiers: z.array(CommissionTierSchema).default([]),
  recurringDurationMonths: z.number().int().optional(),
  minPayoutCents: z.number().int().default(5000),
  isActive: z.boolean().default(true),
}).merge(TimestampsSchema);
export type CommissionRule = z.infer<typeof CommissionRuleSchema>;

export const CommissionRecordSchema = z.object({
  id: z.string().uuid(),
  affiliateId: z.string().uuid(),
  conversionId: z.string().uuid(),
  ruleId: z.string().uuid(),
  amountCents: z.number().int(),
  ratePercent: z.number(),
  status: z.enum(['pending', 'approved', 'paid', 'reversed']),
  isRecurring: z.boolean(),
  recurringMonth: z.number().int().optional(),
}).merge(TimestampsSchema);
export type CommissionRecord = z.infer<typeof CommissionRecordSchema>;

export const CreateCommissionRuleSchema = z.object({
  productId: z.string().optional(),
  type: z.enum(['one_time', 'recurring']),
  baseRatePercent: z.number().min(0).max(100),
  tiers: z.array(CommissionTierSchema).optional(),
  recurringDurationMonths: z.number().int().optional(),
  minPayoutCents: z.number().int().optional(),
});
export type CreateCommissionRule = z.infer<typeof CreateCommissionRuleSchema>;

// ─── AFF-004 Payout Management ────────────────────────────────────

export const PaymentMethodEnum = z.enum(['bank_transfer', 'paypal', 'stripe', 'check', 'crypto']);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PayoutStatusEnum = z.enum(['scheduled', 'processing', 'completed', 'failed', 'canceled']);
export type PayoutStatus = z.infer<typeof PayoutStatusEnum>;

export const PayoutSchema = z.object({
  id: z.string().uuid(),
  affiliateId: z.string().uuid(),
  amountCents: z.number().int(),
  currency: z.string().default('USD'),
  status: PayoutStatusEnum,
  paymentMethod: PaymentMethodEnum,
  paymentDetails: z.record(z.string()).default({}),
  scheduledDate: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
  failureReason: z.string().optional(),
  commissionIds: z.array(z.string().uuid()),
}).merge(TimestampsSchema);
export type Payout = z.infer<typeof PayoutSchema>;

export const PayoutScheduleSchema = z.object({
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  minimumThresholdCents: z.number().int().default(5000),
});
export type PayoutSchedule = z.infer<typeof PayoutScheduleSchema>;

export const AffiliatePaymentInfoSchema = z.object({
  affiliateId: z.string().uuid(),
  preferredMethod: PaymentMethodEnum,
  bankDetails: z.object({
    accountHolder: z.string(),
    routingNumber: z.string(),
    accountNumber: z.string(),
    bankName: z.string(),
  }).optional(),
  paypalEmail: z.string().email().optional(),
  cryptoWallet: z.object({
    currency: z.string(),
    address: z.string(),
  }).optional(),
}).merge(TimestampsSchema);
export type AffiliatePaymentInfo = z.infer<typeof AffiliatePaymentInfoSchema>;

// ─── AFF-005 Affiliate Dashboard Data ─────────────────────────────

export const EarningsSummarySchema = z.object({
  affiliateId: z.string().uuid(),
  totalEarnedCents: z.number().int(),
  pendingCents: z.number().int(),
  paidCents: z.number().int(),
  thisMonthCents: z.number().int(),
  lastMonthCents: z.number().int(),
  lifetimeReferrals: z.number().int(),
  activeReferrals: z.number().int(),
  conversionRate: z.number(),
});
export type EarningsSummary = z.infer<typeof EarningsSummarySchema>;

export const ReferralHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  referralCode: z.string(),
  userId: z.string().uuid(),
  userEmail: z.string().email().optional(),
  signupDate: z.string().datetime(),
  conversionDate: z.string().datetime().optional(),
  status: z.enum(['signed_up', 'trialing', 'converted', 'churned']),
  lifetimeValueCents: z.number().int(),
  commissionEarnedCents: z.number().int(),
});
export type ReferralHistoryEntry = z.infer<typeof ReferralHistoryEntrySchema>;

export const PerformanceMetricsSchema = z.object({
  affiliateId: z.string().uuid(),
  period: z.string(),
  clicks: z.number().int(),
  uniqueClicks: z.number().int(),
  signups: z.number().int(),
  conversions: z.number().int(),
  revenueCents: z.number().int(),
  commissionCents: z.number().int(),
  clickToSignupRate: z.number(),
  signupToConversionRate: z.number(),
});
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// ─── DX-002 ESLint/Prettier Shared Config ─────────────────────────

export const ESLintRuleSchema = z.object({
  rule: z.string(),
  severity: z.enum(['off', 'warn', 'error']),
  options: z.array(z.unknown()).optional(),
});
export type ESLintRule = z.infer<typeof ESLintRuleSchema>;

export const ESLintConfigSchema = z.object({
  extends: z.array(z.string()).default([]),
  parser: z.string().optional(),
  parserOptions: z.record(z.unknown()).default({}),
  plugins: z.array(z.string()).default([]),
  rules: z.record(z.union([z.string(), z.array(z.unknown())])).default({}),
  env: z.record(z.boolean()).default({}),
  overrides: z.array(z.object({
    files: z.array(z.string()),
    rules: z.record(z.union([z.string(), z.array(z.unknown())])).default({}),
  })).default([]),
});
export type ESLintConfig = z.infer<typeof ESLintConfigSchema>;

export const PrettierConfigSchema = z.object({
  printWidth: z.number().int().default(80),
  tabWidth: z.number().int().default(2),
  useTabs: z.boolean().default(false),
  semi: z.boolean().default(true),
  singleQuote: z.boolean().default(true),
  trailingComma: z.enum(['none', 'es5', 'all']).default('es5'),
  bracketSpacing: z.boolean().default(true),
  arrowParens: z.enum(['always', 'avoid']).default('always'),
  endOfLine: z.enum(['lf', 'crlf', 'cr', 'auto']).default('lf'),
});
export type PrettierConfig = z.infer<typeof PrettierConfigSchema>;

// ─── DX-004 CI/CD Pipeline Config Types ───────────────────────────

export const BuildStepSchema = z.object({
  name: z.string(),
  command: z.string(),
  workingDirectory: z.string().optional(),
  env: z.record(z.string()).default({}),
  timeout: z.number().int().default(600),
  retries: z.number().int().default(0),
  continueOnError: z.boolean().default(false),
  cacheKey: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
});
export type BuildStep = z.infer<typeof BuildStepSchema>;

export const DeploymentTargetSchema = z.object({
  name: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  provider: z.enum(['aws', 'gcp', 'azure', 'vercel', 'netlify', 'docker', 'custom']),
  region: z.string(),
  config: z.record(z.unknown()).default({}),
  requiredApprovals: z.number().int().default(0),
  autoPromote: z.boolean().default(false),
});
export type DeploymentTarget = z.infer<typeof DeploymentTargetSchema>;

export const TestStageSchema = z.object({
  name: z.string(),
  type: z.enum(['unit', 'integration', 'e2e', 'smoke', 'performance', 'security']),
  command: z.string(),
  coverageThreshold: z.number().min(0).max(100).optional(),
  parallelism: z.number().int().default(1),
  timeout: z.number().int().default(300),
  required: z.boolean().default(true),
  env: z.record(z.string()).default({}),
});
export type TestStage = z.infer<typeof TestStageSchema>;

export const PipelineConfigSchema = z.object({
  name: z.string(),
  trigger: z.object({
    branches: z.array(z.string()).default([]),
    events: z.array(z.enum(['push', 'pull_request', 'tag', 'schedule', 'manual'])).default([]),
    paths: z.array(z.string()).optional(),
    schedule: z.string().optional(),
  }),
  buildSteps: z.array(BuildStepSchema),
  testStages: z.array(TestStageSchema),
  deploymentTargets: z.array(DeploymentTargetSchema),
  notifications: z.object({
    slack: z.string().optional(),
    email: z.array(z.string().email()).default([]),
    onSuccess: z.boolean().default(false),
    onFailure: z.boolean().default(true),
  }).default({}),
});
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

// ─── DX-005 Shared Testing Utilities ──────────────────────────────

export const TestFactoryConfigSchema = z.object({
  modelName: z.string(),
  defaults: z.record(z.unknown()),
  sequences: z.record(z.number().int()).default({}),
  traits: z.record(z.record(z.unknown())).default({}),
});
export type TestFactoryConfig = z.infer<typeof TestFactoryConfigSchema>;

export const MockGeneratorConfigSchema = z.object({
  type: z.enum(['api', 'database', 'service', 'event']),
  name: z.string(),
  methods: z.array(z.object({
    name: z.string(),
    returnType: z.string(),
    defaultReturn: z.unknown(),
    throwOnCall: z.boolean().default(false),
  })),
  stateful: z.boolean().default(false),
});
export type MockGeneratorConfig = z.infer<typeof MockGeneratorConfigSchema>;

export const AssertionHelperSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum(['equality', 'collection', 'async', 'dom', 'api', 'schema']),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    optional: z.boolean().default(false),
  })),
});
export type AssertionHelper = z.infer<typeof AssertionHelperSchema>;

// ─── DX-006 API Documentation Generation Types ───────────────────

export const ParameterLocationEnum = z.enum(['query', 'path', 'header', 'body', 'cookie']);
export type ParameterLocation = z.infer<typeof ParameterLocationEnum>;

export const ApiParameterSchema = z.object({
  name: z.string(),
  location: ParameterLocationEnum,
  type: z.string(),
  required: z.boolean().default(false),
  description: z.string(),
  example: z.unknown().optional(),
  defaultValue: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
  deprecated: z.boolean().default(false),
});
export type ApiParameter = z.infer<typeof ApiParameterSchema>;

export const ApiResponseDocSchema = z.object({
  statusCode: z.number().int(),
  description: z.string(),
  contentType: z.string().default('application/json'),
  schema: z.record(z.unknown()).default({}),
  example: z.unknown().optional(),
  headers: z.record(z.string()).default({}),
});
export type ApiResponseDoc = z.infer<typeof ApiResponseDocSchema>;

export const EndpointSchemaDoc = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  path: z.string(),
  summary: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  parameters: z.array(ApiParameterSchema).default([]),
  requestBody: z.object({
    contentType: z.string().default('application/json'),
    schema: z.record(z.unknown()),
    required: z.boolean().default(true),
    description: z.string().optional(),
    example: z.unknown().optional(),
  }).optional(),
  responses: z.array(ApiResponseDocSchema),
  authentication: z.enum(['none', 'bearer', 'api_key', 'oauth2', 'basic']).default('bearer'),
  rateLimit: z.object({
    requestsPerMinute: z.number().int(),
    burstLimit: z.number().int().optional(),
  }).optional(),
  deprecated: z.boolean().default(false),
});
export type EndpointSchemaDoc = z.infer<typeof EndpointSchemaDoc>;

// ─── DX-007 Environment Validation ────────────────────────────────

export const EnvVarTypeEnum = z.enum(['string', 'number', 'boolean', 'url', 'email', 'port', 'json']);
export type EnvVarType = z.infer<typeof EnvVarTypeEnum>;

export const EnvVarSchemaEntrySchema = z.object({
  name: z.string(),
  type: EnvVarTypeEnum,
  required: z.boolean().default(true),
  default: z.string().optional(),
  description: z.string(),
  pattern: z.string().optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  allowedValues: z.array(z.string()).optional(),
  sensitive: z.boolean().default(false),
});
export type EnvVarSchemaEntry = z.infer<typeof EnvVarSchemaEntrySchema>;

export const ServiceEnvSchemaSchema = z.object({
  serviceName: z.string(),
  environment: z.enum(['development', 'staging', 'production', 'all']),
  variables: z.array(EnvVarSchemaEntrySchema),
});
export type ServiceEnvSchema = z.infer<typeof ServiceEnvSchemaSchema>;

export const EnvValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    variable: z.string(),
    message: z.string(),
    expected: z.string().optional(),
    received: z.string().optional(),
  })),
  warnings: z.array(z.object({
    variable: z.string(),
    message: z.string(),
  })),
  coercedValues: z.record(z.unknown()).default({}),
});
export type EnvValidationResult = z.infer<typeof EnvValidationResultSchema>;

// ─── SCALE-001 Horizontal Scaling Config ──────────────────────────

export const InstanceTypeEnum = z.enum(['small', 'medium', 'large', 'xlarge', '2xlarge', 'custom']);
export type InstanceType = z.infer<typeof InstanceTypeEnum>;

export const AutoScalingRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  metric: z.enum(['cpu', 'memory', 'requests_per_second', 'queue_depth', 'latency', 'custom']),
  threshold: z.number(),
  comparison: z.enum(['gt', 'gte', 'lt', 'lte']),
  scaleUp: z.object({
    increment: z.number().int(),
    cooldownSeconds: z.number().int().default(300),
  }),
  scaleDown: z.object({
    increment: z.number().int(),
    cooldownSeconds: z.number().int().default(600),
  }),
  minInstances: z.number().int().min(1),
  maxInstances: z.number().int(),
  enabled: z.boolean().default(true),
});
export type AutoScalingRule = z.infer<typeof AutoScalingRuleSchema>;

export const HealthThresholdSchema = z.object({
  metric: z.string(),
  healthy: z.number(),
  degraded: z.number(),
  unhealthy: z.number(),
  checkIntervalSeconds: z.number().int().default(30),
  consecutiveFailures: z.number().int().default(3),
});
export type HealthThreshold = z.infer<typeof HealthThresholdSchema>;

export const HorizontalScalingConfigSchema = z.object({
  serviceName: z.string(),
  instanceType: InstanceTypeEnum,
  autoScalingRules: z.array(AutoScalingRuleSchema),
  healthThresholds: z.array(HealthThresholdSchema),
  loadBalancer: z.object({
    algorithm: z.enum(['round_robin', 'least_connections', 'ip_hash', 'weighted']),
    healthCheckPath: z.string().default('/health'),
    healthCheckIntervalSeconds: z.number().int().default(30),
    drainTimeoutSeconds: z.number().int().default(30),
  }),
  deployment: z.object({
    strategy: z.enum(['rolling', 'blue_green', 'canary']),
    maxSurge: z.number().int().default(1),
    maxUnavailable: z.number().int().default(0),
  }),
});
export type HorizontalScalingConfig = z.infer<typeof HorizontalScalingConfigSchema>;

// ─── SCALE-002 Database Sharding Strategy Types ───────────────────

export const ShardKeyDefinitionSchema = z.object({
  table: z.string(),
  column: z.string(),
  type: z.enum(['hash', 'range', 'directory', 'geographic']),
  shardCount: z.number().int().min(1),
});
export type ShardKeyDefinition = z.infer<typeof ShardKeyDefinitionSchema>;

export const ShardRoutingRuleSchema = z.object({
  id: z.string().uuid(),
  shardKeyDefinition: ShardKeyDefinitionSchema,
  routingFunction: z.enum(['modulo', 'consistent_hash', 'range_lookup', 'directory_lookup']),
  shardMap: z.record(z.string()).default({}),
  rangePartitions: z.array(z.object({
    min: z.string(),
    max: z.string(),
    shardId: z.string(),
  })).default([]),
});
export type ShardRoutingRule = z.infer<typeof ShardRoutingRuleSchema>;

export const ShardMigrationPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sourceShardId: z.string(),
  targetShardId: z.string(),
  tables: z.array(z.string()),
  strategy: z.enum(['online', 'offline', 'shadow']),
  status: z.enum(['planned', 'in_progress', 'completed', 'failed', 'rolled_back']),
  estimatedRows: z.number().int(),
  migratedRows: z.number().int().default(0),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type ShardMigrationPlan = z.infer<typeof ShardMigrationPlanSchema>;

export const ShardingStrategySchema = z.object({
  name: z.string(),
  shardKeys: z.array(ShardKeyDefinitionSchema),
  routingRules: z.array(ShardRoutingRuleSchema),
  migrations: z.array(ShardMigrationPlanSchema),
  replicationFactor: z.number().int().min(1).default(1),
  crossShardQuerySupport: z.boolean().default(false),
});
export type ShardingStrategy = z.infer<typeof ShardingStrategySchema>;

// ─── Product Auth (SH-001, BC-001, VH-001, VP-001, SL-001) ──────

export const ProductIdEnum = z.enum([
  'shorts_linker',
  'brand_creator',
  'video_harvest',
  'voice_pulse',
  'shorts_lab',
]);
export type ProductId = z.infer<typeof ProductIdEnum>;

export const ProductPermissionSchema = z.object({
  action: z.string(),
  resource: z.string(),
  conditions: z.record(z.unknown()).default({}),
});
export type ProductPermission = z.infer<typeof ProductPermissionSchema>;

export const ProductAuthConfigSchema = z.object({
  productId: ProductIdEnum,
  productName: z.string(),
  requiredScopes: z.array(z.string()),
  permissions: z.array(ProductPermissionSchema),
  oauthProviders: z.array(z.enum(['google', 'github', 'twitter', 'facebook', 'apple'])).default([]),
  sessionDurationMinutes: z.number().int().default(1440),
  mfaRequired: z.boolean().default(false),
  allowedOrigins: z.array(z.string()).default([]),
  webhookUrl: z.string().url().optional(),
  rateLimits: z.object({
    loginAttemptsPerMinute: z.number().int().default(10),
    apiCallsPerMinute: z.number().int().default(60),
  }).default({}),
});
export type ProductAuthConfig = z.infer<typeof ProductAuthConfigSchema>;

// ─── Product Publishing (MP-CF-001, MP-SL-001, CC-001) ───────────

export const ContentStatusEnum = z.enum(['draft', 'review', 'approved', 'publishing', 'published', 'failed', 'archived']);
export type ContentStatus = z.infer<typeof ContentStatusEnum>;

export const ContentHandoffSchema = z.object({
  id: z.string().uuid(),
  sourceProduct: z.string(),
  targetProduct: z.string(),
  contentId: z.string().uuid(),
  contentType: z.enum(['video', 'short', 'image', 'audio', 'text', 'bundle']),
  status: ContentStatusEnum,
  metadata: z.record(z.unknown()).default({}),
  sourceUrl: z.string().url().optional(),
  processedUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
}).merge(TimestampsSchema);
export type ContentHandoff = z.infer<typeof ContentHandoffSchema>;

export const StatusSyncSchema = z.object({
  contentId: z.string().uuid(),
  sourceProduct: z.string(),
  targetProduct: z.string(),
  sourceStatus: ContentStatusEnum,
  targetStatus: ContentStatusEnum,
  syncedAt: z.string().datetime(),
  conflictResolution: z.enum(['source_wins', 'target_wins', 'manual']).default('source_wins'),
});
export type StatusSync = z.infer<typeof StatusSyncSchema>;

export const ShortsPublishingSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string().uuid(),
  platforms: z.array(z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'twitter'])),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
  publishedUrls: z.record(z.string()).default({}),
  status: ContentStatusEnum,
  thumbnailUrl: z.string().url().optional(),
}).merge(TimestampsSchema);
export type ShortsPublishing = z.infer<typeof ShortsPublishingSchema>;

export const PublishingTargetEnum = z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'blog', 'email', 'custom']);
export type PublishingTarget = z.infer<typeof PublishingTargetEnum>;

export const ContentCreatorPublishingSchema = z.object({
  id: z.string().uuid(),
  contentType: z.enum(['article', 'video', 'podcast', 'infographic', 'social_post', 'newsletter']),
  title: z.string(),
  body: z.string().optional(),
  targets: z.array(PublishingTargetEnum),
  publishedTargets: z.record(z.object({
    url: z.string(),
    publishedAt: z.string().datetime(),
    status: ContentStatusEnum,
  })).default({}),
  status: ContentStatusEnum,
  authorId: z.string().uuid(),
}).merge(TimestampsSchema);
export type ContentCreatorPublishing = z.infer<typeof ContentCreatorPublishingSchema>;

// ─── Cross-Product Data (GAPRADAR-001/002, MOBILE-001/002) ───────

export const CompetitorDataSchema = z.object({
  id: z.string().uuid(),
  competitorName: z.string(),
  domain: z.string(),
  products: z.array(z.object({
    name: z.string(),
    category: z.string(),
    priceRange: z.object({
      minCents: z.number().int(),
      maxCents: z.number().int(),
      currency: z.string().default('USD'),
    }).optional(),
    features: z.array(z.string()),
  })),
  lastScrapedAt: z.string().datetime().optional(),
  dataSource: z.enum(['manual', 'scraper', 'api', 'third_party']),
}).merge(TimestampsSchema);
export type CompetitorData = z.infer<typeof CompetitorDataSchema>;

export const SyncConfigSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  frequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']),
  dataTypes: z.array(z.string()),
  transformRules: z.array(z.object({
    field: z.string(),
    transform: z.enum(['copy', 'map', 'filter', 'aggregate', 'custom']),
    config: z.record(z.unknown()).default({}),
  })).default([]),
  enabled: z.boolean().default(true),
  lastSyncAt: z.string().datetime().optional(),
});
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export const MarketGapSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  description: z.string(),
  competitorsCovering: z.array(z.string()),
  ourCoverage: z.enum(['none', 'partial', 'full']),
  opportunityScore: z.number().min(0).max(100),
  estimatedRevenueImpactCents: z.number().int(),
  effort: z.enum(['low', 'medium', 'high']),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']),
  status: z.enum(['identified', 'analyzing', 'planned', 'in_progress', 'shipped', 'discarded']),
}).merge(TimestampsSchema);
export type MarketGap = z.infer<typeof MarketGapSchema>;

export const OpportunityScoringSchema = z.object({
  gapId: z.string().uuid(),
  marketSize: z.number(),
  competitorCount: z.number().int(),
  demandSignals: z.number().int(),
  implementationComplexity: z.number().min(0).max(100),
  strategicAlignment: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  recommendation: z.enum(['pursue', 'investigate', 'monitor', 'skip']),
  scoredAt: z.string().datetime(),
});
export type OpportunityScoring = z.infer<typeof OpportunityScoringSchema>;

export const MobileEndpointSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  description: z.string(),
  optimizations: z.array(z.enum([
    'compressed_response',
    'field_selection',
    'pagination',
    'caching',
    'delta_sync',
  ])).default([]),
  maxPayloadBytes: z.number().int().optional(),
  requiresAuth: z.boolean().default(true),
  offlineCapable: z.boolean().default(false),
});
export type MobileEndpoint = z.infer<typeof MobileEndpointSchema>;

export const PushNotificationTokenSchema = z.object({
  userId: z.string().uuid(),
  token: z.string(),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string(),
  isActive: z.boolean().default(true),
  lastUsedAt: z.string().datetime().optional(),
}).merge(TimestampsSchema);
export type PushNotificationToken = z.infer<typeof PushNotificationTokenSchema>;

export const OfflineSyncSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  operation: z.enum(['create', 'update', 'delete']),
  data: z.record(z.unknown()),
  localTimestamp: z.string().datetime(),
  serverTimestamp: z.string().datetime().optional(),
  status: z.enum(['pending', 'synced', 'conflict', 'resolved']),
  conflictResolution: z.enum(['client_wins', 'server_wins', 'manual', 'merge']).optional(),
});
export type OfflineSync = z.infer<typeof OfflineSyncSchema>;

export const ConflictResolutionSchema = z.object({
  syncId: z.string().uuid(),
  clientVersion: z.record(z.unknown()),
  serverVersion: z.record(z.unknown()),
  resolvedVersion: z.record(z.unknown()).optional(),
  strategy: z.enum(['client_wins', 'server_wins', 'manual', 'merge']),
  resolvedAt: z.string().datetime().optional(),
  resolvedBy: z.string().uuid().optional(),
});
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;
