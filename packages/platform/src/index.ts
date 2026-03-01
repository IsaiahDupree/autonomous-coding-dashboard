// @acd/platform - Cross-product platform services
// Covers: SEARCH-001..004, MOB-001..004, I18N-001..004, OB-001..005,
//         MOD-001..004, EXP-001..004

// ── Types & Schemas ──────────────────────────────────────────────────────────
export {
  // Search types (SEARCH-001..004)
  FieldTypeSchema, type FieldType,
  IndexFieldSchema, type IndexField,
  IndexDefinitionSchema, type IndexDefinition,
  IndexedDocumentSchema, type IndexedDocument,
  SearchFilterOperatorSchema, type SearchFilterOperator,
  SearchFilterSchema, type SearchFilter,
  FacetRequestSchema, type FacetRequest,
  SearchQuerySchema, type SearchQuery,
  SearchHitSchema, type SearchHit,
  FacetBucketSchema, type FacetBucket,
  SearchResultSchema, type SearchResult,
  SuggestionTypeSchema, type SuggestionType,
  SearchSuggestionSchema, type SearchSuggestion,
  SuggestionRequestSchema, type SuggestionRequest,
  PopularQuerySchema, type PopularQuery,
  SearchEventTypeSchema, type SearchEventType,
  SearchAnalyticsEventSchema, type SearchAnalyticsEvent,
  SearchQualityMetricsSchema, type SearchQualityMetrics,

  // i18n types (I18N-001..004)
  PluralFormSchema, type PluralForm,
  TranslationValueSchema, type TranslationValue,
  TranslationKeySchema, type TranslationKey,
  TranslationBundleSchema, type TranslationBundle,
  I18nConfigSchema, type I18nConfig,
  LocaleSourceSchema, type LocaleSource,
  LocaleDetectionResultSchema, type LocaleDetectionResult,
  LocaleDetectionConfigSchema, type LocaleDetectionConfig,
  DateFormatStyleSchema, type DateFormatStyle,
  NumberFormatStyleSchema, type NumberFormatStyle,
  CurrencyDisplaySchema, type CurrencyDisplay,
  FormatOptionsSchema, type FormatOptions,
  TextDirectionSchema, type TextDirection,
  RTLConfigSchema, type RTLConfig,
  LayoutMirrorRuleSchema, type LayoutMirrorRule,

  // Mobile types (MOB-001..004)
  FieldSelectionSchema, type FieldSelection,
  PaginationSchema, type Pagination,
  CompressedResponseSchema, type CompressedResponse,
  MobileApiRequestSchema, type MobileApiRequest,
  MobileApiResponseSchema, type MobileApiResponse,
  NotificationPrioritySchema, type NotificationPriority,
  PushNotificationPayloadSchema, type PushNotificationPayload,
  DeviceTokenSchema, type DeviceToken,
  TopicSubscriptionSchema, type TopicSubscription,
  SyncStatusSchema, type SyncStatus,
  ConflictResolutionStrategySchema, type ConflictResolutionStrategy,
  SyncQueueItemSchema, type SyncQueueItem,
  MergeRuleSchema, type MergeRule,
  SyncConflictSchema, type SyncConflict,
  DeepLinkSchemeSchema, type DeepLinkScheme,
  DeepLinkRouteSchema, type DeepLinkRoute,
  DeepLinkConfigSchema, type DeepLinkConfig,
  ResolvedDeepLinkSchema, type ResolvedDeepLink,

  // Onboarding types (OB-001..005)
  OnboardingStepTypeSchema, type OnboardingStepType,
  OnboardingStepSchema, type OnboardingStep,
  OnboardingFlowSchema, type OnboardingFlow,
  OnboardingProgressSchema, type OnboardingProgress,
  TooltipPlacementSchema, type TooltipPlacement,
  TourTriggerSchema, type TourTrigger,
  TourStepSchema, type TourStep,
  ProductTourSchema, type ProductTour,
  ChecklistItemStatusSchema, type ChecklistItemStatus,
  ChecklistItemSchema, type ChecklistItem,
  ChecklistSchema, type Checklist,
  ChecklistProgressSchema, type ChecklistProgress,
  EmailSequenceSchema, type EmailSequence,
  EmailSendStatusSchema, type EmailSendStatus,
  EmailSendRecordSchema, type EmailSendRecord,
  PreferenceCategorySchema, type PreferenceCategory,
  PreferenceFieldTypeSchema, type PreferenceFieldType,
  PreferenceDefinitionSchema, type PreferenceDefinition,
  UserPreferencesSchema, type UserPreferences,

  // Moderation types (MOD-001..004)
  ModerationStatusSchema, type ModerationStatus,
  ModerationItemTypeSchema, type ModerationItemType,
  ModerationItemSchema, type ModerationItem,
  ModerationDecisionSchema, type ModerationDecision,
  FilterSeveritySchema, type FilterSeverity,
  FilterActionSchema, type FilterAction,
  ContentFilterRuleSchema, type ContentFilterRule,
  FilterResultSchema, type FilterResult,
  ReportTypeSchema, type ReportType,
  ReportStatusSchema, type ReportStatus,
  ResolutionActionSchema, type ResolutionAction,
  UserReportSchema, type UserReport,
  ModerationQueueStatsSchema, type ModerationQueueStats,
  ModeratorPerformanceSchema, type ModeratorPerformance,
  ModerationResolutionRatesSchema, type ModerationResolutionRates,

  // Export/Import types (EXP-001..004)
  ExportFormatSchema, type ExportFormat,
  ExportJobStatusSchema, type ExportJobStatus,
  ExportJobSchema, type ExportJob,
  ImportJobStatusSchema, type ImportJobStatus,
  FieldMappingSchema, type FieldMapping,
  ImportValidationRuleSchema, type ImportValidationRule,
  ImportErrorSchema, type ImportError,
  ImportJobSchema, type ImportJob,
  BulkOperationTypeSchema, type BulkOperationType,
  BulkOperationStatusSchema, type BulkOperationStatus,
  BulkOperationItemSchema, type BulkOperationItem,
  BulkOperationJobSchema, type BulkOperationJob,
  MigrationStepStatusSchema, type MigrationStepStatus,
  TransformationRuleSchema, type TransformationRule,
  MigrationStepSchema, type MigrationStep,
  MigrationPlanSchema, type MigrationPlan,
} from './types';

// ── Utils ───────────────────────────────────────────────────────────────────
export {
  v4Fallback,
  levenshteinDistance,
  tokenize,
  highlightText,
  deepClone,
} from './utils';

// ── Search (SEARCH-001..004) ────────────────────────────────────────────────
export {
  SearchIndexManager,
  type CreateIndexInput,
  type IndexStats,
} from './search-index';

export {
  SearchQueryEngine,
} from './search-query';

export {
  SearchAnalyticsTracker,
  type LogQueryInput,
  type LogClickInput,
} from './search-analytics';

export {
  SearchSuggestionEngine,
} from './search-suggest';

// ── Mobile (MOB-001..004) ───────────────────────────────────────────────────
export {
  MobileApiOptimizer,
  type DataSource,
} from './mobile-api';

export {
  PushNotificationManager,
  type SendNotificationInput,
  type NotificationDeliveryRecord,
} from './mobile-push';

export {
  DeepLinkManager,
} from './mobile-deeplink';

export {
  OfflineSyncManager,
  type EnqueueSyncInput,
} from './mobile-sync';

// ── i18n (I18N-001..004) ────────────────────────────────────────────────────
export {
  TranslationKeyManager,
  type AddTranslationInput,
} from './i18n-keys';

export {
  LocaleDetector,
  type LocaleDetectionContext,
} from './i18n-locale';

export {
  I18nFormatter,
  type RelativeTimeInput,
} from './i18n-format';

export {
  RTLSupportManager,
} from './i18n-rtl';

// ── Onboarding (OB-001..005) ────────────────────────────────────────────────
export {
  OnboardingFlowEngine,
  type CreateFlowInput,
} from './onboarding-flow';

export {
  ProductTourManager,
  type CreateTourInput,
  type TourProgress,
} from './product-tour';

export {
  createEmailSequence,
  getSequenceById,
  listSequences,
  toggleSequence,
  triggerSequence,
  getUserSendRecords,
  updateSendStatus,
  clearEmailSequenceStores,
  type CreateSequenceInput,
  type EmailSender,
} from './email-sequences';

export {
  createChecklist,
  getChecklistById,
  listChecklists,
  startUserChecklist,
  getUserChecklistProgress,
  updateItemStatus,
  dismissChecklist,
  getActivationMetrics,
  seedDemoData,
  clearChecklistStores,
  type CreateChecklistInput,
  type DemoDataSeeder,
} from './checklist';

export {
  registerPreferenceCategory,
  registerPreferenceDefinition,
  getPreferenceDefinitions,
  getUserPreferences,
  setUserPreference,
  resetUserPreferences,
  clearPreferenceStores,
} from './preferences';

// ── Moderation (MOD-001..004) ───────────────────────────────────────────────
export {
  submitForModeration,
  getItemById,
  listPendingItems,
  assignToModerator,
  recordDecision,
  escalateItem,
  getQueueStats,
  getModeratorPerformance,
  getResolutionRates,
  clearModerationStores,
  type SubmitContentInput,
} from './moderation-queue';

export {
  createFilterRule,
  getFilterRuleById,
  listFilterRules,
  updateFilterRule,
  toggleFilterRule,
  deleteFilterRule,
  filterContent,
  clearFilterRuleStore,
  type CreateFilterRuleInput,
} from './content-filter';

export {
  submitReport,
  getReportById,
  listReports,
  assignReportToModerator,
  resolveReport,
  dismissReport,
  escalateReport,
  getReportsByUser,
  getReportsAgainstUser,
  clearReportStore,
  type SubmitReportInput,
} from './user-reports';

// ── Export/Import (EXP-001..004) ────────────────────────────────────────────
export {
  createExportJob,
  processExportJob,
  getExportJobById,
  listExportJobs,
  cancelExportJob,
  clearExportJobStore,
  type CreateExportInput,
  type DataFetcher,
} from './export-engine';

export {
  createImportJob,
  processImportJob,
  getImportJobById,
  listImportJobs,
  cancelImportJob,
  clearImportJobStore,
  type CreateImportInput,
  type RecordPersister,
} from './import-engine';

export {
  createBulkOperation,
  executeBulkOperation,
  getBulkOperationById,
  listBulkOperations,
  createMigrationPlan,
  getMigrationPlanById,
  listMigrationPlans,
  updateMigrationStatus,
  clearBulkOperationStores,
  type CreateBulkOperationInput,
  type BulkOperationHandler,
  type CreateMigrationInput,
} from './bulk-operations';

// ── SEO (AUTH-WC-061 through AUTH-WC-065) ──────────────────────────────────
export {
  generateMetaTags,
  toNextMetadata,
  PRODUCT_METADATA,
  generateSitemap,
  generateSitemapIndex,
  routesToSitemapEntries,
  generateRobotsTxt,
  generateJsonLd,
  createOrganizationSchema,
  createWebSiteSchema,
  createCourseSchema,
  createSoftwareSchema,
  createBreadcrumbSchema,
  createFAQSchema,
  canonicalUrlMiddleware,
  generateCanonicalLink,
  duplicateContentRedirect,
} from './seo';

export type {
  PageMetadata,
  SitemapEntry,
  RobotsTxtConfig,
  SchemaType,
  SchemaOrgData,
} from './seo';
