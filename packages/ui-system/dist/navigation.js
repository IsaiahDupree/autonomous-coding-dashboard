"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigationConfigSchema = exports.MobileMenuConfigSchema = exports.TopBarConfigSchema = exports.TabConfigSchema = exports.TabItemSchema = exports.BreadcrumbConfigSchema = exports.BreadcrumbItemSchema = exports.SidebarConfigSchema = exports.SidebarItemSchema = void 0;
/**
 * UI-007: Navigation Specs
 *
 * Type definitions and Zod schemas for sidebar, breadcrumb, tab,
 * top-bar, and mobile menu navigation patterns.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Sidebar Config
// ---------------------------------------------------------------------------
exports.SidebarItemSchema = zod_1.z.lazy(() => zod_1.z.object({
    /** Unique item identifier */
    id: zod_1.z.string(),
    /** Display label */
    label: zod_1.z.string(),
    /** Icon identifier */
    icon: zod_1.z.string().optional(),
    /** Route / URL */
    href: zod_1.z.string().optional(),
    /** Whether the item is active */
    active: zod_1.z.boolean().optional().default(false),
    /** Whether the item is disabled */
    disabled: zod_1.z.boolean().optional().default(false),
    /** Badge text (e.g. count) */
    badge: zod_1.z.string().optional(),
    /** Badge variant */
    badgeVariant: zod_1.z.enum(["default", "success", "warning", "error", "info"]).optional(),
    /** Nested children (sub-menu) */
    children: zod_1.z.array(zod_1.z.lazy(() => exports.SidebarItemSchema)).optional(),
    /** Section divider before this item */
    dividerBefore: zod_1.z.boolean().optional().default(false),
}).strict());
exports.SidebarConfigSchema = zod_1.z.object({
    /** Navigation items */
    items: zod_1.z.array(exports.SidebarItemSchema),
    /** Sidebar width (px) */
    width: zod_1.z.number().default(260),
    /** Collapsed width (px) */
    collapsedWidth: zod_1.z.number().default(64),
    /** Whether sidebar is collapsible */
    collapsible: zod_1.z.boolean().default(true),
    /** Whether sidebar is initially collapsed */
    defaultCollapsed: zod_1.z.boolean().default(false),
    /** Show logo / header section */
    showHeader: zod_1.z.boolean().default(true),
    /** Show footer section */
    showFooter: zod_1.z.boolean().default(false),
    /** Position */
    position: zod_1.z.enum(["left", "right"]).default("left"),
    /** Background color */
    backgroundColor: zod_1.z.string().default("#FFFFFF"),
    /** Border style */
    borderStyle: zod_1.z.enum(["line", "shadow", "none"]).default("line"),
}).strict();
// ---------------------------------------------------------------------------
// Breadcrumb Config
// ---------------------------------------------------------------------------
exports.BreadcrumbItemSchema = zod_1.z.object({
    /** Display label */
    label: zod_1.z.string(),
    /** Route / URL (omit for current page) */
    href: zod_1.z.string().optional(),
    /** Icon identifier */
    icon: zod_1.z.string().optional(),
}).strict();
exports.BreadcrumbConfigSchema = zod_1.z.object({
    /** Breadcrumb items (ordered from root to current) */
    items: zod_1.z.array(exports.BreadcrumbItemSchema),
    /** Separator character or icon */
    separator: zod_1.z.string().default("/"),
    /** Maximum visible items (collapses middle items) */
    maxVisible: zod_1.z.number().int().positive().default(5),
    /** Show home icon for first item */
    showHomeIcon: zod_1.z.boolean().default(true),
}).strict();
// ---------------------------------------------------------------------------
// Tab Config
// ---------------------------------------------------------------------------
exports.TabItemSchema = zod_1.z.object({
    /** Unique tab identifier */
    id: zod_1.z.string(),
    /** Display label */
    label: zod_1.z.string(),
    /** Icon identifier */
    icon: zod_1.z.string().optional(),
    /** Disabled state */
    disabled: zod_1.z.boolean().optional().default(false),
    /** Badge / count */
    badge: zod_1.z.string().optional(),
    /** Closable */
    closable: zod_1.z.boolean().optional().default(false),
}).strict();
exports.TabConfigSchema = zod_1.z.object({
    /** Tab items */
    tabs: zod_1.z.array(exports.TabItemSchema),
    /** Currently active tab id */
    activeTabId: zod_1.z.string(),
    /** Tab style variant */
    variant: zod_1.z.enum(["underline", "pills", "enclosed", "segmented"]).default("underline"),
    /** Tab size */
    size: zod_1.z.enum(["sm", "md", "lg"]).default("md"),
    /** Orientation */
    orientation: zod_1.z.enum(["horizontal", "vertical"]).default("horizontal"),
    /** Full-width tabs */
    fullWidth: zod_1.z.boolean().default(false),
    /** Enable keyboard navigation */
    keyboardNavigation: zod_1.z.boolean().default(true),
    /** Enable lazy content loading */
    lazyLoad: zod_1.z.boolean().default(false),
}).strict();
// ---------------------------------------------------------------------------
// Top Bar Config
// ---------------------------------------------------------------------------
exports.TopBarConfigSchema = zod_1.z.object({
    /** Height (px) */
    height: zod_1.z.number().default(56),
    /** Show logo */
    showLogo: zod_1.z.boolean().default(true),
    /** Logo URL / identifier */
    logo: zod_1.z.string().optional(),
    /** Show global search */
    showSearch: zod_1.z.boolean().default(true),
    /** Search placeholder */
    searchPlaceholder: zod_1.z.string().default("Search..."),
    /** Show notification bell */
    showNotifications: zod_1.z.boolean().default(true),
    /** Unread notification count */
    notificationCount: zod_1.z.number().int().nonnegative().default(0),
    /** Show user avatar / menu */
    showUserMenu: zod_1.z.boolean().default(true),
    /** User display name */
    userName: zod_1.z.string().optional(),
    /** User avatar URL */
    userAvatar: zod_1.z.string().optional(),
    /** Background color */
    backgroundColor: zod_1.z.string().default("#FFFFFF"),
    /** Border bottom style */
    borderStyle: zod_1.z.enum(["line", "shadow", "none"]).default("line"),
    /** Position behavior */
    position: zod_1.z.enum(["static", "sticky", "fixed"]).default("sticky"),
    /** Z-index */
    zIndex: zod_1.z.number().default(1100),
}).strict();
// ---------------------------------------------------------------------------
// Mobile Menu Config
// ---------------------------------------------------------------------------
exports.MobileMenuConfigSchema = zod_1.z.object({
    /** Breakpoint (px) below which mobile menu appears */
    breakpoint: zod_1.z.number().default(768),
    /** Menu style */
    style: zod_1.z.enum(["drawer", "fullscreen", "bottom-sheet"]).default("drawer"),
    /** Drawer position (when style is "drawer") */
    drawerPosition: zod_1.z.enum(["left", "right"]).default("left"),
    /** Drawer width (when style is "drawer") */
    drawerWidth: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).default("80%"),
    /** Show overlay when menu is open */
    showOverlay: zod_1.z.boolean().default(true),
    /** Close on overlay click */
    closeOnOverlayClick: zod_1.z.boolean().default(true),
    /** Close on Escape key */
    closeOnEscape: zod_1.z.boolean().default(true),
    /** Close on navigation (route change) */
    closeOnNavigate: zod_1.z.boolean().default(true),
    /** Hamburger button position */
    hamburgerPosition: zod_1.z.enum(["left", "right"]).default("left"),
    /** Animation type */
    animation: zod_1.z.enum(["slide", "fade", "none"]).default("slide"),
    /** Animation duration (ms) */
    animationDuration: zod_1.z.number().default(200),
}).strict();
// ---------------------------------------------------------------------------
// Combined Navigation Config
// ---------------------------------------------------------------------------
exports.NavigationConfigSchema = zod_1.z.object({
    sidebar: exports.SidebarConfigSchema.optional(),
    breadcrumb: exports.BreadcrumbConfigSchema.optional(),
    tabs: exports.TabConfigSchema.optional(),
    topBar: exports.TopBarConfigSchema.optional(),
    mobileMenu: exports.MobileMenuConfigSchema.optional(),
}).strict();
//# sourceMappingURL=navigation.js.map