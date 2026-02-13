/**
 * UI-005: Data Table Specs
 *
 * Type definitions and Zod schemas for data tables, including column
 * definitions, sort config, pagination, row selection, bulk actions,
 * and filter configuration.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Column Alignment
// ---------------------------------------------------------------------------

export const ColumnAlignments = ["left", "center", "right"] as const;
export type ColumnAlignment = (typeof ColumnAlignments)[number];

// ---------------------------------------------------------------------------
// Column Data Types
// ---------------------------------------------------------------------------

export const ColumnDataTypes = [
  "string",
  "number",
  "date",
  "boolean",
  "currency",
  "percentage",
  "badge",
  "avatar",
  "actions",
  "custom",
] as const;
export type ColumnDataType = (typeof ColumnDataTypes)[number];

// ---------------------------------------------------------------------------
// Column Definition
// ---------------------------------------------------------------------------

export const ColumnDefinitionSchema = z.object({
  /** Unique column identifier (maps to data field) */
  id: z.string(),
  /** Display header label */
  header: z.string(),
  /** Data type for rendering and sorting */
  dataType: z.enum(ColumnDataTypes).default("string"),
  /** Text alignment */
  align: z.enum(ColumnAlignments).default("left"),
  /** Whether column is sortable */
  sortable: z.boolean().default(false),
  /** Whether column is filterable */
  filterable: z.boolean().default(false),
  /** Whether column is resizable */
  resizable: z.boolean().default(false),
  /** Whether column can be hidden by user */
  hideable: z.boolean().default(true),
  /** Whether column is pinned */
  pinned: z.enum(["left", "right", "none"]).default("none"),
  /** Whether column is initially visible */
  visible: z.boolean().default(true),
  /** Minimum column width in pixels */
  minWidth: z.number().optional().default(80),
  /** Maximum column width in pixels */
  maxWidth: z.number().optional(),
  /** Fixed column width in pixels */
  width: z.number().optional(),
  /** Custom render type identifier (for custom cell renderers) */
  renderType: z.string().optional(),
  /** Tooltip text for the column header */
  headerTooltip: z.string().optional(),
  /** Format string (e.g. date format, number format) */
  format: z.string().optional(),
}).strict();

export type ColumnDefinition = z.infer<typeof ColumnDefinitionSchema>;

// ---------------------------------------------------------------------------
// Sort Config
// ---------------------------------------------------------------------------

export const SortDirections = ["asc", "desc"] as const;
export type SortDirection = (typeof SortDirections)[number];

export const SortConfigSchema = z.object({
  /** Column id to sort by */
  columnId: z.string(),
  /** Sort direction */
  direction: z.enum(SortDirections),
}).strict();

export type SortConfig = z.infer<typeof SortConfigSchema>;

export const TableSortSchema = z.object({
  /** Enable multi-column sorting */
  multiSort: z.boolean().default(false),
  /** Maximum number of sort columns (when multiSort is true) */
  maxSortColumns: z.number().int().positive().default(3),
  /** Default sort configuration */
  defaultSort: z.array(SortConfigSchema).default([]),
  /** Active sort configuration */
  activeSort: z.array(SortConfigSchema).default([]),
}).strict();

export type TableSort = z.infer<typeof TableSortSchema>;

// ---------------------------------------------------------------------------
// Pagination Config
// ---------------------------------------------------------------------------

export const PaginationConfigSchema = z.object({
  /** Enable pagination */
  enabled: z.boolean().default(true),
  /** Current page (1-based) */
  currentPage: z.number().int().positive().default(1),
  /** Rows per page */
  pageSize: z.number().int().positive().default(25),
  /** Available page size options */
  pageSizeOptions: z.array(z.number().int().positive()).default([10, 25, 50, 100]),
  /** Total number of rows (for server-side pagination) */
  totalRows: z.number().int().nonnegative().optional(),
  /** Show page size selector */
  showPageSizeSelector: z.boolean().default(true),
  /** Show row count summary */
  showRowCount: z.boolean().default(true),
  /** Show first/last page buttons */
  showFirstLast: z.boolean().default(true),
  /** Pagination position */
  position: z.enum(["top", "bottom", "both"]).default("bottom"),
}).strict();

export type PaginationConfig = z.infer<typeof PaginationConfigSchema>;

// ---------------------------------------------------------------------------
// Row Selection
// ---------------------------------------------------------------------------

export const RowSelectionSchema = z.object({
  /** Enable row selection */
  enabled: z.boolean().default(false),
  /** Selection mode */
  mode: z.enum(["single", "multiple"]).default("multiple"),
  /** Show checkbox column */
  showCheckbox: z.boolean().default(true),
  /** Show select-all checkbox */
  showSelectAll: z.boolean().default(true),
  /** Currently selected row keys */
  selectedKeys: z.array(z.string()).default([]),
  /** Preserve selections across pages */
  preserveAcrossPages: z.boolean().default(true),
  /** Maximum selectable rows (0 = unlimited) */
  maxSelections: z.number().int().nonnegative().default(0),
}).strict();

export type RowSelection = z.infer<typeof RowSelectionSchema>;

// ---------------------------------------------------------------------------
// Bulk Actions
// ---------------------------------------------------------------------------

export const BulkActionSchema = z.object({
  /** Action identifier */
  id: z.string(),
  /** Display label */
  label: z.string(),
  /** Icon identifier */
  icon: z.string().optional(),
  /** Variant for styling */
  variant: z.enum(["default", "danger"]).default("default"),
  /** Whether this action requires confirmation */
  requiresConfirmation: z.boolean().default(false),
  /** Confirmation message */
  confirmationMessage: z.string().optional(),
  /** Minimum number of selected rows to enable */
  minSelections: z.number().int().positive().default(1),
  /** Maximum number of selected rows to enable (0 = unlimited) */
  maxSelections: z.number().int().nonnegative().default(0),
}).strict();

export type BulkAction = z.infer<typeof BulkActionSchema>;

export const BulkActionsConfigSchema = z.object({
  /** Available bulk actions */
  actions: z.array(BulkActionSchema).default([]),
  /** Position of bulk action bar */
  position: z.enum(["top", "bottom", "floating"]).default("top"),
  /** Show selected count */
  showSelectedCount: z.boolean().default(true),
}).strict();

export type BulkActionsConfig = z.infer<typeof BulkActionsConfigSchema>;

// ---------------------------------------------------------------------------
// Filter Config
// ---------------------------------------------------------------------------

export const FilterOperators = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "greater_equal",
  "less_equal",
  "between",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
] as const;
export type FilterOperator = (typeof FilterOperators)[number];

export const FilterConditionSchema = z.object({
  /** Column id to filter */
  columnId: z.string(),
  /** Filter operator */
  operator: z.enum(FilterOperators),
  /** Filter value (type depends on column dataType) */
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())]),
  /** Secondary value (for "between" operator) */
  valueTo: z.union([z.string(), z.number()]).optional(),
}).strict();

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

export const FilterConfigSchema = z.object({
  /** Enable filtering */
  enabled: z.boolean().default(true),
  /** Global search (filter across all filterable columns) */
  globalSearch: z.boolean().default(false),
  /** Global search placeholder */
  globalSearchPlaceholder: z.string().default("Search..."),
  /** Active filter conditions */
  conditions: z.array(FilterConditionSchema).default([]),
  /** Logical operator between conditions */
  logicalOperator: z.enum(["and", "or"]).default("and"),
  /** Show filter row in header */
  showFilterRow: z.boolean().default(false),
  /** Show filter panel/sidebar */
  showFilterPanel: z.boolean().default(false),
  /** Debounce delay for filter input (ms) */
  debounceMs: z.number().default(300),
}).strict();

export type FilterConfig = z.infer<typeof FilterConfigSchema>;

// ---------------------------------------------------------------------------
// Complete Data Table Props
// ---------------------------------------------------------------------------

export const DataTablePropsSchema = z.object({
  /** Column definitions */
  columns: z.array(ColumnDefinitionSchema),
  /** Sort configuration */
  sort: TableSortSchema.optional(),
  /** Pagination configuration */
  pagination: PaginationConfigSchema.optional(),
  /** Row selection configuration */
  selection: RowSelectionSchema.optional(),
  /** Bulk actions configuration */
  bulkActions: BulkActionsConfigSchema.optional(),
  /** Filter configuration */
  filter: FilterConfigSchema.optional(),
  /** Row key field (unique identifier field in data) */
  rowKeyField: z.string().default("id"),
  /** Enable row hover highlight */
  hoverable: z.boolean().default(true),
  /** Enable striped rows */
  striped: z.boolean().default(false),
  /** Enable row borders */
  bordered: z.boolean().default(true),
  /** Compact row density */
  density: z.enum(["compact", "normal", "comfortable"]).default("normal"),
  /** Show loading state */
  loading: z.boolean().default(false),
  /** Empty state message */
  emptyMessage: z.string().default("No data available"),
  /** Sticky header */
  stickyHeader: z.boolean().default(false),
  /** Max table height (for scrolling) */
  maxHeight: z.union([z.number(), z.string()]).optional(),
  /** Enable column reordering via drag */
  reorderableColumns: z.boolean().default(false),
  /** Enable virtual scrolling for large datasets */
  virtualScroll: z.boolean().default(false),
  /** Row height for virtual scrolling */
  virtualRowHeight: z.number().default(48),
}).strict();

export type DataTableProps = z.infer<typeof DataTablePropsSchema>;
