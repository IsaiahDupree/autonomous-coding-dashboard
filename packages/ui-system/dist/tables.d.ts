/**
 * UI-005: Data Table Specs
 *
 * Type definitions and Zod schemas for data tables, including column
 * definitions, sort config, pagination, row selection, bulk actions,
 * and filter configuration.
 */
import { z } from "zod";
export declare const ColumnAlignments: readonly ["left", "center", "right"];
export type ColumnAlignment = (typeof ColumnAlignments)[number];
export declare const ColumnDataTypes: readonly ["string", "number", "date", "boolean", "currency", "percentage", "badge", "avatar", "actions", "custom"];
export type ColumnDataType = (typeof ColumnDataTypes)[number];
export declare const ColumnDefinitionSchema: z.ZodObject<{
    /** Unique column identifier (maps to data field) */
    id: z.ZodString;
    /** Display header label */
    header: z.ZodString;
    /** Data type for rendering and sorting */
    dataType: z.ZodDefault<z.ZodEnum<["string", "number", "date", "boolean", "currency", "percentage", "badge", "avatar", "actions", "custom"]>>;
    /** Text alignment */
    align: z.ZodDefault<z.ZodEnum<["left", "center", "right"]>>;
    /** Whether column is sortable */
    sortable: z.ZodDefault<z.ZodBoolean>;
    /** Whether column is filterable */
    filterable: z.ZodDefault<z.ZodBoolean>;
    /** Whether column is resizable */
    resizable: z.ZodDefault<z.ZodBoolean>;
    /** Whether column can be hidden by user */
    hideable: z.ZodDefault<z.ZodBoolean>;
    /** Whether column is pinned */
    pinned: z.ZodDefault<z.ZodEnum<["left", "right", "none"]>>;
    /** Whether column is initially visible */
    visible: z.ZodDefault<z.ZodBoolean>;
    /** Minimum column width in pixels */
    minWidth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    /** Maximum column width in pixels */
    maxWidth: z.ZodOptional<z.ZodNumber>;
    /** Fixed column width in pixels */
    width: z.ZodOptional<z.ZodNumber>;
    /** Custom render type identifier (for custom cell renderers) */
    renderType: z.ZodOptional<z.ZodString>;
    /** Tooltip text for the column header */
    headerTooltip: z.ZodOptional<z.ZodString>;
    /** Format string (e.g. date format, number format) */
    format: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    align: "center" | "left" | "right";
    id: string;
    header: string;
    visible: boolean;
    dataType: "string" | "number" | "boolean" | "avatar" | "actions" | "custom" | "date" | "currency" | "percentage" | "badge";
    sortable: boolean;
    filterable: boolean;
    resizable: boolean;
    hideable: boolean;
    pinned: "none" | "left" | "right";
    minWidth: number;
    width?: number | undefined;
    maxWidth?: number | undefined;
    renderType?: string | undefined;
    headerTooltip?: string | undefined;
    format?: string | undefined;
}, {
    id: string;
    header: string;
    align?: "center" | "left" | "right" | undefined;
    width?: number | undefined;
    maxWidth?: number | undefined;
    visible?: boolean | undefined;
    dataType?: "string" | "number" | "boolean" | "avatar" | "actions" | "custom" | "date" | "currency" | "percentage" | "badge" | undefined;
    sortable?: boolean | undefined;
    filterable?: boolean | undefined;
    resizable?: boolean | undefined;
    hideable?: boolean | undefined;
    pinned?: "none" | "left" | "right" | undefined;
    minWidth?: number | undefined;
    renderType?: string | undefined;
    headerTooltip?: string | undefined;
    format?: string | undefined;
}>;
export type ColumnDefinition = z.infer<typeof ColumnDefinitionSchema>;
export declare const SortDirections: readonly ["asc", "desc"];
export type SortDirection = (typeof SortDirections)[number];
export declare const SortConfigSchema: z.ZodObject<{
    /** Column id to sort by */
    columnId: z.ZodString;
    /** Sort direction */
    direction: z.ZodEnum<["asc", "desc"]>;
}, "strict", z.ZodTypeAny, {
    direction: "asc" | "desc";
    columnId: string;
}, {
    direction: "asc" | "desc";
    columnId: string;
}>;
export type SortConfig = z.infer<typeof SortConfigSchema>;
export declare const TableSortSchema: z.ZodObject<{
    /** Enable multi-column sorting */
    multiSort: z.ZodDefault<z.ZodBoolean>;
    /** Maximum number of sort columns (when multiSort is true) */
    maxSortColumns: z.ZodDefault<z.ZodNumber>;
    /** Default sort configuration */
    defaultSort: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Column id to sort by */
        columnId: z.ZodString;
        /** Sort direction */
        direction: z.ZodEnum<["asc", "desc"]>;
    }, "strict", z.ZodTypeAny, {
        direction: "asc" | "desc";
        columnId: string;
    }, {
        direction: "asc" | "desc";
        columnId: string;
    }>, "many">>;
    /** Active sort configuration */
    activeSort: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Column id to sort by */
        columnId: z.ZodString;
        /** Sort direction */
        direction: z.ZodEnum<["asc", "desc"]>;
    }, "strict", z.ZodTypeAny, {
        direction: "asc" | "desc";
        columnId: string;
    }, {
        direction: "asc" | "desc";
        columnId: string;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    multiSort: boolean;
    maxSortColumns: number;
    defaultSort: {
        direction: "asc" | "desc";
        columnId: string;
    }[];
    activeSort: {
        direction: "asc" | "desc";
        columnId: string;
    }[];
}, {
    multiSort?: boolean | undefined;
    maxSortColumns?: number | undefined;
    defaultSort?: {
        direction: "asc" | "desc";
        columnId: string;
    }[] | undefined;
    activeSort?: {
        direction: "asc" | "desc";
        columnId: string;
    }[] | undefined;
}>;
export type TableSort = z.infer<typeof TableSortSchema>;
export declare const PaginationConfigSchema: z.ZodObject<{
    /** Enable pagination */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Current page (1-based) */
    currentPage: z.ZodDefault<z.ZodNumber>;
    /** Rows per page */
    pageSize: z.ZodDefault<z.ZodNumber>;
    /** Available page size options */
    pageSizeOptions: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    /** Total number of rows (for server-side pagination) */
    totalRows: z.ZodOptional<z.ZodNumber>;
    /** Show page size selector */
    showPageSizeSelector: z.ZodDefault<z.ZodBoolean>;
    /** Show row count summary */
    showRowCount: z.ZodDefault<z.ZodBoolean>;
    /** Show first/last page buttons */
    showFirstLast: z.ZodDefault<z.ZodBoolean>;
    /** Pagination position */
    position: z.ZodDefault<z.ZodEnum<["top", "bottom", "both"]>>;
}, "strict", z.ZodTypeAny, {
    position: "top" | "bottom" | "both";
    enabled: boolean;
    currentPage: number;
    pageSize: number;
    pageSizeOptions: number[];
    showPageSizeSelector: boolean;
    showRowCount: boolean;
    showFirstLast: boolean;
    totalRows?: number | undefined;
}, {
    position?: "top" | "bottom" | "both" | undefined;
    enabled?: boolean | undefined;
    currentPage?: number | undefined;
    pageSize?: number | undefined;
    pageSizeOptions?: number[] | undefined;
    totalRows?: number | undefined;
    showPageSizeSelector?: boolean | undefined;
    showRowCount?: boolean | undefined;
    showFirstLast?: boolean | undefined;
}>;
export type PaginationConfig = z.infer<typeof PaginationConfigSchema>;
export declare const RowSelectionSchema: z.ZodObject<{
    /** Enable row selection */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Selection mode */
    mode: z.ZodDefault<z.ZodEnum<["single", "multiple"]>>;
    /** Show checkbox column */
    showCheckbox: z.ZodDefault<z.ZodBoolean>;
    /** Show select-all checkbox */
    showSelectAll: z.ZodDefault<z.ZodBoolean>;
    /** Currently selected row keys */
    selectedKeys: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Preserve selections across pages */
    preserveAcrossPages: z.ZodDefault<z.ZodBoolean>;
    /** Maximum selectable rows (0 = unlimited) */
    maxSelections: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    enabled: boolean;
    maxSelections: number;
    mode: "multiple" | "single";
    showCheckbox: boolean;
    showSelectAll: boolean;
    selectedKeys: string[];
    preserveAcrossPages: boolean;
}, {
    enabled?: boolean | undefined;
    maxSelections?: number | undefined;
    mode?: "multiple" | "single" | undefined;
    showCheckbox?: boolean | undefined;
    showSelectAll?: boolean | undefined;
    selectedKeys?: string[] | undefined;
    preserveAcrossPages?: boolean | undefined;
}>;
export type RowSelection = z.infer<typeof RowSelectionSchema>;
export declare const BulkActionSchema: z.ZodObject<{
    /** Action identifier */
    id: z.ZodString;
    /** Display label */
    label: z.ZodString;
    /** Icon identifier */
    icon: z.ZodOptional<z.ZodString>;
    /** Variant for styling */
    variant: z.ZodDefault<z.ZodEnum<["default", "danger"]>>;
    /** Whether this action requires confirmation */
    requiresConfirmation: z.ZodDefault<z.ZodBoolean>;
    /** Confirmation message */
    confirmationMessage: z.ZodOptional<z.ZodString>;
    /** Minimum number of selected rows to enable */
    minSelections: z.ZodDefault<z.ZodNumber>;
    /** Maximum number of selected rows to enable (0 = unlimited) */
    maxSelections: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    variant: "danger" | "default";
    id: string;
    label: string;
    maxSelections: number;
    requiresConfirmation: boolean;
    minSelections: number;
    icon?: string | undefined;
    confirmationMessage?: string | undefined;
}, {
    id: string;
    label: string;
    variant?: "danger" | "default" | undefined;
    icon?: string | undefined;
    maxSelections?: number | undefined;
    requiresConfirmation?: boolean | undefined;
    confirmationMessage?: string | undefined;
    minSelections?: number | undefined;
}>;
export type BulkAction = z.infer<typeof BulkActionSchema>;
export declare const BulkActionsConfigSchema: z.ZodObject<{
    /** Available bulk actions */
    actions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Action identifier */
        id: z.ZodString;
        /** Display label */
        label: z.ZodString;
        /** Icon identifier */
        icon: z.ZodOptional<z.ZodString>;
        /** Variant for styling */
        variant: z.ZodDefault<z.ZodEnum<["default", "danger"]>>;
        /** Whether this action requires confirmation */
        requiresConfirmation: z.ZodDefault<z.ZodBoolean>;
        /** Confirmation message */
        confirmationMessage: z.ZodOptional<z.ZodString>;
        /** Minimum number of selected rows to enable */
        minSelections: z.ZodDefault<z.ZodNumber>;
        /** Maximum number of selected rows to enable (0 = unlimited) */
        maxSelections: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        variant: "danger" | "default";
        id: string;
        label: string;
        maxSelections: number;
        requiresConfirmation: boolean;
        minSelections: number;
        icon?: string | undefined;
        confirmationMessage?: string | undefined;
    }, {
        id: string;
        label: string;
        variant?: "danger" | "default" | undefined;
        icon?: string | undefined;
        maxSelections?: number | undefined;
        requiresConfirmation?: boolean | undefined;
        confirmationMessage?: string | undefined;
        minSelections?: number | undefined;
    }>, "many">>;
    /** Position of bulk action bar */
    position: z.ZodDefault<z.ZodEnum<["top", "bottom", "floating"]>>;
    /** Show selected count */
    showSelectedCount: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    position: "top" | "bottom" | "floating";
    actions: {
        variant: "danger" | "default";
        id: string;
        label: string;
        maxSelections: number;
        requiresConfirmation: boolean;
        minSelections: number;
        icon?: string | undefined;
        confirmationMessage?: string | undefined;
    }[];
    showSelectedCount: boolean;
}, {
    position?: "top" | "bottom" | "floating" | undefined;
    actions?: {
        id: string;
        label: string;
        variant?: "danger" | "default" | undefined;
        icon?: string | undefined;
        maxSelections?: number | undefined;
        requiresConfirmation?: boolean | undefined;
        confirmationMessage?: string | undefined;
        minSelections?: number | undefined;
    }[] | undefined;
    showSelectedCount?: boolean | undefined;
}>;
export type BulkActionsConfig = z.infer<typeof BulkActionsConfigSchema>;
export declare const FilterOperators: readonly ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "greater_than", "less_than", "greater_equal", "less_equal", "between", "in", "not_in", "is_empty", "is_not_empty"];
export type FilterOperator = (typeof FilterOperators)[number];
export declare const FilterConditionSchema: z.ZodObject<{
    /** Column id to filter */
    columnId: z.ZodString;
    /** Filter operator */
    operator: z.ZodEnum<["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "greater_than", "less_than", "greater_equal", "less_equal", "between", "in", "not_in", "is_empty", "is_not_empty"]>;
    /** Filter value (type depends on column dataType) */
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">, z.ZodArray<z.ZodNumber, "many">]>;
    /** Secondary value (for "between" operator) */
    valueTo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strict", z.ZodTypeAny, {
    value: string | number | boolean | string[] | number[];
    columnId: string;
    operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
    valueTo?: string | number | undefined;
}, {
    value: string | number | boolean | string[] | number[];
    columnId: string;
    operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
    valueTo?: string | number | undefined;
}>;
export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export declare const FilterConfigSchema: z.ZodObject<{
    /** Enable filtering */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Global search (filter across all filterable columns) */
    globalSearch: z.ZodDefault<z.ZodBoolean>;
    /** Global search placeholder */
    globalSearchPlaceholder: z.ZodDefault<z.ZodString>;
    /** Active filter conditions */
    conditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Column id to filter */
        columnId: z.ZodString;
        /** Filter operator */
        operator: z.ZodEnum<["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "greater_than", "less_than", "greater_equal", "less_equal", "between", "in", "not_in", "is_empty", "is_not_empty"]>;
        /** Filter value (type depends on column dataType) */
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">, z.ZodArray<z.ZodNumber, "many">]>;
        /** Secondary value (for "between" operator) */
        valueTo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    }, "strict", z.ZodTypeAny, {
        value: string | number | boolean | string[] | number[];
        columnId: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
        valueTo?: string | number | undefined;
    }, {
        value: string | number | boolean | string[] | number[];
        columnId: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
        valueTo?: string | number | undefined;
    }>, "many">>;
    /** Logical operator between conditions */
    logicalOperator: z.ZodDefault<z.ZodEnum<["and", "or"]>>;
    /** Show filter row in header */
    showFilterRow: z.ZodDefault<z.ZodBoolean>;
    /** Show filter panel/sidebar */
    showFilterPanel: z.ZodDefault<z.ZodBoolean>;
    /** Debounce delay for filter input (ms) */
    debounceMs: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    enabled: boolean;
    globalSearch: boolean;
    globalSearchPlaceholder: string;
    conditions: {
        value: string | number | boolean | string[] | number[];
        columnId: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
        valueTo?: string | number | undefined;
    }[];
    logicalOperator: "and" | "or";
    showFilterRow: boolean;
    showFilterPanel: boolean;
    debounceMs: number;
}, {
    enabled?: boolean | undefined;
    globalSearch?: boolean | undefined;
    globalSearchPlaceholder?: string | undefined;
    conditions?: {
        value: string | number | boolean | string[] | number[];
        columnId: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
        valueTo?: string | number | undefined;
    }[] | undefined;
    logicalOperator?: "and" | "or" | undefined;
    showFilterRow?: boolean | undefined;
    showFilterPanel?: boolean | undefined;
    debounceMs?: number | undefined;
}>;
export type FilterConfig = z.infer<typeof FilterConfigSchema>;
export declare const DataTablePropsSchema: z.ZodObject<{
    /** Column definitions */
    columns: z.ZodArray<z.ZodObject<{
        /** Unique column identifier (maps to data field) */
        id: z.ZodString;
        /** Display header label */
        header: z.ZodString;
        /** Data type for rendering and sorting */
        dataType: z.ZodDefault<z.ZodEnum<["string", "number", "date", "boolean", "currency", "percentage", "badge", "avatar", "actions", "custom"]>>;
        /** Text alignment */
        align: z.ZodDefault<z.ZodEnum<["left", "center", "right"]>>;
        /** Whether column is sortable */
        sortable: z.ZodDefault<z.ZodBoolean>;
        /** Whether column is filterable */
        filterable: z.ZodDefault<z.ZodBoolean>;
        /** Whether column is resizable */
        resizable: z.ZodDefault<z.ZodBoolean>;
        /** Whether column can be hidden by user */
        hideable: z.ZodDefault<z.ZodBoolean>;
        /** Whether column is pinned */
        pinned: z.ZodDefault<z.ZodEnum<["left", "right", "none"]>>;
        /** Whether column is initially visible */
        visible: z.ZodDefault<z.ZodBoolean>;
        /** Minimum column width in pixels */
        minWidth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        /** Maximum column width in pixels */
        maxWidth: z.ZodOptional<z.ZodNumber>;
        /** Fixed column width in pixels */
        width: z.ZodOptional<z.ZodNumber>;
        /** Custom render type identifier (for custom cell renderers) */
        renderType: z.ZodOptional<z.ZodString>;
        /** Tooltip text for the column header */
        headerTooltip: z.ZodOptional<z.ZodString>;
        /** Format string (e.g. date format, number format) */
        format: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        align: "center" | "left" | "right";
        id: string;
        header: string;
        visible: boolean;
        dataType: "string" | "number" | "boolean" | "avatar" | "actions" | "custom" | "date" | "currency" | "percentage" | "badge";
        sortable: boolean;
        filterable: boolean;
        resizable: boolean;
        hideable: boolean;
        pinned: "none" | "left" | "right";
        minWidth: number;
        width?: number | undefined;
        maxWidth?: number | undefined;
        renderType?: string | undefined;
        headerTooltip?: string | undefined;
        format?: string | undefined;
    }, {
        id: string;
        header: string;
        align?: "center" | "left" | "right" | undefined;
        width?: number | undefined;
        maxWidth?: number | undefined;
        visible?: boolean | undefined;
        dataType?: "string" | "number" | "boolean" | "avatar" | "actions" | "custom" | "date" | "currency" | "percentage" | "badge" | undefined;
        sortable?: boolean | undefined;
        filterable?: boolean | undefined;
        resizable?: boolean | undefined;
        hideable?: boolean | undefined;
        pinned?: "none" | "left" | "right" | undefined;
        minWidth?: number | undefined;
        renderType?: string | undefined;
        headerTooltip?: string | undefined;
        format?: string | undefined;
    }>, "many">;
    /** Sort configuration */
    sort: z.ZodOptional<z.ZodObject<{
        /** Enable multi-column sorting */
        multiSort: z.ZodDefault<z.ZodBoolean>;
        /** Maximum number of sort columns (when multiSort is true) */
        maxSortColumns: z.ZodDefault<z.ZodNumber>;
        /** Default sort configuration */
        defaultSort: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Column id to sort by */
            columnId: z.ZodString;
            /** Sort direction */
            direction: z.ZodEnum<["asc", "desc"]>;
        }, "strict", z.ZodTypeAny, {
            direction: "asc" | "desc";
            columnId: string;
        }, {
            direction: "asc" | "desc";
            columnId: string;
        }>, "many">>;
        /** Active sort configuration */
        activeSort: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Column id to sort by */
            columnId: z.ZodString;
            /** Sort direction */
            direction: z.ZodEnum<["asc", "desc"]>;
        }, "strict", z.ZodTypeAny, {
            direction: "asc" | "desc";
            columnId: string;
        }, {
            direction: "asc" | "desc";
            columnId: string;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        multiSort: boolean;
        maxSortColumns: number;
        defaultSort: {
            direction: "asc" | "desc";
            columnId: string;
        }[];
        activeSort: {
            direction: "asc" | "desc";
            columnId: string;
        }[];
    }, {
        multiSort?: boolean | undefined;
        maxSortColumns?: number | undefined;
        defaultSort?: {
            direction: "asc" | "desc";
            columnId: string;
        }[] | undefined;
        activeSort?: {
            direction: "asc" | "desc";
            columnId: string;
        }[] | undefined;
    }>>;
    /** Pagination configuration */
    pagination: z.ZodOptional<z.ZodObject<{
        /** Enable pagination */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Current page (1-based) */
        currentPage: z.ZodDefault<z.ZodNumber>;
        /** Rows per page */
        pageSize: z.ZodDefault<z.ZodNumber>;
        /** Available page size options */
        pageSizeOptions: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        /** Total number of rows (for server-side pagination) */
        totalRows: z.ZodOptional<z.ZodNumber>;
        /** Show page size selector */
        showPageSizeSelector: z.ZodDefault<z.ZodBoolean>;
        /** Show row count summary */
        showRowCount: z.ZodDefault<z.ZodBoolean>;
        /** Show first/last page buttons */
        showFirstLast: z.ZodDefault<z.ZodBoolean>;
        /** Pagination position */
        position: z.ZodDefault<z.ZodEnum<["top", "bottom", "both"]>>;
    }, "strict", z.ZodTypeAny, {
        position: "top" | "bottom" | "both";
        enabled: boolean;
        currentPage: number;
        pageSize: number;
        pageSizeOptions: number[];
        showPageSizeSelector: boolean;
        showRowCount: boolean;
        showFirstLast: boolean;
        totalRows?: number | undefined;
    }, {
        position?: "top" | "bottom" | "both" | undefined;
        enabled?: boolean | undefined;
        currentPage?: number | undefined;
        pageSize?: number | undefined;
        pageSizeOptions?: number[] | undefined;
        totalRows?: number | undefined;
        showPageSizeSelector?: boolean | undefined;
        showRowCount?: boolean | undefined;
        showFirstLast?: boolean | undefined;
    }>>;
    /** Row selection configuration */
    selection: z.ZodOptional<z.ZodObject<{
        /** Enable row selection */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Selection mode */
        mode: z.ZodDefault<z.ZodEnum<["single", "multiple"]>>;
        /** Show checkbox column */
        showCheckbox: z.ZodDefault<z.ZodBoolean>;
        /** Show select-all checkbox */
        showSelectAll: z.ZodDefault<z.ZodBoolean>;
        /** Currently selected row keys */
        selectedKeys: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Preserve selections across pages */
        preserveAcrossPages: z.ZodDefault<z.ZodBoolean>;
        /** Maximum selectable rows (0 = unlimited) */
        maxSelections: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        enabled: boolean;
        maxSelections: number;
        mode: "multiple" | "single";
        showCheckbox: boolean;
        showSelectAll: boolean;
        selectedKeys: string[];
        preserveAcrossPages: boolean;
    }, {
        enabled?: boolean | undefined;
        maxSelections?: number | undefined;
        mode?: "multiple" | "single" | undefined;
        showCheckbox?: boolean | undefined;
        showSelectAll?: boolean | undefined;
        selectedKeys?: string[] | undefined;
        preserveAcrossPages?: boolean | undefined;
    }>>;
    /** Bulk actions configuration */
    bulkActions: z.ZodOptional<z.ZodObject<{
        /** Available bulk actions */
        actions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Action identifier */
            id: z.ZodString;
            /** Display label */
            label: z.ZodString;
            /** Icon identifier */
            icon: z.ZodOptional<z.ZodString>;
            /** Variant for styling */
            variant: z.ZodDefault<z.ZodEnum<["default", "danger"]>>;
            /** Whether this action requires confirmation */
            requiresConfirmation: z.ZodDefault<z.ZodBoolean>;
            /** Confirmation message */
            confirmationMessage: z.ZodOptional<z.ZodString>;
            /** Minimum number of selected rows to enable */
            minSelections: z.ZodDefault<z.ZodNumber>;
            /** Maximum number of selected rows to enable (0 = unlimited) */
            maxSelections: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            variant: "danger" | "default";
            id: string;
            label: string;
            maxSelections: number;
            requiresConfirmation: boolean;
            minSelections: number;
            icon?: string | undefined;
            confirmationMessage?: string | undefined;
        }, {
            id: string;
            label: string;
            variant?: "danger" | "default" | undefined;
            icon?: string | undefined;
            maxSelections?: number | undefined;
            requiresConfirmation?: boolean | undefined;
            confirmationMessage?: string | undefined;
            minSelections?: number | undefined;
        }>, "many">>;
        /** Position of bulk action bar */
        position: z.ZodDefault<z.ZodEnum<["top", "bottom", "floating"]>>;
        /** Show selected count */
        showSelectedCount: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        position: "top" | "bottom" | "floating";
        actions: {
            variant: "danger" | "default";
            id: string;
            label: string;
            maxSelections: number;
            requiresConfirmation: boolean;
            minSelections: number;
            icon?: string | undefined;
            confirmationMessage?: string | undefined;
        }[];
        showSelectedCount: boolean;
    }, {
        position?: "top" | "bottom" | "floating" | undefined;
        actions?: {
            id: string;
            label: string;
            variant?: "danger" | "default" | undefined;
            icon?: string | undefined;
            maxSelections?: number | undefined;
            requiresConfirmation?: boolean | undefined;
            confirmationMessage?: string | undefined;
            minSelections?: number | undefined;
        }[] | undefined;
        showSelectedCount?: boolean | undefined;
    }>>;
    /** Filter configuration */
    filter: z.ZodOptional<z.ZodObject<{
        /** Enable filtering */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Global search (filter across all filterable columns) */
        globalSearch: z.ZodDefault<z.ZodBoolean>;
        /** Global search placeholder */
        globalSearchPlaceholder: z.ZodDefault<z.ZodString>;
        /** Active filter conditions */
        conditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Column id to filter */
            columnId: z.ZodString;
            /** Filter operator */
            operator: z.ZodEnum<["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "greater_than", "less_than", "greater_equal", "less_equal", "between", "in", "not_in", "is_empty", "is_not_empty"]>;
            /** Filter value (type depends on column dataType) */
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">, z.ZodArray<z.ZodNumber, "many">]>;
            /** Secondary value (for "between" operator) */
            valueTo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        }, "strict", z.ZodTypeAny, {
            value: string | number | boolean | string[] | number[];
            columnId: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
            valueTo?: string | number | undefined;
        }, {
            value: string | number | boolean | string[] | number[];
            columnId: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
            valueTo?: string | number | undefined;
        }>, "many">>;
        /** Logical operator between conditions */
        logicalOperator: z.ZodDefault<z.ZodEnum<["and", "or"]>>;
        /** Show filter row in header */
        showFilterRow: z.ZodDefault<z.ZodBoolean>;
        /** Show filter panel/sidebar */
        showFilterPanel: z.ZodDefault<z.ZodBoolean>;
        /** Debounce delay for filter input (ms) */
        debounceMs: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        enabled: boolean;
        globalSearch: boolean;
        globalSearchPlaceholder: string;
        conditions: {
            value: string | number | boolean | string[] | number[];
            columnId: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
            valueTo?: string | number | undefined;
        }[];
        logicalOperator: "and" | "or";
        showFilterRow: boolean;
        showFilterPanel: boolean;
        debounceMs: number;
    }, {
        enabled?: boolean | undefined;
        globalSearch?: boolean | undefined;
        globalSearchPlaceholder?: string | undefined;
        conditions?: {
            value: string | number | boolean | string[] | number[];
            columnId: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
            valueTo?: string | number | undefined;
        }[] | undefined;
        logicalOperator?: "and" | "or" | undefined;
        showFilterRow?: boolean | undefined;
        showFilterPanel?: boolean | undefined;
        debounceMs?: number | undefined;
    }>>;
    /** Row key field (unique identifier field in data) */
    rowKeyField: z.ZodDefault<z.ZodString>;
    /** Enable row hover highlight */
    hoverable: z.ZodDefault<z.ZodBoolean>;
    /** Enable striped rows */
    striped: z.ZodDefault<z.ZodBoolean>;
    /** Enable row borders */
    bordered: z.ZodDefault<z.ZodBoolean>;
    /** Compact row density */
    density: z.ZodDefault<z.ZodEnum<["compact", "normal", "comfortable"]>>;
    /** Show loading state */
    loading: z.ZodDefault<z.ZodBoolean>;
    /** Empty state message */
    emptyMessage: z.ZodDefault<z.ZodString>;
    /** Sticky header */
    stickyHeader: z.ZodDefault<z.ZodBoolean>;
    /** Max table height (for scrolling) */
    maxHeight: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Enable column reordering via drag */
    reorderableColumns: z.ZodDefault<z.ZodBoolean>;
    /** Enable virtual scrolling for large datasets */
    virtualScroll: z.ZodDefault<z.ZodBoolean>;
    /** Row height for virtual scrolling */
    virtualRowHeight: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    loading: boolean;
    hoverable: boolean;
    columns: {
        align: "center" | "left" | "right";
        id: string;
        header: string;
        visible: boolean;
        dataType: "string" | "number" | "boolean" | "avatar" | "actions" | "custom" | "date" | "currency" | "percentage" | "badge";
        sortable: boolean;
        filterable: boolean;
        resizable: boolean;
        hideable: boolean;
        pinned: "none" | "left" | "right";
        minWidth: number;
        width?: number | undefined;
        maxWidth?: number | undefined;
        renderType?: string | undefined;
        headerTooltip?: string | undefined;
        format?: string | undefined;
    }[];
    emptyMessage: string;
    rowKeyField: string;
    striped: boolean;
    bordered: boolean;
    density: "compact" | "normal" | "comfortable";
    stickyHeader: boolean;
    reorderableColumns: boolean;
    virtualScroll: boolean;
    virtualRowHeight: number;
    sort?: {
        multiSort: boolean;
        maxSortColumns: number;
        defaultSort: {
            direction: "asc" | "desc";
            columnId: string;
        }[];
        activeSort: {
            direction: "asc" | "desc";
            columnId: string;
        }[];
    } | undefined;
    filter?: {
        enabled: boolean;
        globalSearch: boolean;
        globalSearchPlaceholder: string;
        conditions: {
            value: string | number | boolean | string[] | number[];
            columnId: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
            valueTo?: string | number | undefined;
        }[];
        logicalOperator: "and" | "or";
        showFilterRow: boolean;
        showFilterPanel: boolean;
        debounceMs: number;
    } | undefined;
    maxHeight?: string | number | undefined;
    pagination?: {
        position: "top" | "bottom" | "both";
        enabled: boolean;
        currentPage: number;
        pageSize: number;
        pageSizeOptions: number[];
        showPageSizeSelector: boolean;
        showRowCount: boolean;
        showFirstLast: boolean;
        totalRows?: number | undefined;
    } | undefined;
    selection?: {
        enabled: boolean;
        maxSelections: number;
        mode: "multiple" | "single";
        showCheckbox: boolean;
        showSelectAll: boolean;
        selectedKeys: string[];
        preserveAcrossPages: boolean;
    } | undefined;
    bulkActions?: {
        position: "top" | "bottom" | "floating";
        actions: {
            variant: "danger" | "default";
            id: string;
            label: string;
            maxSelections: number;
            requiresConfirmation: boolean;
            minSelections: number;
            icon?: string | undefined;
            confirmationMessage?: string | undefined;
        }[];
        showSelectedCount: boolean;
    } | undefined;
}, {
    columns: {
        id: string;
        header: string;
        align?: "center" | "left" | "right" | undefined;
        width?: number | undefined;
        maxWidth?: number | undefined;
        visible?: boolean | undefined;
        dataType?: "string" | "number" | "boolean" | "avatar" | "actions" | "custom" | "date" | "currency" | "percentage" | "badge" | undefined;
        sortable?: boolean | undefined;
        filterable?: boolean | undefined;
        resizable?: boolean | undefined;
        hideable?: boolean | undefined;
        pinned?: "none" | "left" | "right" | undefined;
        minWidth?: number | undefined;
        renderType?: string | undefined;
        headerTooltip?: string | undefined;
        format?: string | undefined;
    }[];
    loading?: boolean | undefined;
    sort?: {
        multiSort?: boolean | undefined;
        maxSortColumns?: number | undefined;
        defaultSort?: {
            direction: "asc" | "desc";
            columnId: string;
        }[] | undefined;
        activeSort?: {
            direction: "asc" | "desc";
            columnId: string;
        }[] | undefined;
    } | undefined;
    filter?: {
        enabled?: boolean | undefined;
        globalSearch?: boolean | undefined;
        globalSearchPlaceholder?: string | undefined;
        conditions?: {
            value: string | number | boolean | string[] | number[];
            columnId: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "between" | "in" | "not_in" | "is_empty" | "is_not_empty";
            valueTo?: string | number | undefined;
        }[] | undefined;
        logicalOperator?: "and" | "or" | undefined;
        showFilterRow?: boolean | undefined;
        showFilterPanel?: boolean | undefined;
        debounceMs?: number | undefined;
    } | undefined;
    maxHeight?: string | number | undefined;
    hoverable?: boolean | undefined;
    emptyMessage?: string | undefined;
    pagination?: {
        position?: "top" | "bottom" | "both" | undefined;
        enabled?: boolean | undefined;
        currentPage?: number | undefined;
        pageSize?: number | undefined;
        pageSizeOptions?: number[] | undefined;
        totalRows?: number | undefined;
        showPageSizeSelector?: boolean | undefined;
        showRowCount?: boolean | undefined;
        showFirstLast?: boolean | undefined;
    } | undefined;
    selection?: {
        enabled?: boolean | undefined;
        maxSelections?: number | undefined;
        mode?: "multiple" | "single" | undefined;
        showCheckbox?: boolean | undefined;
        showSelectAll?: boolean | undefined;
        selectedKeys?: string[] | undefined;
        preserveAcrossPages?: boolean | undefined;
    } | undefined;
    bulkActions?: {
        position?: "top" | "bottom" | "floating" | undefined;
        actions?: {
            id: string;
            label: string;
            variant?: "danger" | "default" | undefined;
            icon?: string | undefined;
            maxSelections?: number | undefined;
            requiresConfirmation?: boolean | undefined;
            confirmationMessage?: string | undefined;
            minSelections?: number | undefined;
        }[] | undefined;
        showSelectedCount?: boolean | undefined;
    } | undefined;
    rowKeyField?: string | undefined;
    striped?: boolean | undefined;
    bordered?: boolean | undefined;
    density?: "compact" | "normal" | "comfortable" | undefined;
    stickyHeader?: boolean | undefined;
    reorderableColumns?: boolean | undefined;
    virtualScroll?: boolean | undefined;
    virtualRowHeight?: number | undefined;
}>;
export type DataTableProps = z.infer<typeof DataTablePropsSchema>;
//# sourceMappingURL=tables.d.ts.map