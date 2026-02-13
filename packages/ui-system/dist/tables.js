"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTablePropsSchema = exports.FilterConfigSchema = exports.FilterConditionSchema = exports.FilterOperators = exports.BulkActionsConfigSchema = exports.BulkActionSchema = exports.RowSelectionSchema = exports.PaginationConfigSchema = exports.TableSortSchema = exports.SortConfigSchema = exports.SortDirections = exports.ColumnDefinitionSchema = exports.ColumnDataTypes = exports.ColumnAlignments = void 0;
/**
 * UI-005: Data Table Specs
 *
 * Type definitions and Zod schemas for data tables, including column
 * definitions, sort config, pagination, row selection, bulk actions,
 * and filter configuration.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Column Alignment
// ---------------------------------------------------------------------------
exports.ColumnAlignments = ["left", "center", "right"];
// ---------------------------------------------------------------------------
// Column Data Types
// ---------------------------------------------------------------------------
exports.ColumnDataTypes = [
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
];
// ---------------------------------------------------------------------------
// Column Definition
// ---------------------------------------------------------------------------
exports.ColumnDefinitionSchema = zod_1.z.object({
    /** Unique column identifier (maps to data field) */
    id: zod_1.z.string(),
    /** Display header label */
    header: zod_1.z.string(),
    /** Data type for rendering and sorting */
    dataType: zod_1.z.enum(exports.ColumnDataTypes).default("string"),
    /** Text alignment */
    align: zod_1.z.enum(exports.ColumnAlignments).default("left"),
    /** Whether column is sortable */
    sortable: zod_1.z.boolean().default(false),
    /** Whether column is filterable */
    filterable: zod_1.z.boolean().default(false),
    /** Whether column is resizable */
    resizable: zod_1.z.boolean().default(false),
    /** Whether column can be hidden by user */
    hideable: zod_1.z.boolean().default(true),
    /** Whether column is pinned */
    pinned: zod_1.z.enum(["left", "right", "none"]).default("none"),
    /** Whether column is initially visible */
    visible: zod_1.z.boolean().default(true),
    /** Minimum column width in pixels */
    minWidth: zod_1.z.number().optional().default(80),
    /** Maximum column width in pixels */
    maxWidth: zod_1.z.number().optional(),
    /** Fixed column width in pixels */
    width: zod_1.z.number().optional(),
    /** Custom render type identifier (for custom cell renderers) */
    renderType: zod_1.z.string().optional(),
    /** Tooltip text for the column header */
    headerTooltip: zod_1.z.string().optional(),
    /** Format string (e.g. date format, number format) */
    format: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Sort Config
// ---------------------------------------------------------------------------
exports.SortDirections = ["asc", "desc"];
exports.SortConfigSchema = zod_1.z.object({
    /** Column id to sort by */
    columnId: zod_1.z.string(),
    /** Sort direction */
    direction: zod_1.z.enum(exports.SortDirections),
}).strict();
exports.TableSortSchema = zod_1.z.object({
    /** Enable multi-column sorting */
    multiSort: zod_1.z.boolean().default(false),
    /** Maximum number of sort columns (when multiSort is true) */
    maxSortColumns: zod_1.z.number().int().positive().default(3),
    /** Default sort configuration */
    defaultSort: zod_1.z.array(exports.SortConfigSchema).default([]),
    /** Active sort configuration */
    activeSort: zod_1.z.array(exports.SortConfigSchema).default([]),
}).strict();
// ---------------------------------------------------------------------------
// Pagination Config
// ---------------------------------------------------------------------------
exports.PaginationConfigSchema = zod_1.z.object({
    /** Enable pagination */
    enabled: zod_1.z.boolean().default(true),
    /** Current page (1-based) */
    currentPage: zod_1.z.number().int().positive().default(1),
    /** Rows per page */
    pageSize: zod_1.z.number().int().positive().default(25),
    /** Available page size options */
    pageSizeOptions: zod_1.z.array(zod_1.z.number().int().positive()).default([10, 25, 50, 100]),
    /** Total number of rows (for server-side pagination) */
    totalRows: zod_1.z.number().int().nonnegative().optional(),
    /** Show page size selector */
    showPageSizeSelector: zod_1.z.boolean().default(true),
    /** Show row count summary */
    showRowCount: zod_1.z.boolean().default(true),
    /** Show first/last page buttons */
    showFirstLast: zod_1.z.boolean().default(true),
    /** Pagination position */
    position: zod_1.z.enum(["top", "bottom", "both"]).default("bottom"),
}).strict();
// ---------------------------------------------------------------------------
// Row Selection
// ---------------------------------------------------------------------------
exports.RowSelectionSchema = zod_1.z.object({
    /** Enable row selection */
    enabled: zod_1.z.boolean().default(false),
    /** Selection mode */
    mode: zod_1.z.enum(["single", "multiple"]).default("multiple"),
    /** Show checkbox column */
    showCheckbox: zod_1.z.boolean().default(true),
    /** Show select-all checkbox */
    showSelectAll: zod_1.z.boolean().default(true),
    /** Currently selected row keys */
    selectedKeys: zod_1.z.array(zod_1.z.string()).default([]),
    /** Preserve selections across pages */
    preserveAcrossPages: zod_1.z.boolean().default(true),
    /** Maximum selectable rows (0 = unlimited) */
    maxSelections: zod_1.z.number().int().nonnegative().default(0),
}).strict();
// ---------------------------------------------------------------------------
// Bulk Actions
// ---------------------------------------------------------------------------
exports.BulkActionSchema = zod_1.z.object({
    /** Action identifier */
    id: zod_1.z.string(),
    /** Display label */
    label: zod_1.z.string(),
    /** Icon identifier */
    icon: zod_1.z.string().optional(),
    /** Variant for styling */
    variant: zod_1.z.enum(["default", "danger"]).default("default"),
    /** Whether this action requires confirmation */
    requiresConfirmation: zod_1.z.boolean().default(false),
    /** Confirmation message */
    confirmationMessage: zod_1.z.string().optional(),
    /** Minimum number of selected rows to enable */
    minSelections: zod_1.z.number().int().positive().default(1),
    /** Maximum number of selected rows to enable (0 = unlimited) */
    maxSelections: zod_1.z.number().int().nonnegative().default(0),
}).strict();
exports.BulkActionsConfigSchema = zod_1.z.object({
    /** Available bulk actions */
    actions: zod_1.z.array(exports.BulkActionSchema).default([]),
    /** Position of bulk action bar */
    position: zod_1.z.enum(["top", "bottom", "floating"]).default("top"),
    /** Show selected count */
    showSelectedCount: zod_1.z.boolean().default(true),
}).strict();
// ---------------------------------------------------------------------------
// Filter Config
// ---------------------------------------------------------------------------
exports.FilterOperators = [
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
];
exports.FilterConditionSchema = zod_1.z.object({
    /** Column id to filter */
    columnId: zod_1.z.string(),
    /** Filter operator */
    operator: zod_1.z.enum(exports.FilterOperators),
    /** Filter value (type depends on column dataType) */
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string()), zod_1.z.array(zod_1.z.number())]),
    /** Secondary value (for "between" operator) */
    valueTo: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
}).strict();
exports.FilterConfigSchema = zod_1.z.object({
    /** Enable filtering */
    enabled: zod_1.z.boolean().default(true),
    /** Global search (filter across all filterable columns) */
    globalSearch: zod_1.z.boolean().default(false),
    /** Global search placeholder */
    globalSearchPlaceholder: zod_1.z.string().default("Search..."),
    /** Active filter conditions */
    conditions: zod_1.z.array(exports.FilterConditionSchema).default([]),
    /** Logical operator between conditions */
    logicalOperator: zod_1.z.enum(["and", "or"]).default("and"),
    /** Show filter row in header */
    showFilterRow: zod_1.z.boolean().default(false),
    /** Show filter panel/sidebar */
    showFilterPanel: zod_1.z.boolean().default(false),
    /** Debounce delay for filter input (ms) */
    debounceMs: zod_1.z.number().default(300),
}).strict();
// ---------------------------------------------------------------------------
// Complete Data Table Props
// ---------------------------------------------------------------------------
exports.DataTablePropsSchema = zod_1.z.object({
    /** Column definitions */
    columns: zod_1.z.array(exports.ColumnDefinitionSchema),
    /** Sort configuration */
    sort: exports.TableSortSchema.optional(),
    /** Pagination configuration */
    pagination: exports.PaginationConfigSchema.optional(),
    /** Row selection configuration */
    selection: exports.RowSelectionSchema.optional(),
    /** Bulk actions configuration */
    bulkActions: exports.BulkActionsConfigSchema.optional(),
    /** Filter configuration */
    filter: exports.FilterConfigSchema.optional(),
    /** Row key field (unique identifier field in data) */
    rowKeyField: zod_1.z.string().default("id"),
    /** Enable row hover highlight */
    hoverable: zod_1.z.boolean().default(true),
    /** Enable striped rows */
    striped: zod_1.z.boolean().default(false),
    /** Enable row borders */
    bordered: zod_1.z.boolean().default(true),
    /** Compact row density */
    density: zod_1.z.enum(["compact", "normal", "comfortable"]).default("normal"),
    /** Show loading state */
    loading: zod_1.z.boolean().default(false),
    /** Empty state message */
    emptyMessage: zod_1.z.string().default("No data available"),
    /** Sticky header */
    stickyHeader: zod_1.z.boolean().default(false),
    /** Max table height (for scrolling) */
    maxHeight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** Enable column reordering via drag */
    reorderableColumns: zod_1.z.boolean().default(false),
    /** Enable virtual scrolling for large datasets */
    virtualScroll: zod_1.z.boolean().default(false),
    /** Row height for virtual scrolling */
    virtualRowHeight: zod_1.z.number().default(48),
}).strict();
//# sourceMappingURL=tables.js.map