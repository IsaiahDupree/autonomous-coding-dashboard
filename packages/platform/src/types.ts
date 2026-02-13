import { z } from 'zod';

// ============================================================================
// SEARCH (SEARCH-001 to SEARCH-004)
// ============================================================================

// SEARCH-001: Search Index Management
export const FieldTypeSchema = z.enum(['text', 'keyword', 'number', 'date', 'boolean', 'geo_point']);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const IndexFieldSchema = z.object({
  name: z.string().min(1),
  type: FieldTypeSchema,
  weight: z.number().min(0).max(100).default(1),
  searchable: z.boolean().default(true),
  filterable: z.boolean().default(false),
  sortable: z.boolean().default(false),
  stored: z.boolean().default(true),
});
export type IndexField = z.infer<typeof IndexFieldSchema>;

export const IndexDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  fields: z.array(IndexFieldSchema).min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  documentCount: z.number().int().min(0).default(0),
  settings: z.object({
    defaultSearchFields: z.array(z.string()).optional(),
    stopWords: z.array(z.string()).optional(),
    synonyms: z.record(z.string(), z.array(z.string())).optional(),
  }).optional(),
});
export type IndexDefinition = z.infer<typeof IndexDefinitionSchema>;

export const IndexedDocumentSchema = z.object({
  id: z.string(),
  indexId: z.string().uuid(),
  fields: z.record(z.string(), z.unknown()),
  indexedAt: z.date(),
});
export type IndexedDocument = z.infer<typeof IndexedDocumentSchema>;

// SEARCH-002: Search Query Engine
export const SearchFilterOperatorSchema = z.enum([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'exists', 'range', 'prefix',
]);
export type SearchFilterOperator = z.infer<typeof SearchFilterOperatorSchema>;

export const SearchFilterSchema = z.object({
  field: z.string(),
  operator: SearchFilterOperatorSchema,
  value: z.unknown(),
});
export type SearchFilter = z.infer<typeof SearchFilterSchema>;

export const FacetRequestSchema = z.object({
  field: z.string(),
  size: z.number().int().min(1).max(1000).default(10),
  minCount: z.number().int().min(0).default(1),
});
export type FacetRequest = z.infer<typeof FacetRequestSchema>;

export const SearchQuerySchema = z.object({
  indexId: z.string().uuid(),
  query: z.string(),
  filters: z.array(SearchFilterSchema).optional(),
  facets: z.array(FacetRequestSchema).optional(),
  highlight: z.object({
    fields: z.array(z.string()),
    preTag: z.string().default('<mark>'),
    postTag: z.string().default('</mark>'),
  }).optional(),
  sort: z.array(z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('desc'),
  })).optional(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(1000).default(20),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchHitSchema = z.object({
  id: z.string(),
  score: z.number(),
  fields: z.record(z.string(), z.unknown()),
  highlights: z.record(z.string(), z.array(z.string())).optional(),
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const FacetBucketSchema = z.object({
  value: z.union([z.string(), z.number()]),
  count: z.number().int().min(0),
});
export type FacetBucket = z.infer<typeof FacetBucketSchema>;

export const SearchResultSchema = z.object({
  hits: z.array(SearchHitSchema),
  totalHits: z.number().int().min(0),
  facets: z.record(z.string(), z.array(FacetBucketSchema)).optional(),
  took: z.number().min(0),
  query: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// SEARCH-003: Search Suggestions
export const SuggestionTypeSchema = z.enum(['autocomplete', 'fuzzy', 'popular', 'recent']);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

export const SearchSuggestionSchema = z.object({
  text: z.string(),
  type: SuggestionTypeSchema,
  score: z.number().min(0).max(1),
  frequency: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SearchSuggestion = z.infer<typeof SearchSuggestionSchema>;

export const SuggestionRequestSchema = z.object({
  indexId: z.string().uuid(),
  prefix: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
  types: z.array(SuggestionTypeSchema).optional(),
  fuzzyMaxEdits: z.number().int().min(1).max(3).default(2),
});
export type SuggestionRequest = z.infer<typeof SuggestionRequestSchema>;

export const PopularQuerySchema = z.object({
  query: z.string(),
  count: z.number().int().min(1),
  lastSearchedAt: z.date(),
});
export type PopularQuery = z.infer<typeof PopularQuerySchema>;

// SEARCH-004: Search Analytics
export const SearchEventTypeSchema = z.enum(['query', 'click', 'zero_results', 'suggestion_click']);
export type SearchEventType = z.infer<typeof SearchEventTypeSchema>;

export const SearchAnalyticsEventSchema = z.object({
  id: z.string().uuid(),
  type: SearchEventTypeSchema,
  indexId: z.string().uuid(),
  query: z.string(),
  timestamp: z.date(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  resultCount: z.number().int().min(0).optional(),
  clickedDocumentId: z.string().optional(),
  clickPosition: z.number().int().min(0).optional(),
  responseTimeMs: z.number().min(0).optional(),
  filters: z.array(SearchFilterSchema).optional(),
});
export type SearchAnalyticsEvent = z.infer<typeof SearchAnalyticsEventSchema>;

export const SearchQualityMetricsSchema = z.object({
  indexId: z.string().uuid(),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  totalQueries: z.number().int().min(0),
  uniqueQueries: z.number().int().min(0),
  zeroResultRate: z.number().min(0).max(1),
  averageResultCount: z.number().min(0),
  clickThroughRate: z.number().min(0).max(1),
  averageClickPosition: z.number().min(0),
  averageResponseTimeMs: z.number().min(0),
  topQueries: z.array(z.object({
    query: z.string(),
    count: z.number().int().min(0),
  })),
  topZeroResultQueries: z.array(z.object({
    query: z.string(),
    count: z.number().int().min(0),
  })),
});
export type SearchQualityMetrics = z.infer<typeof SearchQualityMetricsSchema>;

// ============================================================================
// LOCALIZATION (I18N-001 to I18N-004)
// ============================================================================

// I18N-001: Translation Key Management
export const PluralFormSchema = z.enum(['zero', 'one', 'two', 'few', 'many', 'other']);
export type PluralForm = z.infer<typeof PluralFormSchema>;

export const TranslationValueSchema = z.union([
  z.string(),
  z.record(PluralFormSchema, z.string()),
]);
export type TranslationValue = z.infer<typeof TranslationValueSchema>;

export const TranslationKeySchema = z.object({
  namespace: z.string().min(1),
  key: z.string().min(1),
  defaultValue: z.string(),
  description: z.string().optional(),
  pluralForms: z.record(PluralFormSchema, z.string()).optional(),
  interpolationVars: z.array(z.string()).optional(),
});
export type TranslationKey = z.infer<typeof TranslationKeySchema>;

export const TranslationBundleSchema = z.object({
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  namespace: z.string().min(1),
  translations: z.record(z.string(), TranslationValueSchema),
  updatedAt: z.date(),
});
export type TranslationBundle = z.infer<typeof TranslationBundleSchema>;

export const I18nConfigSchema = z.object({
  defaultLocale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  fallbackLocale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  supportedLocales: z.array(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/)).min(1),
  namespaces: z.array(z.string()).min(1),
  interpolation: z.object({
    prefix: z.string().default('{{'),
    suffix: z.string().default('}}'),
  }).optional(),
});
export type I18nConfig = z.infer<typeof I18nConfigSchema>;

// I18N-002: Locale Detection
export const LocaleSourceSchema = z.enum(['browser', 'user_preference', 'url', 'cookie', 'header', 'default']);
export type LocaleSource = z.infer<typeof LocaleSourceSchema>;

export const LocaleDetectionResultSchema = z.object({
  locale: z.string(),
  source: LocaleSourceSchema,
  confidence: z.number().min(0).max(1),
});
export type LocaleDetectionResult = z.infer<typeof LocaleDetectionResultSchema>;

export const LocaleDetectionConfigSchema = z.object({
  order: z.array(LocaleSourceSchema),
  cookieName: z.string().default('locale'),
  urlParam: z.string().default('lang'),
  urlPathPrefix: z.boolean().default(false),
  headerName: z.string().default('Accept-Language'),
});
export type LocaleDetectionConfig = z.infer<typeof LocaleDetectionConfigSchema>;

// I18N-003: Date/Number/Currency Formatting
export const DateFormatStyleSchema = z.enum(['short', 'medium', 'long', 'full', 'relative', 'custom']);
export type DateFormatStyle = z.infer<typeof DateFormatStyleSchema>;

export const NumberFormatStyleSchema = z.enum(['decimal', 'percent', 'currency', 'compact', 'scientific', 'unit']);
export type NumberFormatStyle = z.infer<typeof NumberFormatStyleSchema>;

export const CurrencyDisplaySchema = z.enum(['symbol', 'narrowSymbol', 'code', 'name']);
export type CurrencyDisplay = z.infer<typeof CurrencyDisplaySchema>;

export const FormatOptionsSchema = z.object({
  locale: z.string(),
  timezone: z.string().optional(),
  dateStyle: DateFormatStyleSchema.optional(),
  customDatePattern: z.string().optional(),
  numberStyle: NumberFormatStyleSchema.optional(),
  currency: z.string().length(3).optional(),
  currencyDisplay: CurrencyDisplaySchema.optional(),
  minimumFractionDigits: z.number().int().min(0).max(20).optional(),
  maximumFractionDigits: z.number().int().min(0).max(20).optional(),
  useGrouping: z.boolean().optional(),
});
export type FormatOptions = z.infer<typeof FormatOptionsSchema>;

// I18N-004: RTL Support
export const TextDirectionSchema = z.enum(['ltr', 'rtl', 'auto']);
export type TextDirection = z.infer<typeof TextDirectionSchema>;

export const RTLConfigSchema = z.object({
  rtlLocales: z.array(z.string()).default(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi']),
  mirrorLayout: z.boolean().default(true),
  mirrorIcons: z.boolean().default(false),
  cssLogicalProperties: z.boolean().default(true),
});
export type RTLConfig = z.infer<typeof RTLConfigSchema>;

export const LayoutMirrorRuleSchema = z.object({
  property: z.string(),
  ltrValue: z.string(),
  rtlValue: z.string(),
});
export type LayoutMirrorRule = z.infer<typeof LayoutMirrorRuleSchema>;

// ============================================================================
// MOBILE (MOB-001 to MOB-004)
// ============================================================================

// MOB-001: Mobile API Optimization
export const FieldSelectionSchema = z.object({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});
export type FieldSelection = z.infer<typeof FieldSelectionSchema>;

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(500).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const CompressedResponseSchema = z.object({
  encoding: z.enum(['gzip', 'br', 'deflate', 'identity']),
  originalSize: z.number().int().min(0),
  compressedSize: z.number().int().min(0),
  data: z.unknown(),
});
export type CompressedResponse = z.infer<typeof CompressedResponseSchema>;

export const MobileApiRequestSchema = z.object({
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  fields: FieldSelectionSchema.optional(),
  pagination: PaginationSchema.optional(),
  acceptEncoding: z.enum(['gzip', 'br', 'deflate', 'identity']).default('gzip'),
  deviceInfo: z.object({
    platform: z.enum(['ios', 'android', 'web']),
    version: z.string(),
    networkType: z.enum(['wifi', '4g', '3g', '2g', 'offline']).optional(),
  }).optional(),
});
export type MobileApiRequest = z.infer<typeof MobileApiRequestSchema>;

export const MobileApiResponseSchema = z.object({
  data: z.unknown(),
  pagination: z.object({
    nextCursor: z.string().optional(),
    hasMore: z.boolean(),
    total: z.number().int().min(0).optional(),
  }).optional(),
  meta: z.object({
    took: z.number().min(0),
    compressed: z.boolean(),
    fieldSelection: z.boolean(),
  }).optional(),
});
export type MobileApiResponse = z.infer<typeof MobileApiResponseSchema>;

// MOB-002: Push Notifications
export const NotificationPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const PushNotificationPayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(255),
  body: z.string().max(4096),
  data: z.record(z.string(), z.unknown()).optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().optional(),
  priority: NotificationPrioritySchema.default('normal'),
  ttl: z.number().int().min(0).optional(),
  badge: z.number().int().min(0).optional(),
  sound: z.string().optional(),
  collapseKey: z.string().optional(),
  category: z.string().optional(),
});
export type PushNotificationPayload = z.infer<typeof PushNotificationPayloadSchema>;

export const DeviceTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  userId: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
  active: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type DeviceToken = z.infer<typeof DeviceTokenSchema>;

export const TopicSubscriptionSchema = z.object({
  userId: z.string(),
  topic: z.string().min(1).max(128),
  subscribedAt: z.date(),
  active: z.boolean().default(true),
});
export type TopicSubscription = z.infer<typeof TopicSubscriptionSchema>;

// MOB-003: Offline Data Sync
export const SyncStatusSchema = z.enum(['pending', 'syncing', 'synced', 'conflict', 'failed']);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const ConflictResolutionStrategySchema = z.enum([
  'client_wins', 'server_wins', 'latest_wins', 'manual', 'merge',
]);
export type ConflictResolutionStrategy = z.infer<typeof ConflictResolutionStrategySchema>;

export const SyncQueueItemSchema = z.object({
  id: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string(),
  operation: z.enum(['create', 'update', 'delete']),
  data: z.record(z.string(), z.unknown()),
  status: SyncStatusSchema,
  retryCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).default(3),
  createdAt: z.date(),
  syncedAt: z.date().optional(),
  errorMessage: z.string().optional(),
  version: z.number().int().min(0),
});
export type SyncQueueItem = z.infer<typeof SyncQueueItemSchema>;

export const MergeRuleSchema = z.object({
  entityType: z.string(),
  field: z.string(),
  strategy: ConflictResolutionStrategySchema,
  customMerger: z.string().optional(),
});
export type MergeRule = z.infer<typeof MergeRuleSchema>;

export const SyncConflictSchema = z.object({
  id: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string(),
  clientData: z.record(z.string(), z.unknown()),
  serverData: z.record(z.string(), z.unknown()),
  detectedAt: z.date(),
  resolvedAt: z.date().optional(),
  resolution: ConflictResolutionStrategySchema.optional(),
  resolvedData: z.record(z.string(), z.unknown()).optional(),
});
export type SyncConflict = z.infer<typeof SyncConflictSchema>;

// MOB-004: Mobile Deep Linking
export const DeepLinkSchemeSchema = z.object({
  scheme: z.string().min(1),
  host: z.string().optional(),
  pathPrefix: z.string().optional(),
});
export type DeepLinkScheme = z.infer<typeof DeepLinkSchemeSchema>;

export const DeepLinkRouteSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  screen: z.string(),
  params: z.record(z.string(), z.object({
    type: z.enum(['string', 'number', 'boolean']),
    required: z.boolean().default(true),
  })).optional(),
  requiresAuth: z.boolean().default(false),
});
export type DeepLinkRoute = z.infer<typeof DeepLinkRouteSchema>;

export const DeepLinkConfigSchema = z.object({
  schemes: z.array(DeepLinkSchemeSchema).min(1),
  universalLinkDomain: z.string().optional(),
  routes: z.array(DeepLinkRouteSchema),
  fallbackUrl: z.string().url(),
  androidFallbackUrl: z.string().url().optional(),
  iosFallbackUrl: z.string().url().optional(),
});
export type DeepLinkConfig = z.infer<typeof DeepLinkConfigSchema>;

export const ResolvedDeepLinkSchema = z.object({
  matched: z.boolean(),
  route: DeepLinkRouteSchema.optional(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  fallbackUrl: z.string().url().optional(),
});
export type ResolvedDeepLink = z.infer<typeof ResolvedDeepLinkSchema>;

// ============================================================================
// ONBOARDING (OB-001 to OB-005)
// ============================================================================

// OB-001: Onboarding Flow Engine
export const OnboardingStepTypeSchema = z.enum([
  'info', 'form', 'action', 'verification', 'choice', 'integration',
]);
export type OnboardingStepType = z.infer<typeof OnboardingStepTypeSchema>;

export const OnboardingStepSchema = z.object({
  id: z.string(),
  type: OnboardingStepTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(true),
  order: z.number().int().min(0),
  content: z.record(z.string(), z.unknown()).optional(),
  validationRules: z.array(z.object({
    field: z.string(),
    rule: z.string(),
    message: z.string(),
  })).optional(),
  branchCondition: z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'in', 'nin', 'gt', 'lt']),
    value: z.unknown(),
    nextStepId: z.string(),
  }).optional(),
});
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const OnboardingFlowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.number().int().min(1),
  steps: z.array(OnboardingStepSchema).min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  active: z.boolean().default(true),
});
export type OnboardingFlow = z.infer<typeof OnboardingFlowSchema>;

export const OnboardingProgressSchema = z.object({
  userId: z.string(),
  flowId: z.string().uuid(),
  currentStepId: z.string(),
  completedStepIds: z.array(z.string()),
  stepData: z.record(z.string(), z.record(z.string(), z.unknown())),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  skippedStepIds: z.array(z.string()).default([]),
  percentComplete: z.number().min(0).max(100),
});
export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

// OB-002: Product Tour System
export const TooltipPlacementSchema = z.enum([
  'top', 'bottom', 'left', 'right', 'top-start', 'top-end',
  'bottom-start', 'bottom-end', 'left-start', 'left-end',
  'right-start', 'right-end',
]);
export type TooltipPlacement = z.infer<typeof TooltipPlacementSchema>;

export const TourTriggerSchema = z.enum([
  'manual', 'first_visit', 'feature_launch', 'user_action', 'time_delay', 'event',
]);
export type TourTrigger = z.infer<typeof TourTriggerSchema>;

export const TourStepSchema = z.object({
  id: z.string(),
  targetSelector: z.string(),
  title: z.string(),
  content: z.string(),
  placement: TooltipPlacementSchema.default('bottom'),
  order: z.number().int().min(0),
  highlightTarget: z.boolean().default(true),
  allowInteraction: z.boolean().default(false),
  advanceOn: z.enum(['click', 'next_button', 'target_click', 'timer']).default('next_button'),
  advanceDelay: z.number().int().min(0).optional(),
  beforeShow: z.string().optional(),
  afterHide: z.string().optional(),
});
export type TourStep = z.infer<typeof TourStepSchema>;

export const ProductTourSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(TourStepSchema).min(1),
  trigger: TourTriggerSchema,
  triggerCondition: z.record(z.string(), z.unknown()).optional(),
  active: z.boolean().default(true),
  showOnce: z.boolean().default(true),
  createdAt: z.date(),
});
export type ProductTour = z.infer<typeof ProductTourSchema>;

// OB-003: Checklist System
export const ChecklistItemStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'skipped']);
export type ChecklistItemStatus = z.infer<typeof ChecklistItemStatusSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().int().min(0),
  required: z.boolean().default(true),
  actionType: z.enum(['navigate', 'action', 'external', 'auto_detect']),
  actionTarget: z.string().optional(),
  completionCriteria: z.object({
    type: z.enum(['manual', 'event', 'api_check']),
    eventName: z.string().optional(),
    apiEndpoint: z.string().optional(),
  }).optional(),
  estimatedTimeMinutes: z.number().int().min(0).optional(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ChecklistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  items: z.array(ChecklistItemSchema).min(1),
  rewardTrigger: z.object({
    type: z.enum(['badge', 'feature_unlock', 'notification', 'custom']),
    threshold: z.number().min(0).max(1).default(1),
    payload: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  createdAt: z.date(),
  active: z.boolean().default(true),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

export const ChecklistProgressSchema = z.object({
  userId: z.string(),
  checklistId: z.string().uuid(),
  items: z.record(z.string(), z.object({
    status: ChecklistItemStatusSchema,
    completedAt: z.date().optional(),
  })),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  rewardGranted: z.boolean().default(false),
  percentComplete: z.number().min(0).max(100),
});
export type ChecklistProgress = z.infer<typeof ChecklistProgressSchema>;

// OB-004: Welcome Email Sequences
export const EmailSequenceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  emails: z.array(z.object({
    id: z.string(),
    subject: z.string(),
    templateId: z.string(),
    delayHours: z.number().min(0),
    condition: z.object({
      type: z.enum(['always', 'if_not_completed', 'if_completed', 'custom']),
      checklistItemId: z.string().optional(),
      customCondition: z.string().optional(),
    }).optional(),
    personalizationVars: z.array(z.string()).optional(),
  })).min(1),
  active: z.boolean().default(true),
  createdAt: z.date(),
});
export type EmailSequence = z.infer<typeof EmailSequenceSchema>;

export const EmailSendStatusSchema = z.enum(['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']);
export type EmailSendStatus = z.infer<typeof EmailSendStatusSchema>;

export const EmailSendRecordSchema = z.object({
  id: z.string().uuid(),
  sequenceId: z.string().uuid(),
  emailId: z.string(),
  userId: z.string(),
  status: EmailSendStatusSchema,
  scheduledAt: z.date(),
  sentAt: z.date().optional(),
  personalizationData: z.record(z.string(), z.string()).optional(),
  errorMessage: z.string().optional(),
});
export type EmailSendRecord = z.infer<typeof EmailSendRecordSchema>;

// OB-005: User Preference Collection
export const PreferenceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  order: z.number().int().min(0),
});
export type PreferenceCategory = z.infer<typeof PreferenceCategorySchema>;

export const PreferenceFieldTypeSchema = z.enum([
  'boolean', 'string', 'number', 'select', 'multi_select', 'color', 'timezone',
]);
export type PreferenceFieldType = z.infer<typeof PreferenceFieldTypeSchema>;

export const PreferenceDefinitionSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  label: z.string(),
  description: z.string().optional(),
  type: PreferenceFieldTypeSchema,
  defaultValue: z.unknown(),
  options: z.array(z.object({
    value: z.unknown(),
    label: z.string(),
  })).optional(),
  required: z.boolean().default(false),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
});
export type PreferenceDefinition = z.infer<typeof PreferenceDefinitionSchema>;

export const UserPreferencesSchema = z.object({
  userId: z.string(),
  preferences: z.record(z.string(), z.unknown()),
  updatedAt: z.date(),
  version: z.number().int().min(0),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// ============================================================================
// MODERATION (MOD-001 to MOD-004)
// ============================================================================

// MOD-001: Content Moderation Queue
export const ModerationStatusSchema = z.enum([
  'pending', 'in_review', 'approved', 'rejected', 'escalated', 'auto_approved', 'auto_rejected',
]);
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;

export const ModerationItemTypeSchema = z.enum([
  'text', 'image', 'video', 'audio', 'link', 'profile', 'comment', 'post',
]);
export type ModerationItemType = z.infer<typeof ModerationItemTypeSchema>;

export const ModerationItemSchema = z.object({
  id: z.string().uuid(),
  type: ModerationItemTypeSchema,
  content: z.string(),
  contentUrl: z.string().url().optional(),
  authorId: z.string(),
  status: ModerationStatusSchema.default('pending'),
  assignedModeratorId: z.string().optional(),
  priority: z.number().int().min(0).max(10).default(5),
  createdAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewNotes: z.string().optional(),
  autoFlagReasons: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ModerationItem = z.infer<typeof ModerationItemSchema>;

export const ModerationDecisionSchema = z.object({
  itemId: z.string().uuid(),
  moderatorId: z.string(),
  status: ModerationStatusSchema,
  reason: z.string().optional(),
  actionsTaken: z.array(z.enum([
    'remove_content', 'warn_user', 'suspend_user', 'ban_user',
    'flag_for_review', 'no_action', 'edit_content',
  ])),
  decidedAt: z.date(),
});
export type ModerationDecision = z.infer<typeof ModerationDecisionSchema>;

// MOD-002: Automated Content Filtering
export const FilterSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type FilterSeverity = z.infer<typeof FilterSeveritySchema>;

export const FilterActionSchema = z.enum([
  'flag', 'block', 'quarantine', 'replace', 'shadow_ban', 'notify_moderator',
]);
export type FilterAction = z.infer<typeof FilterActionSchema>;

export const ContentFilterRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['keyword', 'regex', 'ml_model', 'url_check', 'image_check']),
  pattern: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  severity: FilterSeveritySchema,
  action: FilterActionSchema,
  enabled: z.boolean().default(true),
  appliesTo: z.array(ModerationItemTypeSchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ContentFilterRule = z.infer<typeof ContentFilterRuleSchema>;

export const FilterResultSchema = z.object({
  contentId: z.string(),
  matched: z.boolean(),
  matchedRules: z.array(z.object({
    ruleId: z.string().uuid(),
    ruleName: z.string(),
    severity: FilterSeveritySchema,
    action: FilterActionSchema,
    matchDetails: z.string().optional(),
  })),
  overallSeverity: FilterSeveritySchema.optional(),
  overallAction: FilterActionSchema.optional(),
  processedAt: z.date(),
});
export type FilterResult = z.infer<typeof FilterResultSchema>;

// MOD-003: User Reporting System
export const ReportTypeSchema = z.enum([
  'spam', 'harassment', 'hate_speech', 'violence', 'misinformation',
  'copyright', 'privacy', 'inappropriate', 'other',
]);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const ReportStatusSchema = z.enum([
  'submitted', 'under_review', 'resolved', 'dismissed', 'escalated',
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ResolutionActionSchema = z.enum([
  'content_removed', 'user_warned', 'user_suspended', 'user_banned',
  'no_violation', 'duplicate', 'insufficient_evidence',
]);
export type ResolutionAction = z.infer<typeof ResolutionActionSchema>;

export const UserReportSchema = z.object({
  id: z.string().uuid(),
  reporterUserId: z.string(),
  reportedUserId: z.string().optional(),
  reportedContentId: z.string().optional(),
  reportedContentType: ModerationItemTypeSchema.optional(),
  type: ReportTypeSchema,
  description: z.string().max(2000).optional(),
  evidence: z.array(z.string().url()).optional(),
  status: ReportStatusSchema.default('submitted'),
  assignedModeratorId: z.string().optional(),
  resolution: z.object({
    action: ResolutionActionSchema,
    notes: z.string().optional(),
    resolvedBy: z.string(),
    resolvedAt: z.date(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type UserReport = z.infer<typeof UserReportSchema>;

// MOD-004: Moderation Dashboard Data
export const ModerationQueueStatsSchema = z.object({
  totalPending: z.number().int().min(0),
  totalInReview: z.number().int().min(0),
  totalResolvedToday: z.number().int().min(0),
  averageResolutionTimeMs: z.number().min(0),
  oldestPendingAge: z.number().min(0),
  byType: z.record(ModerationItemTypeSchema, z.number().int().min(0)),
  bySeverity: z.record(FilterSeveritySchema, z.number().int().min(0)),
});
export type ModerationQueueStats = z.infer<typeof ModerationQueueStatsSchema>;

export const ModeratorPerformanceSchema = z.object({
  moderatorId: z.string(),
  period: z.object({ start: z.date(), end: z.date() }),
  totalReviewed: z.number().int().min(0),
  averageReviewTimeMs: z.number().min(0),
  approvalRate: z.number().min(0).max(1),
  rejectionRate: z.number().min(0).max(1),
  escalationRate: z.number().min(0).max(1),
  accuracyScore: z.number().min(0).max(1).optional(),
  overturnedDecisions: z.number().int().min(0),
});
export type ModeratorPerformance = z.infer<typeof ModeratorPerformanceSchema>;

export const ModerationResolutionRatesSchema = z.object({
  period: z.object({ start: z.date(), end: z.date() }),
  totalItems: z.number().int().min(0),
  resolvedCount: z.number().int().min(0),
  resolutionRate: z.number().min(0).max(1),
  byAction: z.record(z.string(), z.number().int().min(0)),
  byType: z.record(z.string(), z.object({
    total: z.number().int().min(0),
    resolved: z.number().int().min(0),
    rate: z.number().min(0).max(1),
  })),
  averageTimeToResolutionMs: z.number().min(0),
});
export type ModerationResolutionRates = z.infer<typeof ModerationResolutionRatesSchema>;

// ============================================================================
// EXPORT/IMPORT (EXP-001 to EXP-004)
// ============================================================================

// EXP-001: Data Export Engine
export const ExportFormatSchema = z.enum(['json', 'csv', 'xlsx']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportJobStatusSchema = z.enum([
  'pending', 'processing', 'completed', 'failed', 'cancelled',
]);
export type ExportJobStatus = z.infer<typeof ExportJobStatusSchema>;

export const ExportJobSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  format: ExportFormatSchema,
  source: z.object({
    entity: z.string(),
    filters: z.record(z.string(), z.unknown()).optional(),
    fields: z.array(z.string()).optional(),
    sort: z.object({
      field: z.string(),
      order: z.enum(['asc', 'desc']),
    }).optional(),
  }),
  status: ExportJobStatusSchema.default('pending'),
  streaming: z.boolean().default(false),
  chunkSize: z.number().int().min(100).max(100000).default(1000),
  totalRecords: z.number().int().min(0).optional(),
  processedRecords: z.number().int().min(0).default(0),
  outputUrl: z.string().url().optional(),
  outputSize: z.number().int().min(0).optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  errorMessage: z.string().optional(),
});
export type ExportJob = z.infer<typeof ExportJobSchema>;

// EXP-002: Data Import Engine
export const ImportJobStatusSchema = z.enum([
  'pending', 'validating', 'processing', 'completed', 'failed', 'partial', 'cancelled',
]);
export type ImportJobStatus = z.infer<typeof ImportJobStatusSchema>;

export const FieldMappingSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  transform: z.enum(['none', 'lowercase', 'uppercase', 'trim', 'parse_date', 'parse_number', 'custom']).default('none'),
  customTransform: z.string().optional(),
  required: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
});
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export const ImportValidationRuleSchema = z.object({
  field: z.string(),
  rule: z.enum(['required', 'unique', 'format', 'range', 'enum', 'custom']),
  params: z.record(z.string(), z.unknown()).optional(),
  message: z.string(),
});
export type ImportValidationRule = z.infer<typeof ImportValidationRuleSchema>;

export const ImportErrorSchema = z.object({
  row: z.number().int().min(0),
  field: z.string().optional(),
  message: z.string(),
  value: z.unknown().optional(),
  severity: z.enum(['warning', 'error']),
});
export type ImportError = z.infer<typeof ImportErrorSchema>;

export const ImportJobSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sourceFormat: ExportFormatSchema,
  targetEntity: z.string(),
  fieldMappings: z.array(FieldMappingSchema),
  validationRules: z.array(ImportValidationRuleSchema).optional(),
  status: ImportJobStatusSchema.default('pending'),
  totalRecords: z.number().int().min(0).optional(),
  processedRecords: z.number().int().min(0).default(0),
  successCount: z.number().int().min(0).default(0),
  errorCount: z.number().int().min(0).default(0),
  errors: z.array(ImportErrorSchema).optional(),
  skipOnError: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});
export type ImportJob = z.infer<typeof ImportJobSchema>;

// EXP-003: Bulk Operations
export const BulkOperationTypeSchema = z.enum(['create', 'update', 'delete']);
export type BulkOperationType = z.infer<typeof BulkOperationTypeSchema>;

export const BulkOperationStatusSchema = z.enum([
  'pending', 'processing', 'completed', 'failed', 'rolled_back', 'partial',
]);
export type BulkOperationStatus = z.infer<typeof BulkOperationStatusSchema>;

export const BulkOperationItemSchema = z.object({
  id: z.string(),
  operation: BulkOperationTypeSchema,
  data: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['pending', 'success', 'failed']).default('pending'),
  errorMessage: z.string().optional(),
});
export type BulkOperationItem = z.infer<typeof BulkOperationItemSchema>;

export const BulkOperationJobSchema = z.object({
  id: z.string().uuid(),
  entity: z.string(),
  operation: BulkOperationTypeSchema,
  items: z.array(BulkOperationItemSchema),
  status: BulkOperationStatusSchema.default('pending'),
  totalItems: z.number().int().min(0),
  processedItems: z.number().int().min(0).default(0),
  successCount: z.number().int().min(0).default(0),
  failureCount: z.number().int().min(0).default(0),
  rollbackSupported: z.boolean().default(true),
  rollbackData: z.array(z.record(z.string(), z.unknown())).optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  errorMessage: z.string().optional(),
});
export type BulkOperationJob = z.infer<typeof BulkOperationJobSchema>;

// EXP-004: Migration Tools
export const MigrationStepStatusSchema = z.enum([
  'pending', 'running', 'completed', 'failed', 'skipped',
]);
export type MigrationStepStatus = z.infer<typeof MigrationStepStatusSchema>;

export const TransformationRuleSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  type: z.enum(['rename', 'convert', 'split', 'merge', 'compute', 'lookup', 'custom']),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type TransformationRule = z.infer<typeof TransformationRuleSchema>;

export const MigrationStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int().min(0),
  sourceEntity: z.string(),
  targetEntity: z.string(),
  transformations: z.array(TransformationRuleSchema),
  batchSize: z.number().int().min(1).default(1000),
  status: MigrationStepStatusSchema.default('pending'),
  processedRecords: z.number().int().min(0).default(0),
  errorCount: z.number().int().min(0).default(0),
});
export type MigrationStep = z.infer<typeof MigrationStepSchema>;

export const MigrationPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(MigrationStepSchema).min(1),
  status: z.enum(['draft', 'ready', 'running', 'completed', 'failed', 'rolled_back']).default('draft'),
  dryRun: z.boolean().default(true),
  dryRunResults: z.object({
    totalRecords: z.number().int().min(0),
    transformedSamples: z.array(z.record(z.string(), z.unknown())),
    estimatedDuration: z.number().min(0),
    potentialIssues: z.array(z.string()),
  }).optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
});
export type MigrationPlan = z.infer<typeof MigrationPlanSchema>;
