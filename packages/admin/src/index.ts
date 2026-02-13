// @acd/admin - Super admin panel, multi-tenancy, affiliates, billing admin
// Covers: ADMIN-001..006, MT-001..005, AFF-001..005, system config, product management

// ── Types & Schemas ──────────────────────────────────────────────────────────
export {
  // Pagination
  PaginationParamsSchema, type PaginationParams,
  PaginatedResultSchema,
  TimestampsSchema, type Timestamps,

  // User Management (ADMIN-001, ADMIN-004, ADMIN-005, ADMIN-006)
  UserStatusEnum, type UserStatus,
  UserRoleEnum, type UserRole,
  AdminUserSchema, type AdminUser,
  UserFilterSchema, type UserFilter,
  CreateUserSchema, type CreateUser,
  UpdateUserSchema, type UpdateUser,

  // Roles & Permissions (ADMIN-001, ADMIN-002)
  PermissionSchema, type Permission,
  RoleDefinitionSchema, type RoleDefinition,
  CreateRoleSchema, type CreateRole,
  RoleAssignmentSchema, type RoleAssignment,

  // Product Management
  ProductStatusEnum, type ProductStatus,
  ProductRegistryEntrySchema, type ProductRegistryEntry,
  ProductAccessSchema, type ProductAccess,
  CreateProductSchema, type CreateProduct,

  // Billing Admin (BILL-001..006)
  PlanEnum, type Plan,
  SubscriptionStatusEnum, type SubscriptionStatus,
  SubscriptionSchema, type Subscription,
  CreditApplicationSchema, type CreditApplication,
  PlanOverrideSchema, type PlanOverride,
  ApplyCreditSchema, type ApplyCredit,
  OverridePlanSchema, type OverridePlan,

  // System Config (ADMIN-003)
  ConfigValueTypeEnum, type ConfigValueType,
  SystemConfigEntrySchema, type SystemConfigEntry,
  FeatureToggleSchema, type FeatureToggle,
  EnvVarDefinitionSchema, type EnvVarDefinition,
  SetConfigSchema, type SetConfig,
  SetFeatureToggleSchema, type SetFeatureToggle,

  // Analytics (ADMIN dashboard)
  TimeRangeEnum, type TimeRange,
  SystemMetricsSchema, type SystemMetrics,
  UserGrowthPointSchema, type UserGrowthPoint,
  RevenueTrendPointSchema, type RevenueTrendPoint,
  AdminAnalyticsSchema, type AdminAnalytics,

  // Multi-tenancy (MT-001..005)
  TenantStatusEnum, type TenantStatus,
  TenantSchema, type Tenant,
  CreateTenantSchema, type CreateTenant,
  TenantResourceSchema, type TenantResource,
  IsolationLevelEnum, type IsolationLevel,
  TenantContextSchema, type TenantContext,
  IsolationPolicySchema, type IsolationPolicy,
  DataAccessLogSchema, type DataAccessLog,
  TenantBrandingSchema, type TenantBranding,
  TenantLimitsSchema, type TenantLimits,
  TenantConfigSchema, type TenantConfig,
  UpdateTenantConfigSchema, type UpdateTenantConfig,
  UsageRecordSchema, type UsageRecord,
  TenantInvoiceSchema, type TenantInvoice,
  UsageAggregationSchema, type UsageAggregation,
  TenantMemberSchema, type TenantMember,
  TenantAdminRoleEnum, type TenantAdminRole,
  InviteTenantMemberSchema, type InviteTenantMember,
  UpdateTenantMemberSchema, type UpdateTenantMember,

  // Affiliates (AFF-001..005)
  AffiliateStatusEnum, type AffiliateStatus,
  AffiliateApplicationSchema, type AffiliateApplication,
  SubmitAffiliateApplicationSchema, type SubmitAffiliateApplication,
  ReviewApplicationSchema, type ReviewApplication,
  ReferralLinkSchema, type ReferralLink,
  ClickEventSchema, type ClickEvent,
  ConversionEventSchema, type ConversionEvent,
  CreateReferralLinkSchema, type CreateReferralLink,
  CommissionTierSchema, type CommissionTier,
  CommissionRuleSchema, type CommissionRule,
  CommissionRecordSchema, type CommissionRecord,
  CreateCommissionRuleSchema, type CreateCommissionRule,
  PaymentMethodEnum, type PaymentMethod,
  PayoutStatusEnum, type PayoutStatus,
  PayoutSchema, type Payout,
  PayoutScheduleSchema, type PayoutSchedule,
  AffiliatePaymentInfoSchema, type AffiliatePaymentInfo,
  EarningsSummarySchema, type EarningsSummary,
  ReferralHistoryEntrySchema, type ReferralHistoryEntry,
  PerformanceMetricsSchema, type PerformanceMetrics,

  // DX types
  ESLintRuleSchema, type ESLintRule,
  ESLintConfigSchema, type ESLintConfig,
  PrettierConfigSchema, type PrettierConfig,
  BuildStepSchema, type BuildStep,
  DeploymentTargetSchema, type DeploymentTarget,
  TestStageSchema, type TestStage,
  PipelineConfigSchema, type PipelineConfig,
  TestFactoryConfigSchema, type TestFactoryConfig,
  MockGeneratorConfigSchema, type MockGeneratorConfig,
  AssertionHelperSchema, type AssertionHelper,

  // API Documentation types (DX-002)
  ParameterLocationEnum, type ParameterLocation,
  ApiParameterSchema, type ApiParameter,
  ApiResponseDocSchema, type ApiResponseDoc,
  EndpointSchemaDoc,

  // Environment validation (DX-004)
  EnvVarTypeEnum, type EnvVarType,
  EnvVarSchemaEntrySchema, type EnvVarSchemaEntry,
  ServiceEnvSchemaSchema, type ServiceEnvSchema,
  EnvValidationResultSchema, type EnvValidationResult,

  // Scaling types (SCALE-001, SCALE-002)
  InstanceTypeEnum, type InstanceType,
  AutoScalingRuleSchema, type AutoScalingRule,
  HealthThresholdSchema, type HealthThreshold,
  HorizontalScalingConfigSchema, type HorizontalScalingConfig,
  ShardKeyDefinitionSchema, type ShardKeyDefinition,
  ShardRoutingRuleSchema, type ShardRoutingRule,
  ShardMigrationPlanSchema, type ShardMigrationPlan,
  ShardingStrategySchema, type ShardingStrategy,

  // Product auth types (SH-001, BC-001, VH-001, VP-001, SL-001)
  ProductIdEnum, type ProductId,
  ProductPermissionSchema, type ProductPermission,
  ProductAuthConfigSchema, type ProductAuthConfig,

  // Content handoff types (MP-CF-001, MP-SL-001, CC-001)
  ContentStatusEnum, type ContentStatus,
  ContentHandoffSchema, type ContentHandoff,
  StatusSyncSchema, type StatusSync,
  ShortsPublishingSchema, type ShortsPublishing,
  PublishingTargetEnum, type PublishingTarget,
  ContentCreatorPublishingSchema, type ContentCreatorPublishing,

  // GapRadar types (GAPRADAR-001, GAPRADAR-002)
  CompetitorDataSchema, type CompetitorData,
  SyncConfigSchema, type SyncConfig,
  MarketGapSchema, type MarketGap,
  OpportunityScoringSchema, type OpportunityScoring,

  // Mobile types (MOBILE-001, MOBILE-002)
  MobileEndpointSchema, type MobileEndpoint,
  PushNotificationTokenSchema, type PushNotificationToken,
  OfflineSyncSchema, type OfflineSync,
  ConflictResolutionSchema, type ConflictResolution,
} from './types';

// ── User Management (ADMIN-001, ADMIN-004, ADMIN-005, ADMIN-006) ─────────────
export {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  bulkUpdateStatus,
  getAllUsers,
  clearUserStore,
} from './user-mgmt';

// ── Roles & Permissions (ADMIN-001, ADMIN-002) ──────────────────────────────
export {
  initializeDefaultRoles,
  createRole,
  getRoleById,
  listRoles,
  updateRole,
  deleteRole,
  assignRole,
  getUserRoleAssignments,
  revokeRole,
  getEffectivePermissions,
  hasPermission,
  getRoleHierarchy,
  clearRoleStores,
} from './roles';

// ── System Config (ADMIN-003) ───────────────────────────────────────────────
export {
  setConfig,
  getConfig,
  getConfigValue,
  listConfig,
  deleteConfig,
  setFeatureToggle,
  getFeatureToggle,
  isFeatureEnabled,
  listFeatureToggles,
  deleteFeatureToggle,
  setEnvVar,
  getEnvVar,
  listEnvVars,
  deleteEnvVar,
  clearConfigStores,
} from './system-config';

// ── Admin Analytics ─────────────────────────────────────────────────────────
export {
  recordMetricsSnapshot,
  getLatestMetrics,
  recordUserGrowth,
  recordRevenueTrend,
  updateProductMetrics,
  getAnalyticsOverview,
  getUserGrowthData,
  getRevenueTrendData,
  getTopProductsByRevenue,
  getTopProductsByUsers,
  calculateGrowthRate,
  clearAnalyticsStores,
} from './admin-analytics';

// ── Product Management ──────────────────────────────────────────────────────
export {
  registerProduct,
  getProductById,
  getProductBySlug,
  listProducts,
  updateProduct,
  setProductStatus,
  grantProductAccess,
  revokeProductAccess,
  hasProductAccess,
  getEntityProducts,
  getProductEntities,
  clearProductStores,
} from './product-mgmt';

// ── Billing Admin ───────────────────────────────────────────────────────────
export {
  listSubscriptions,
  getSubscriptionById,
  getUserSubscriptions,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  applyCredit,
  getUserCredits,
  getAvailableCredits,
  overridePlan,
  getActivePlanOverride,
  getEffectivePlan,
  getUserPlanOverrides,
  clearBillingStores,
} from './billing-admin';

// ── Tenant Provisioning (MT-001) ────────────────────────────────────────────
export {
  provisionTenant,
  getTenantById,
  getTenantBySlug,
  listTenants,
  updateTenant,
  suspendTenant,
  reactivateTenant,
  deprovisionTenant,
  getTenantResources,
  addTenantResource,
  clearTenantProvisionStores,
} from './tenant-provision';

// ── Tenant Admin / Members (MT-002, MT-003) ─────────────────────────────────
export {
  addTenantOwner,
  inviteMember,
  acceptInvitation,
  listTenantMembers,
  getTenantMember,
  updateTenantMember,
  removeTenantMember,
  suspendTenantMember,
  reactivateTenantMember,
  changeMemberRole,
  countMembersByRole,
  getUserTenants,
  hasTenantRole,
  clearTenantAdminStores,
} from './tenant-admin';

// ── Tenant Config (MT-004) ──────────────────────────────────────────────────
export {
  initializeTenantConfig,
  getTenantConfig,
  updateTenantConfig,
  updateTenantBranding,
  updateTenantLimits,
  setTenantFeature,
  isTenantFeatureEnabled,
  setTenantSetting,
  getTenantSetting,
  checkTenantLimit,
  listTenantConfigs,
  deleteTenantConfig,
  clearTenantConfigStore,
} from './tenant-config';

// ── Tenant Isolation (MT-005) ───────────────────────────────────────────────
export {
  setIsolationPolicy,
  getIsolationPolicy,
  createTenantContext,
  getTenantContext,
  removeTenantContext,
  enforceIsolation,
  logAccess,
  getAccessLogs,
  getDeniedAccessLogs,
  validateTenantScope,
  getTenantNamespace,
  clearIsolationStores,
} from './tenant-isolation';

// ── Tenant Billing ──────────────────────────────────────────────────────────
export {
  recordUsage,
  getUsageRecords,
  aggregateUsage,
  generateInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  sendInvoice,
  markInvoicePaid,
  voidInvoice,
  getAllOutstandingInvoices,
  clearTenantBillingStores,
} from './tenant-billing';

// ── Affiliate Registration (AFF-001, AFF-002) ──────────────────────────────
export {
  submitApplication,
  reviewApplication,
  getApplicationById,
  getApplicationByUserId,
  listApplications,
  getPendingApplicationsCount,
  suspendAffiliate,
  terminateAffiliate,
  isApprovedAffiliate,
  clearAffiliateRegistrationStores,
} from './affiliate-registration';

// ── Commissions (AFF-003) ───────────────────────────────────────────────────
export {
  createCommissionRule,
  getCommissionRuleById,
  listCommissionRules,
  getApplicableRule,
  getEffectiveRate,
  calculateCommission,
  calculateRecurringCommission,
  getAffiliateCommissions,
  approveCommissions,
  reverseCommission,
  getPendingCommissionTotal,
  setAffiliateReferralCount,
  updateCommissionRule,
  deactivateCommissionRule,
  clearCommissionStores,
} from './commissions';

// ── Referral Tracking (AFF-001, AFF-002) ────────────────────────────────────
export {
  createReferralLink,
  getReferralLinkById,
  getReferralLinkByCode,
  listAffiliateLinks,
  trackClick,
  trackConversion,
  getClickEvents,
  getConversionEvents,
  getAttributedAffiliate,
  deactivateLink,
  getAffiliateStats,
  clearReferralTrackingStores,
} from './referral-tracking';
