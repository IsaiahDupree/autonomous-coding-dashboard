/**
 * @acd/ui-system
 *
 * UI Design System specifications, design tokens, and product integration
 * dashboard types for the Autonomous Coding Dashboard ecosystem.
 *
 * This package is TYPES AND SPECS ONLY -- no React components.
 * It exports TypeScript interfaces, Zod schemas, and configuration constants
 * that frontend frameworks consume.
 */

// ---------------------------------------------------------------------------
// UI-001: Design Tokens
// ---------------------------------------------------------------------------
export {
  ColorPalette,
  SpacingScale,
  TypographyScale,
  BorderRadii,
  Shadows,
  Breakpoints,
  ZIndex,
  Transitions,
  DesignTokens,
  DesignTokenOverrideSchema,
} from "./tokens";

export type {
  ColorCategory,
  SpacingKey,
  BorderRadiusKey,
  ShadowKey,
  BreakpointKey,
  DesignTokenOverride,
} from "./tokens";

// ---------------------------------------------------------------------------
// UI-002: Button Component Specs
// ---------------------------------------------------------------------------
export {
  ButtonVariants,
  ButtonSizes,
  ButtonStates,
  ButtonSizeTokens,
  ButtonVariantStyles,
  ButtonVariantSchema,
  ButtonSizeSchema,
  ButtonStateSchema,
  ButtonPropsSchema,
  IconButtonPropsSchema,
  ButtonGroupPropsSchema,
} from "./buttons";

export type {
  ButtonVariant,
  ButtonSize,
  ButtonState,
  ButtonVariantStateStyle,
  ButtonVariantTokens,
  ButtonProps,
  IconButtonProps,
  ButtonGroupProps,
} from "./buttons";

// ---------------------------------------------------------------------------
// UI-003: Form Component Specs
// ---------------------------------------------------------------------------
export {
  InputTypes,
  ValidationStates,
  InputSizes,
  InputSizeTokens,
  ValidationStateStyles,
  InputTypeSchema,
  ValidationStateSchema,
  InputSizeSchema,
  SelectOptionSchema,
  BaseInputPropsSchema,
  TextInputPropsSchema,
  EmailInputPropsSchema,
  PasswordInputPropsSchema,
  NumberInputPropsSchema,
  TextareaPropsSchema,
  SelectPropsSchema,
  FormFieldPropsSchema,
  FormLayoutSchema,
  ValidationRuleSchema,
  FieldValidationConfigSchema,
} from "./forms";

export type {
  InputType,
  ValidationState,
  InputSize,
  ValidationStateStyle,
  SelectOption,
  BaseInputProps,
  TextInputProps,
  EmailInputProps,
  PasswordInputProps,
  NumberInputProps,
  TextareaProps,
  SelectProps,
  FormFieldProps,
  FormLayout,
  ValidationRule,
  FieldValidationConfig,
} from "./forms";

// ---------------------------------------------------------------------------
// UI-004: Modal / Dialog Specs
// ---------------------------------------------------------------------------
export {
  ModalSizes,
  ModalSizeTokens,
  ModalSizeSchema,
  CloseBehaviorSchema,
  OverlayConfigSchema,
  ModalHeaderSchema,
  ModalFooterActionSchema,
  ModalFooterSchema,
  ModalBodySchema,
  ModalPropsSchema,
  ConfirmDialogPropsSchema,
} from "./modals";

export type {
  ModalSize,
  CloseBehavior,
  OverlayConfig,
  ModalHeader,
  ModalFooterAction,
  ModalFooter,
  ModalBody,
  ModalProps,
  ConfirmDialogProps,
} from "./modals";

// ---------------------------------------------------------------------------
// UI-005: Data Table Specs
// ---------------------------------------------------------------------------
export {
  ColumnAlignments,
  ColumnDataTypes,
  SortDirections,
  FilterOperators,
  ColumnDefinitionSchema,
  SortConfigSchema,
  TableSortSchema,
  PaginationConfigSchema,
  RowSelectionSchema,
  BulkActionSchema,
  BulkActionsConfigSchema,
  FilterConditionSchema,
  FilterConfigSchema,
  DataTablePropsSchema,
} from "./tables";

export type {
  ColumnAlignment,
  ColumnDataType,
  ColumnDefinition,
  SortDirection,
  SortConfig,
  TableSort,
  PaginationConfig,
  RowSelection,
  BulkAction,
  BulkActionsConfig,
  FilterOperator,
  FilterCondition,
  FilterConfig,
  DataTableProps,
} from "./tables";

// ---------------------------------------------------------------------------
// UI-006: Toast / Notification Specs
// ---------------------------------------------------------------------------
export {
  ToastVariants,
  ToastPositions,
  ToastVariantStyles,
  DefaultAutoDismissDurations,
  ToastVariantSchema,
  ToastPositionSchema,
  ToastActionSchema,
  AutoDismissConfigSchema,
  ToastPropsSchema,
  ToastContainerConfigSchema,
} from "./toasts";

export type {
  ToastVariant,
  ToastPosition,
  ToastVariantStyle,
  ToastAction,
  AutoDismissConfig,
  ToastProps,
  ToastContainerConfig,
} from "./toasts";

// ---------------------------------------------------------------------------
// UI-007: Navigation Specs
// ---------------------------------------------------------------------------
export {
  SidebarItemSchema,
  SidebarConfigSchema,
  BreadcrumbItemSchema,
  BreadcrumbConfigSchema,
  TabItemSchema,
  TabConfigSchema,
  TopBarConfigSchema,
  MobileMenuConfigSchema,
  NavigationConfigSchema,
} from "./navigation";

export type {
  SidebarItem,
  SidebarConfig,
  BreadcrumbItem,
  BreadcrumbConfig,
  TabItem,
  TabConfig,
  TopBarConfig,
  MobileMenuConfig,
  NavigationConfig,
} from "./navigation";

// ---------------------------------------------------------------------------
// UI-008: Loading State Specs
// ---------------------------------------------------------------------------
export {
  SkeletonShapes,
  SpinnerSizes,
  SkeletonPresets,
  SpinnerSizeTokens,
  ProgressBarSizeTokens,
  SkeletonShapeSchema,
  SkeletonPropsSchema,
  SpinnerSizeSchema,
  SpinnerPropsSchema,
  ProgressBarPropsSchema,
  ShimmerConfigSchema,
  LoadingStateSchema,
  LoadingLayoutSchema,
} from "./loading";

export type {
  SkeletonShape,
  SkeletonProps,
  SpinnerSize,
  SpinnerProps,
  ProgressBarProps,
  ShimmerConfig,
  LoadingState,
  LoadingLayout,
} from "./loading";

// ---------------------------------------------------------------------------
// UI-009: Card Component Specs
// ---------------------------------------------------------------------------
export {
  CardVariants,
  CardMediaPositions,
  CardVariantStyles,
  CardVariantSchema,
  CardHeaderSchema,
  CardBodySchema,
  CardFooterSchema,
  CardMediaSchema,
  CardActionSchema,
  CardActionAreaSchema,
  CardPropsSchema,
  CardGridSchema,
} from "./cards";

export type {
  CardVariant,
  CardVariantStyle,
  CardHeader,
  CardBody,
  CardFooter,
  CardMediaPosition,
  CardMedia,
  CardAction,
  CardActionArea,
  CardProps,
  CardGrid,
} from "./cards";

// ---------------------------------------------------------------------------
// UI-010: Chart Component Specs
// ---------------------------------------------------------------------------
export {
  ChartTypes,
  ChartColorPalettes,
  ChartTypeSchema,
  AxisConfigSchema,
  LegendConfigSchema,
  TooltipConfigSchema,
  ChartResponsiveConfigSchema,
  DataPointSchema,
  DataSeriesSchema,
  ChartAnnotationSchema,
  ChartPropsSchema,
} from "./charts";

export type {
  ChartType,
  AxisConfig,
  LegendConfig,
  TooltipConfig,
  ChartResponsiveConfig,
  DataPoint,
  DataSeries,
  ChartAnnotation,
  ChartProps,
} from "./charts";

// ---------------------------------------------------------------------------
// INT-PCT-001 & INT-PCT-002: PCT Integration
// ---------------------------------------------------------------------------
export {
  AdPerformanceMetricSchema,
  CampaignStatusSchema,
  CampaignSummarySchema,
  CreativeScoreSchema,
  PctAnalyticsDashboardSchema,
  PctConfigurationSchema,
  PctFeatureTogglesSchema,
  PctNotificationPreferencesSchema,
  PctSettingsSchema,
} from "./pct-integration";

export type {
  AdPerformanceMetric,
  CampaignStatus,
  CampaignSummary,
  CreativeScore,
  PctAnalyticsDashboard,
  PctConfiguration,
  PctFeatureToggles,
  PctNotificationPreferences,
  PctSettings,
} from "./pct-integration";

// ---------------------------------------------------------------------------
// INT-CF-001 & INT-CF-002: Content Factory Integration
// ---------------------------------------------------------------------------
export {
  ContentTypeSchema,
  ContentStatusSchema,
  ContentProductionMetricSchema,
  PublishRateMetricSchema,
  ContentEngagementSchema,
  CfAnalyticsDashboardSchema,
  TemplatePreferencesSchema,
  PublishingDefaultsSchema,
  CfAiConfigSchema,
  CfSettingsSchema,
} from "./cf-integration";

export type {
  ContentType,
  ContentStatus,
  ContentProductionMetric,
  PublishRateMetric,
  ContentEngagement,
  CfAnalyticsDashboard,
  TemplatePreferences,
  PublishingDefaults,
  CfAiConfig,
  CfSettings,
} from "./cf-integration";

// ---------------------------------------------------------------------------
// INT-MP-001 & INT-MP-002: MediaPoster Integration
// ---------------------------------------------------------------------------
export {
  SocialPlatformSchema,
  PostFormatSchema,
  PostPerformanceSchema,
  ScheduleAdherenceSchema,
  PlatformBreakdownSchema,
  MpAnalyticsDashboardSchema,
  ConnectedAccountSchema,
  PostingScheduleSlotSchema,
  PostingScheduleSchema,
  ContentRuleSchema,
  ContentRulesConfigSchema,
  MpSettingsSchema,
} from "./mp-integration";

export type {
  SocialPlatform,
  PostFormat,
  PostPerformance,
  ScheduleAdherence,
  PlatformBreakdown,
  MpAnalyticsDashboard,
  ConnectedAccount,
  PostingScheduleSlot,
  PostingSchedule,
  ContentRule,
  ContentRulesConfig,
  MpSettings,
} from "./mp-integration";

// ---------------------------------------------------------------------------
// INT-WL-001 & INT-WL-002: WaitlistLab Integration
// ---------------------------------------------------------------------------
export {
  WaitlistCampaignTypes,
  WaitlistCampaignTypeSchema,
  CampaignTypeDefinitionSchema,
  DefaultCampaignTypeDefinitions,
  WaitlistTemplateSchema,
  AudienceSegmentTypes,
  AudienceSegmentTypeSchema,
  AudienceSegmentSchema,
  SharingDestinationSchema,
  AudienceSharingConfigSchema,
  SyncStatusSchema,
  WlAudienceSharingDashboardSchema,
} from "./wl-integration";

export type {
  WaitlistCampaignType,
  CampaignTypeDefinition,
  WaitlistTemplate,
  AudienceSegmentType,
  AudienceSegment,
  SharingDestination,
  AudienceSharingConfig,
  SyncStatus,
  WlAudienceSharingDashboard,
} from "./wl-integration";

// ---------------------------------------------------------------------------
// INT-REM-001, INT-REM-002, INT-REM-003: Remotion Integration
// ---------------------------------------------------------------------------
export {
  RemotionTemplateCategorySchema,
  RemotionTemplateListingSchema,
  RemotionPricingModelSchema,
  RemotionTemplatePricingSchema,
  RemotionTemplateRatingSchema,
  TemplateMarketplaceFilterSchema,
  RenderStatusSchema,
  RenderJobSchema,
  RenderStatusHistoryEntrySchema,
  RenderStatusTrackingSchema,
  RenderCostSchema,
  RenderHistoryDashboardSchema,
  AssetCategorySchema,
  UsageRightsSchema,
  AssetEntrySchema,
  AssetLibraryFilterSchema,
  AssetLibraryDashboardSchema,
} from "./remotion-integration";

export type {
  RemotionTemplateCategory,
  RemotionTemplateListing,
  RemotionPricingModel,
  RemotionTemplatePricing,
  RemotionTemplateRating,
  TemplateMarketplaceFilter,
  RenderStatus,
  RenderJob,
  RenderStatusHistoryEntry,
  RenderStatusTracking,
  RenderCost,
  RenderHistoryDashboard,
  AssetCategory,
  UsageRights,
  AssetEntry,
  AssetLibraryFilter,
  AssetLibraryDashboard,
} from "./remotion-integration";
