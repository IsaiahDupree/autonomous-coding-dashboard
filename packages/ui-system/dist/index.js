"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalBodySchema = exports.ModalFooterSchema = exports.ModalFooterActionSchema = exports.ModalHeaderSchema = exports.OverlayConfigSchema = exports.CloseBehaviorSchema = exports.ModalSizeSchema = exports.ModalSizeTokens = exports.ModalSizes = exports.FieldValidationConfigSchema = exports.ValidationRuleSchema = exports.FormLayoutSchema = exports.FormFieldPropsSchema = exports.SelectPropsSchema = exports.TextareaPropsSchema = exports.NumberInputPropsSchema = exports.PasswordInputPropsSchema = exports.EmailInputPropsSchema = exports.TextInputPropsSchema = exports.BaseInputPropsSchema = exports.SelectOptionSchema = exports.InputSizeSchema = exports.ValidationStateSchema = exports.InputTypeSchema = exports.ValidationStateStyles = exports.InputSizeTokens = exports.InputSizes = exports.ValidationStates = exports.InputTypes = exports.ButtonGroupPropsSchema = exports.IconButtonPropsSchema = exports.ButtonPropsSchema = exports.ButtonStateSchema = exports.ButtonSizeSchema = exports.ButtonVariantSchema = exports.ButtonVariantStyles = exports.ButtonSizeTokens = exports.ButtonStates = exports.ButtonSizes = exports.ButtonVariants = exports.DesignTokenOverrideSchema = exports.DesignTokens = exports.Transitions = exports.ZIndex = exports.Breakpoints = exports.Shadows = exports.BorderRadii = exports.TypographyScale = exports.SpacingScale = exports.ColorPalette = void 0;
exports.CardMediaPositions = exports.CardVariants = exports.LoadingLayoutSchema = exports.LoadingStateSchema = exports.ShimmerConfigSchema = exports.ProgressBarPropsSchema = exports.SpinnerPropsSchema = exports.SpinnerSizeSchema = exports.SkeletonPropsSchema = exports.SkeletonShapeSchema = exports.ProgressBarSizeTokens = exports.SpinnerSizeTokens = exports.SkeletonPresets = exports.SpinnerSizes = exports.SkeletonShapes = exports.NavigationConfigSchema = exports.MobileMenuConfigSchema = exports.TopBarConfigSchema = exports.TabConfigSchema = exports.TabItemSchema = exports.BreadcrumbConfigSchema = exports.BreadcrumbItemSchema = exports.SidebarConfigSchema = exports.SidebarItemSchema = exports.ToastContainerConfigSchema = exports.ToastPropsSchema = exports.AutoDismissConfigSchema = exports.ToastActionSchema = exports.ToastPositionSchema = exports.ToastVariantSchema = exports.DefaultAutoDismissDurations = exports.ToastVariantStyles = exports.ToastPositions = exports.ToastVariants = exports.DataTablePropsSchema = exports.FilterConfigSchema = exports.FilterConditionSchema = exports.BulkActionsConfigSchema = exports.BulkActionSchema = exports.RowSelectionSchema = exports.PaginationConfigSchema = exports.TableSortSchema = exports.SortConfigSchema = exports.ColumnDefinitionSchema = exports.FilterOperators = exports.SortDirections = exports.ColumnDataTypes = exports.ColumnAlignments = exports.ConfirmDialogPropsSchema = exports.ModalPropsSchema = void 0;
exports.ContentRuleSchema = exports.PostingScheduleSchema = exports.PostingScheduleSlotSchema = exports.ConnectedAccountSchema = exports.MpAnalyticsDashboardSchema = exports.PlatformBreakdownSchema = exports.ScheduleAdherenceSchema = exports.PostPerformanceSchema = exports.PostFormatSchema = exports.SocialPlatformSchema = exports.CfSettingsSchema = exports.CfAiConfigSchema = exports.PublishingDefaultsSchema = exports.TemplatePreferencesSchema = exports.CfAnalyticsDashboardSchema = exports.ContentEngagementSchema = exports.PublishRateMetricSchema = exports.ContentProductionMetricSchema = exports.ContentStatusSchema = exports.ContentTypeSchema = exports.PctSettingsSchema = exports.PctNotificationPreferencesSchema = exports.PctFeatureTogglesSchema = exports.PctConfigurationSchema = exports.PctAnalyticsDashboardSchema = exports.CreativeScoreSchema = exports.CampaignSummarySchema = exports.CampaignStatusSchema = exports.AdPerformanceMetricSchema = exports.ChartPropsSchema = exports.ChartAnnotationSchema = exports.DataSeriesSchema = exports.DataPointSchema = exports.ChartResponsiveConfigSchema = exports.TooltipConfigSchema = exports.LegendConfigSchema = exports.AxisConfigSchema = exports.ChartTypeSchema = exports.ChartColorPalettes = exports.ChartTypes = exports.CardGridSchema = exports.CardPropsSchema = exports.CardActionAreaSchema = exports.CardActionSchema = exports.CardMediaSchema = exports.CardFooterSchema = exports.CardBodySchema = exports.CardHeaderSchema = exports.CardVariantSchema = exports.CardVariantStyles = void 0;
exports.AssetLibraryDashboardSchema = exports.AssetLibraryFilterSchema = exports.AssetEntrySchema = exports.UsageRightsSchema = exports.AssetCategorySchema = exports.RenderHistoryDashboardSchema = exports.RenderCostSchema = exports.RenderStatusTrackingSchema = exports.RenderStatusHistoryEntrySchema = exports.RenderJobSchema = exports.RenderStatusSchema = exports.TemplateMarketplaceFilterSchema = exports.RemotionTemplateRatingSchema = exports.RemotionTemplatePricingSchema = exports.RemotionPricingModelSchema = exports.RemotionTemplateListingSchema = exports.RemotionTemplateCategorySchema = exports.WlAudienceSharingDashboardSchema = exports.SyncStatusSchema = exports.AudienceSharingConfigSchema = exports.SharingDestinationSchema = exports.AudienceSegmentSchema = exports.AudienceSegmentTypeSchema = exports.AudienceSegmentTypes = exports.WaitlistTemplateSchema = exports.DefaultCampaignTypeDefinitions = exports.CampaignTypeDefinitionSchema = exports.WaitlistCampaignTypeSchema = exports.WaitlistCampaignTypes = exports.MpSettingsSchema = exports.ContentRulesConfigSchema = void 0;
// ---------------------------------------------------------------------------
// UI-001: Design Tokens
// ---------------------------------------------------------------------------
var tokens_1 = require("./tokens");
Object.defineProperty(exports, "ColorPalette", { enumerable: true, get: function () { return tokens_1.ColorPalette; } });
Object.defineProperty(exports, "SpacingScale", { enumerable: true, get: function () { return tokens_1.SpacingScale; } });
Object.defineProperty(exports, "TypographyScale", { enumerable: true, get: function () { return tokens_1.TypographyScale; } });
Object.defineProperty(exports, "BorderRadii", { enumerable: true, get: function () { return tokens_1.BorderRadii; } });
Object.defineProperty(exports, "Shadows", { enumerable: true, get: function () { return tokens_1.Shadows; } });
Object.defineProperty(exports, "Breakpoints", { enumerable: true, get: function () { return tokens_1.Breakpoints; } });
Object.defineProperty(exports, "ZIndex", { enumerable: true, get: function () { return tokens_1.ZIndex; } });
Object.defineProperty(exports, "Transitions", { enumerable: true, get: function () { return tokens_1.Transitions; } });
Object.defineProperty(exports, "DesignTokens", { enumerable: true, get: function () { return tokens_1.DesignTokens; } });
Object.defineProperty(exports, "DesignTokenOverrideSchema", { enumerable: true, get: function () { return tokens_1.DesignTokenOverrideSchema; } });
// ---------------------------------------------------------------------------
// UI-002: Button Component Specs
// ---------------------------------------------------------------------------
var buttons_1 = require("./buttons");
Object.defineProperty(exports, "ButtonVariants", { enumerable: true, get: function () { return buttons_1.ButtonVariants; } });
Object.defineProperty(exports, "ButtonSizes", { enumerable: true, get: function () { return buttons_1.ButtonSizes; } });
Object.defineProperty(exports, "ButtonStates", { enumerable: true, get: function () { return buttons_1.ButtonStates; } });
Object.defineProperty(exports, "ButtonSizeTokens", { enumerable: true, get: function () { return buttons_1.ButtonSizeTokens; } });
Object.defineProperty(exports, "ButtonVariantStyles", { enumerable: true, get: function () { return buttons_1.ButtonVariantStyles; } });
Object.defineProperty(exports, "ButtonVariantSchema", { enumerable: true, get: function () { return buttons_1.ButtonVariantSchema; } });
Object.defineProperty(exports, "ButtonSizeSchema", { enumerable: true, get: function () { return buttons_1.ButtonSizeSchema; } });
Object.defineProperty(exports, "ButtonStateSchema", { enumerable: true, get: function () { return buttons_1.ButtonStateSchema; } });
Object.defineProperty(exports, "ButtonPropsSchema", { enumerable: true, get: function () { return buttons_1.ButtonPropsSchema; } });
Object.defineProperty(exports, "IconButtonPropsSchema", { enumerable: true, get: function () { return buttons_1.IconButtonPropsSchema; } });
Object.defineProperty(exports, "ButtonGroupPropsSchema", { enumerable: true, get: function () { return buttons_1.ButtonGroupPropsSchema; } });
// ---------------------------------------------------------------------------
// UI-003: Form Component Specs
// ---------------------------------------------------------------------------
var forms_1 = require("./forms");
Object.defineProperty(exports, "InputTypes", { enumerable: true, get: function () { return forms_1.InputTypes; } });
Object.defineProperty(exports, "ValidationStates", { enumerable: true, get: function () { return forms_1.ValidationStates; } });
Object.defineProperty(exports, "InputSizes", { enumerable: true, get: function () { return forms_1.InputSizes; } });
Object.defineProperty(exports, "InputSizeTokens", { enumerable: true, get: function () { return forms_1.InputSizeTokens; } });
Object.defineProperty(exports, "ValidationStateStyles", { enumerable: true, get: function () { return forms_1.ValidationStateStyles; } });
Object.defineProperty(exports, "InputTypeSchema", { enumerable: true, get: function () { return forms_1.InputTypeSchema; } });
Object.defineProperty(exports, "ValidationStateSchema", { enumerable: true, get: function () { return forms_1.ValidationStateSchema; } });
Object.defineProperty(exports, "InputSizeSchema", { enumerable: true, get: function () { return forms_1.InputSizeSchema; } });
Object.defineProperty(exports, "SelectOptionSchema", { enumerable: true, get: function () { return forms_1.SelectOptionSchema; } });
Object.defineProperty(exports, "BaseInputPropsSchema", { enumerable: true, get: function () { return forms_1.BaseInputPropsSchema; } });
Object.defineProperty(exports, "TextInputPropsSchema", { enumerable: true, get: function () { return forms_1.TextInputPropsSchema; } });
Object.defineProperty(exports, "EmailInputPropsSchema", { enumerable: true, get: function () { return forms_1.EmailInputPropsSchema; } });
Object.defineProperty(exports, "PasswordInputPropsSchema", { enumerable: true, get: function () { return forms_1.PasswordInputPropsSchema; } });
Object.defineProperty(exports, "NumberInputPropsSchema", { enumerable: true, get: function () { return forms_1.NumberInputPropsSchema; } });
Object.defineProperty(exports, "TextareaPropsSchema", { enumerable: true, get: function () { return forms_1.TextareaPropsSchema; } });
Object.defineProperty(exports, "SelectPropsSchema", { enumerable: true, get: function () { return forms_1.SelectPropsSchema; } });
Object.defineProperty(exports, "FormFieldPropsSchema", { enumerable: true, get: function () { return forms_1.FormFieldPropsSchema; } });
Object.defineProperty(exports, "FormLayoutSchema", { enumerable: true, get: function () { return forms_1.FormLayoutSchema; } });
Object.defineProperty(exports, "ValidationRuleSchema", { enumerable: true, get: function () { return forms_1.ValidationRuleSchema; } });
Object.defineProperty(exports, "FieldValidationConfigSchema", { enumerable: true, get: function () { return forms_1.FieldValidationConfigSchema; } });
// ---------------------------------------------------------------------------
// UI-004: Modal / Dialog Specs
// ---------------------------------------------------------------------------
var modals_1 = require("./modals");
Object.defineProperty(exports, "ModalSizes", { enumerable: true, get: function () { return modals_1.ModalSizes; } });
Object.defineProperty(exports, "ModalSizeTokens", { enumerable: true, get: function () { return modals_1.ModalSizeTokens; } });
Object.defineProperty(exports, "ModalSizeSchema", { enumerable: true, get: function () { return modals_1.ModalSizeSchema; } });
Object.defineProperty(exports, "CloseBehaviorSchema", { enumerable: true, get: function () { return modals_1.CloseBehaviorSchema; } });
Object.defineProperty(exports, "OverlayConfigSchema", { enumerable: true, get: function () { return modals_1.OverlayConfigSchema; } });
Object.defineProperty(exports, "ModalHeaderSchema", { enumerable: true, get: function () { return modals_1.ModalHeaderSchema; } });
Object.defineProperty(exports, "ModalFooterActionSchema", { enumerable: true, get: function () { return modals_1.ModalFooterActionSchema; } });
Object.defineProperty(exports, "ModalFooterSchema", { enumerable: true, get: function () { return modals_1.ModalFooterSchema; } });
Object.defineProperty(exports, "ModalBodySchema", { enumerable: true, get: function () { return modals_1.ModalBodySchema; } });
Object.defineProperty(exports, "ModalPropsSchema", { enumerable: true, get: function () { return modals_1.ModalPropsSchema; } });
Object.defineProperty(exports, "ConfirmDialogPropsSchema", { enumerable: true, get: function () { return modals_1.ConfirmDialogPropsSchema; } });
// ---------------------------------------------------------------------------
// UI-005: Data Table Specs
// ---------------------------------------------------------------------------
var tables_1 = require("./tables");
Object.defineProperty(exports, "ColumnAlignments", { enumerable: true, get: function () { return tables_1.ColumnAlignments; } });
Object.defineProperty(exports, "ColumnDataTypes", { enumerable: true, get: function () { return tables_1.ColumnDataTypes; } });
Object.defineProperty(exports, "SortDirections", { enumerable: true, get: function () { return tables_1.SortDirections; } });
Object.defineProperty(exports, "FilterOperators", { enumerable: true, get: function () { return tables_1.FilterOperators; } });
Object.defineProperty(exports, "ColumnDefinitionSchema", { enumerable: true, get: function () { return tables_1.ColumnDefinitionSchema; } });
Object.defineProperty(exports, "SortConfigSchema", { enumerable: true, get: function () { return tables_1.SortConfigSchema; } });
Object.defineProperty(exports, "TableSortSchema", { enumerable: true, get: function () { return tables_1.TableSortSchema; } });
Object.defineProperty(exports, "PaginationConfigSchema", { enumerable: true, get: function () { return tables_1.PaginationConfigSchema; } });
Object.defineProperty(exports, "RowSelectionSchema", { enumerable: true, get: function () { return tables_1.RowSelectionSchema; } });
Object.defineProperty(exports, "BulkActionSchema", { enumerable: true, get: function () { return tables_1.BulkActionSchema; } });
Object.defineProperty(exports, "BulkActionsConfigSchema", { enumerable: true, get: function () { return tables_1.BulkActionsConfigSchema; } });
Object.defineProperty(exports, "FilterConditionSchema", { enumerable: true, get: function () { return tables_1.FilterConditionSchema; } });
Object.defineProperty(exports, "FilterConfigSchema", { enumerable: true, get: function () { return tables_1.FilterConfigSchema; } });
Object.defineProperty(exports, "DataTablePropsSchema", { enumerable: true, get: function () { return tables_1.DataTablePropsSchema; } });
// ---------------------------------------------------------------------------
// UI-006: Toast / Notification Specs
// ---------------------------------------------------------------------------
var toasts_1 = require("./toasts");
Object.defineProperty(exports, "ToastVariants", { enumerable: true, get: function () { return toasts_1.ToastVariants; } });
Object.defineProperty(exports, "ToastPositions", { enumerable: true, get: function () { return toasts_1.ToastPositions; } });
Object.defineProperty(exports, "ToastVariantStyles", { enumerable: true, get: function () { return toasts_1.ToastVariantStyles; } });
Object.defineProperty(exports, "DefaultAutoDismissDurations", { enumerable: true, get: function () { return toasts_1.DefaultAutoDismissDurations; } });
Object.defineProperty(exports, "ToastVariantSchema", { enumerable: true, get: function () { return toasts_1.ToastVariantSchema; } });
Object.defineProperty(exports, "ToastPositionSchema", { enumerable: true, get: function () { return toasts_1.ToastPositionSchema; } });
Object.defineProperty(exports, "ToastActionSchema", { enumerable: true, get: function () { return toasts_1.ToastActionSchema; } });
Object.defineProperty(exports, "AutoDismissConfigSchema", { enumerable: true, get: function () { return toasts_1.AutoDismissConfigSchema; } });
Object.defineProperty(exports, "ToastPropsSchema", { enumerable: true, get: function () { return toasts_1.ToastPropsSchema; } });
Object.defineProperty(exports, "ToastContainerConfigSchema", { enumerable: true, get: function () { return toasts_1.ToastContainerConfigSchema; } });
// ---------------------------------------------------------------------------
// UI-007: Navigation Specs
// ---------------------------------------------------------------------------
var navigation_1 = require("./navigation");
Object.defineProperty(exports, "SidebarItemSchema", { enumerable: true, get: function () { return navigation_1.SidebarItemSchema; } });
Object.defineProperty(exports, "SidebarConfigSchema", { enumerable: true, get: function () { return navigation_1.SidebarConfigSchema; } });
Object.defineProperty(exports, "BreadcrumbItemSchema", { enumerable: true, get: function () { return navigation_1.BreadcrumbItemSchema; } });
Object.defineProperty(exports, "BreadcrumbConfigSchema", { enumerable: true, get: function () { return navigation_1.BreadcrumbConfigSchema; } });
Object.defineProperty(exports, "TabItemSchema", { enumerable: true, get: function () { return navigation_1.TabItemSchema; } });
Object.defineProperty(exports, "TabConfigSchema", { enumerable: true, get: function () { return navigation_1.TabConfigSchema; } });
Object.defineProperty(exports, "TopBarConfigSchema", { enumerable: true, get: function () { return navigation_1.TopBarConfigSchema; } });
Object.defineProperty(exports, "MobileMenuConfigSchema", { enumerable: true, get: function () { return navigation_1.MobileMenuConfigSchema; } });
Object.defineProperty(exports, "NavigationConfigSchema", { enumerable: true, get: function () { return navigation_1.NavigationConfigSchema; } });
// ---------------------------------------------------------------------------
// UI-008: Loading State Specs
// ---------------------------------------------------------------------------
var loading_1 = require("./loading");
Object.defineProperty(exports, "SkeletonShapes", { enumerable: true, get: function () { return loading_1.SkeletonShapes; } });
Object.defineProperty(exports, "SpinnerSizes", { enumerable: true, get: function () { return loading_1.SpinnerSizes; } });
Object.defineProperty(exports, "SkeletonPresets", { enumerable: true, get: function () { return loading_1.SkeletonPresets; } });
Object.defineProperty(exports, "SpinnerSizeTokens", { enumerable: true, get: function () { return loading_1.SpinnerSizeTokens; } });
Object.defineProperty(exports, "ProgressBarSizeTokens", { enumerable: true, get: function () { return loading_1.ProgressBarSizeTokens; } });
Object.defineProperty(exports, "SkeletonShapeSchema", { enumerable: true, get: function () { return loading_1.SkeletonShapeSchema; } });
Object.defineProperty(exports, "SkeletonPropsSchema", { enumerable: true, get: function () { return loading_1.SkeletonPropsSchema; } });
Object.defineProperty(exports, "SpinnerSizeSchema", { enumerable: true, get: function () { return loading_1.SpinnerSizeSchema; } });
Object.defineProperty(exports, "SpinnerPropsSchema", { enumerable: true, get: function () { return loading_1.SpinnerPropsSchema; } });
Object.defineProperty(exports, "ProgressBarPropsSchema", { enumerable: true, get: function () { return loading_1.ProgressBarPropsSchema; } });
Object.defineProperty(exports, "ShimmerConfigSchema", { enumerable: true, get: function () { return loading_1.ShimmerConfigSchema; } });
Object.defineProperty(exports, "LoadingStateSchema", { enumerable: true, get: function () { return loading_1.LoadingStateSchema; } });
Object.defineProperty(exports, "LoadingLayoutSchema", { enumerable: true, get: function () { return loading_1.LoadingLayoutSchema; } });
// ---------------------------------------------------------------------------
// UI-009: Card Component Specs
// ---------------------------------------------------------------------------
var cards_1 = require("./cards");
Object.defineProperty(exports, "CardVariants", { enumerable: true, get: function () { return cards_1.CardVariants; } });
Object.defineProperty(exports, "CardMediaPositions", { enumerable: true, get: function () { return cards_1.CardMediaPositions; } });
Object.defineProperty(exports, "CardVariantStyles", { enumerable: true, get: function () { return cards_1.CardVariantStyles; } });
Object.defineProperty(exports, "CardVariantSchema", { enumerable: true, get: function () { return cards_1.CardVariantSchema; } });
Object.defineProperty(exports, "CardHeaderSchema", { enumerable: true, get: function () { return cards_1.CardHeaderSchema; } });
Object.defineProperty(exports, "CardBodySchema", { enumerable: true, get: function () { return cards_1.CardBodySchema; } });
Object.defineProperty(exports, "CardFooterSchema", { enumerable: true, get: function () { return cards_1.CardFooterSchema; } });
Object.defineProperty(exports, "CardMediaSchema", { enumerable: true, get: function () { return cards_1.CardMediaSchema; } });
Object.defineProperty(exports, "CardActionSchema", { enumerable: true, get: function () { return cards_1.CardActionSchema; } });
Object.defineProperty(exports, "CardActionAreaSchema", { enumerable: true, get: function () { return cards_1.CardActionAreaSchema; } });
Object.defineProperty(exports, "CardPropsSchema", { enumerable: true, get: function () { return cards_1.CardPropsSchema; } });
Object.defineProperty(exports, "CardGridSchema", { enumerable: true, get: function () { return cards_1.CardGridSchema; } });
// ---------------------------------------------------------------------------
// UI-010: Chart Component Specs
// ---------------------------------------------------------------------------
var charts_1 = require("./charts");
Object.defineProperty(exports, "ChartTypes", { enumerable: true, get: function () { return charts_1.ChartTypes; } });
Object.defineProperty(exports, "ChartColorPalettes", { enumerable: true, get: function () { return charts_1.ChartColorPalettes; } });
Object.defineProperty(exports, "ChartTypeSchema", { enumerable: true, get: function () { return charts_1.ChartTypeSchema; } });
Object.defineProperty(exports, "AxisConfigSchema", { enumerable: true, get: function () { return charts_1.AxisConfigSchema; } });
Object.defineProperty(exports, "LegendConfigSchema", { enumerable: true, get: function () { return charts_1.LegendConfigSchema; } });
Object.defineProperty(exports, "TooltipConfigSchema", { enumerable: true, get: function () { return charts_1.TooltipConfigSchema; } });
Object.defineProperty(exports, "ChartResponsiveConfigSchema", { enumerable: true, get: function () { return charts_1.ChartResponsiveConfigSchema; } });
Object.defineProperty(exports, "DataPointSchema", { enumerable: true, get: function () { return charts_1.DataPointSchema; } });
Object.defineProperty(exports, "DataSeriesSchema", { enumerable: true, get: function () { return charts_1.DataSeriesSchema; } });
Object.defineProperty(exports, "ChartAnnotationSchema", { enumerable: true, get: function () { return charts_1.ChartAnnotationSchema; } });
Object.defineProperty(exports, "ChartPropsSchema", { enumerable: true, get: function () { return charts_1.ChartPropsSchema; } });
// ---------------------------------------------------------------------------
// INT-PCT-001 & INT-PCT-002: PCT Integration
// ---------------------------------------------------------------------------
var pct_integration_1 = require("./pct-integration");
Object.defineProperty(exports, "AdPerformanceMetricSchema", { enumerable: true, get: function () { return pct_integration_1.AdPerformanceMetricSchema; } });
Object.defineProperty(exports, "CampaignStatusSchema", { enumerable: true, get: function () { return pct_integration_1.CampaignStatusSchema; } });
Object.defineProperty(exports, "CampaignSummarySchema", { enumerable: true, get: function () { return pct_integration_1.CampaignSummarySchema; } });
Object.defineProperty(exports, "CreativeScoreSchema", { enumerable: true, get: function () { return pct_integration_1.CreativeScoreSchema; } });
Object.defineProperty(exports, "PctAnalyticsDashboardSchema", { enumerable: true, get: function () { return pct_integration_1.PctAnalyticsDashboardSchema; } });
Object.defineProperty(exports, "PctConfigurationSchema", { enumerable: true, get: function () { return pct_integration_1.PctConfigurationSchema; } });
Object.defineProperty(exports, "PctFeatureTogglesSchema", { enumerable: true, get: function () { return pct_integration_1.PctFeatureTogglesSchema; } });
Object.defineProperty(exports, "PctNotificationPreferencesSchema", { enumerable: true, get: function () { return pct_integration_1.PctNotificationPreferencesSchema; } });
Object.defineProperty(exports, "PctSettingsSchema", { enumerable: true, get: function () { return pct_integration_1.PctSettingsSchema; } });
// ---------------------------------------------------------------------------
// INT-CF-001 & INT-CF-002: Content Factory Integration
// ---------------------------------------------------------------------------
var cf_integration_1 = require("./cf-integration");
Object.defineProperty(exports, "ContentTypeSchema", { enumerable: true, get: function () { return cf_integration_1.ContentTypeSchema; } });
Object.defineProperty(exports, "ContentStatusSchema", { enumerable: true, get: function () { return cf_integration_1.ContentStatusSchema; } });
Object.defineProperty(exports, "ContentProductionMetricSchema", { enumerable: true, get: function () { return cf_integration_1.ContentProductionMetricSchema; } });
Object.defineProperty(exports, "PublishRateMetricSchema", { enumerable: true, get: function () { return cf_integration_1.PublishRateMetricSchema; } });
Object.defineProperty(exports, "ContentEngagementSchema", { enumerable: true, get: function () { return cf_integration_1.ContentEngagementSchema; } });
Object.defineProperty(exports, "CfAnalyticsDashboardSchema", { enumerable: true, get: function () { return cf_integration_1.CfAnalyticsDashboardSchema; } });
Object.defineProperty(exports, "TemplatePreferencesSchema", { enumerable: true, get: function () { return cf_integration_1.TemplatePreferencesSchema; } });
Object.defineProperty(exports, "PublishingDefaultsSchema", { enumerable: true, get: function () { return cf_integration_1.PublishingDefaultsSchema; } });
Object.defineProperty(exports, "CfAiConfigSchema", { enumerable: true, get: function () { return cf_integration_1.CfAiConfigSchema; } });
Object.defineProperty(exports, "CfSettingsSchema", { enumerable: true, get: function () { return cf_integration_1.CfSettingsSchema; } });
// ---------------------------------------------------------------------------
// INT-MP-001 & INT-MP-002: MediaPoster Integration
// ---------------------------------------------------------------------------
var mp_integration_1 = require("./mp-integration");
Object.defineProperty(exports, "SocialPlatformSchema", { enumerable: true, get: function () { return mp_integration_1.SocialPlatformSchema; } });
Object.defineProperty(exports, "PostFormatSchema", { enumerable: true, get: function () { return mp_integration_1.PostFormatSchema; } });
Object.defineProperty(exports, "PostPerformanceSchema", { enumerable: true, get: function () { return mp_integration_1.PostPerformanceSchema; } });
Object.defineProperty(exports, "ScheduleAdherenceSchema", { enumerable: true, get: function () { return mp_integration_1.ScheduleAdherenceSchema; } });
Object.defineProperty(exports, "PlatformBreakdownSchema", { enumerable: true, get: function () { return mp_integration_1.PlatformBreakdownSchema; } });
Object.defineProperty(exports, "MpAnalyticsDashboardSchema", { enumerable: true, get: function () { return mp_integration_1.MpAnalyticsDashboardSchema; } });
Object.defineProperty(exports, "ConnectedAccountSchema", { enumerable: true, get: function () { return mp_integration_1.ConnectedAccountSchema; } });
Object.defineProperty(exports, "PostingScheduleSlotSchema", { enumerable: true, get: function () { return mp_integration_1.PostingScheduleSlotSchema; } });
Object.defineProperty(exports, "PostingScheduleSchema", { enumerable: true, get: function () { return mp_integration_1.PostingScheduleSchema; } });
Object.defineProperty(exports, "ContentRuleSchema", { enumerable: true, get: function () { return mp_integration_1.ContentRuleSchema; } });
Object.defineProperty(exports, "ContentRulesConfigSchema", { enumerable: true, get: function () { return mp_integration_1.ContentRulesConfigSchema; } });
Object.defineProperty(exports, "MpSettingsSchema", { enumerable: true, get: function () { return mp_integration_1.MpSettingsSchema; } });
// ---------------------------------------------------------------------------
// INT-WL-001 & INT-WL-002: WaitlistLab Integration
// ---------------------------------------------------------------------------
var wl_integration_1 = require("./wl-integration");
Object.defineProperty(exports, "WaitlistCampaignTypes", { enumerable: true, get: function () { return wl_integration_1.WaitlistCampaignTypes; } });
Object.defineProperty(exports, "WaitlistCampaignTypeSchema", { enumerable: true, get: function () { return wl_integration_1.WaitlistCampaignTypeSchema; } });
Object.defineProperty(exports, "CampaignTypeDefinitionSchema", { enumerable: true, get: function () { return wl_integration_1.CampaignTypeDefinitionSchema; } });
Object.defineProperty(exports, "DefaultCampaignTypeDefinitions", { enumerable: true, get: function () { return wl_integration_1.DefaultCampaignTypeDefinitions; } });
Object.defineProperty(exports, "WaitlistTemplateSchema", { enumerable: true, get: function () { return wl_integration_1.WaitlistTemplateSchema; } });
Object.defineProperty(exports, "AudienceSegmentTypes", { enumerable: true, get: function () { return wl_integration_1.AudienceSegmentTypes; } });
Object.defineProperty(exports, "AudienceSegmentTypeSchema", { enumerable: true, get: function () { return wl_integration_1.AudienceSegmentTypeSchema; } });
Object.defineProperty(exports, "AudienceSegmentSchema", { enumerable: true, get: function () { return wl_integration_1.AudienceSegmentSchema; } });
Object.defineProperty(exports, "SharingDestinationSchema", { enumerable: true, get: function () { return wl_integration_1.SharingDestinationSchema; } });
Object.defineProperty(exports, "AudienceSharingConfigSchema", { enumerable: true, get: function () { return wl_integration_1.AudienceSharingConfigSchema; } });
Object.defineProperty(exports, "SyncStatusSchema", { enumerable: true, get: function () { return wl_integration_1.SyncStatusSchema; } });
Object.defineProperty(exports, "WlAudienceSharingDashboardSchema", { enumerable: true, get: function () { return wl_integration_1.WlAudienceSharingDashboardSchema; } });
// ---------------------------------------------------------------------------
// INT-REM-001, INT-REM-002, INT-REM-003: Remotion Integration
// ---------------------------------------------------------------------------
var remotion_integration_1 = require("./remotion-integration");
Object.defineProperty(exports, "RemotionTemplateCategorySchema", { enumerable: true, get: function () { return remotion_integration_1.RemotionTemplateCategorySchema; } });
Object.defineProperty(exports, "RemotionTemplateListingSchema", { enumerable: true, get: function () { return remotion_integration_1.RemotionTemplateListingSchema; } });
Object.defineProperty(exports, "RemotionPricingModelSchema", { enumerable: true, get: function () { return remotion_integration_1.RemotionPricingModelSchema; } });
Object.defineProperty(exports, "RemotionTemplatePricingSchema", { enumerable: true, get: function () { return remotion_integration_1.RemotionTemplatePricingSchema; } });
Object.defineProperty(exports, "RemotionTemplateRatingSchema", { enumerable: true, get: function () { return remotion_integration_1.RemotionTemplateRatingSchema; } });
Object.defineProperty(exports, "TemplateMarketplaceFilterSchema", { enumerable: true, get: function () { return remotion_integration_1.TemplateMarketplaceFilterSchema; } });
Object.defineProperty(exports, "RenderStatusSchema", { enumerable: true, get: function () { return remotion_integration_1.RenderStatusSchema; } });
Object.defineProperty(exports, "RenderJobSchema", { enumerable: true, get: function () { return remotion_integration_1.RenderJobSchema; } });
Object.defineProperty(exports, "RenderStatusHistoryEntrySchema", { enumerable: true, get: function () { return remotion_integration_1.RenderStatusHistoryEntrySchema; } });
Object.defineProperty(exports, "RenderStatusTrackingSchema", { enumerable: true, get: function () { return remotion_integration_1.RenderStatusTrackingSchema; } });
Object.defineProperty(exports, "RenderCostSchema", { enumerable: true, get: function () { return remotion_integration_1.RenderCostSchema; } });
Object.defineProperty(exports, "RenderHistoryDashboardSchema", { enumerable: true, get: function () { return remotion_integration_1.RenderHistoryDashboardSchema; } });
Object.defineProperty(exports, "AssetCategorySchema", { enumerable: true, get: function () { return remotion_integration_1.AssetCategorySchema; } });
Object.defineProperty(exports, "UsageRightsSchema", { enumerable: true, get: function () { return remotion_integration_1.UsageRightsSchema; } });
Object.defineProperty(exports, "AssetEntrySchema", { enumerable: true, get: function () { return remotion_integration_1.AssetEntrySchema; } });
Object.defineProperty(exports, "AssetLibraryFilterSchema", { enumerable: true, get: function () { return remotion_integration_1.AssetLibraryFilterSchema; } });
Object.defineProperty(exports, "AssetLibraryDashboardSchema", { enumerable: true, get: function () { return remotion_integration_1.AssetLibraryDashboardSchema; } });
//# sourceMappingURL=index.js.map