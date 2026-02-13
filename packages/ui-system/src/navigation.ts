/**
 * UI-007: Navigation Specs
 *
 * Type definitions and Zod schemas for sidebar, breadcrumb, tab,
 * top-bar, and mobile menu navigation patterns.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Sidebar Config
// ---------------------------------------------------------------------------

export const SidebarItemSchema: z.ZodType<SidebarItem> = z.lazy(() =>
  z.object({
    /** Unique item identifier */
    id: z.string(),
    /** Display label */
    label: z.string(),
    /** Icon identifier */
    icon: z.string().optional(),
    /** Route / URL */
    href: z.string().optional(),
    /** Whether the item is active */
    active: z.boolean().optional().default(false),
    /** Whether the item is disabled */
    disabled: z.boolean().optional().default(false),
    /** Badge text (e.g. count) */
    badge: z.string().optional(),
    /** Badge variant */
    badgeVariant: z.enum(["default", "success", "warning", "error", "info"]).optional(),
    /** Nested children (sub-menu) */
    children: z.array(z.lazy(() => SidebarItemSchema)).optional(),
    /** Section divider before this item */
    dividerBefore: z.boolean().optional().default(false),
  }).strict()
);

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "error" | "info";
  children?: SidebarItem[];
  dividerBefore?: boolean;
}

export const SidebarConfigSchema = z.object({
  /** Navigation items */
  items: z.array(SidebarItemSchema),
  /** Sidebar width (px) */
  width: z.number().default(260),
  /** Collapsed width (px) */
  collapsedWidth: z.number().default(64),
  /** Whether sidebar is collapsible */
  collapsible: z.boolean().default(true),
  /** Whether sidebar is initially collapsed */
  defaultCollapsed: z.boolean().default(false),
  /** Show logo / header section */
  showHeader: z.boolean().default(true),
  /** Show footer section */
  showFooter: z.boolean().default(false),
  /** Position */
  position: z.enum(["left", "right"]).default("left"),
  /** Background color */
  backgroundColor: z.string().default("#FFFFFF"),
  /** Border style */
  borderStyle: z.enum(["line", "shadow", "none"]).default("line"),
}).strict();

export type SidebarConfig = z.infer<typeof SidebarConfigSchema>;

// ---------------------------------------------------------------------------
// Breadcrumb Config
// ---------------------------------------------------------------------------

export const BreadcrumbItemSchema = z.object({
  /** Display label */
  label: z.string(),
  /** Route / URL (omit for current page) */
  href: z.string().optional(),
  /** Icon identifier */
  icon: z.string().optional(),
}).strict();

export type BreadcrumbItem = z.infer<typeof BreadcrumbItemSchema>;

export const BreadcrumbConfigSchema = z.object({
  /** Breadcrumb items (ordered from root to current) */
  items: z.array(BreadcrumbItemSchema),
  /** Separator character or icon */
  separator: z.string().default("/"),
  /** Maximum visible items (collapses middle items) */
  maxVisible: z.number().int().positive().default(5),
  /** Show home icon for first item */
  showHomeIcon: z.boolean().default(true),
}).strict();

export type BreadcrumbConfig = z.infer<typeof BreadcrumbConfigSchema>;

// ---------------------------------------------------------------------------
// Tab Config
// ---------------------------------------------------------------------------

export const TabItemSchema = z.object({
  /** Unique tab identifier */
  id: z.string(),
  /** Display label */
  label: z.string(),
  /** Icon identifier */
  icon: z.string().optional(),
  /** Disabled state */
  disabled: z.boolean().optional().default(false),
  /** Badge / count */
  badge: z.string().optional(),
  /** Closable */
  closable: z.boolean().optional().default(false),
}).strict();

export type TabItem = z.infer<typeof TabItemSchema>;

export const TabConfigSchema = z.object({
  /** Tab items */
  tabs: z.array(TabItemSchema),
  /** Currently active tab id */
  activeTabId: z.string(),
  /** Tab style variant */
  variant: z.enum(["underline", "pills", "enclosed", "segmented"]).default("underline"),
  /** Tab size */
  size: z.enum(["sm", "md", "lg"]).default("md"),
  /** Orientation */
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
  /** Full-width tabs */
  fullWidth: z.boolean().default(false),
  /** Enable keyboard navigation */
  keyboardNavigation: z.boolean().default(true),
  /** Enable lazy content loading */
  lazyLoad: z.boolean().default(false),
}).strict();

export type TabConfig = z.infer<typeof TabConfigSchema>;

// ---------------------------------------------------------------------------
// Top Bar Config
// ---------------------------------------------------------------------------

export const TopBarConfigSchema = z.object({
  /** Height (px) */
  height: z.number().default(56),
  /** Show logo */
  showLogo: z.boolean().default(true),
  /** Logo URL / identifier */
  logo: z.string().optional(),
  /** Show global search */
  showSearch: z.boolean().default(true),
  /** Search placeholder */
  searchPlaceholder: z.string().default("Search..."),
  /** Show notification bell */
  showNotifications: z.boolean().default(true),
  /** Unread notification count */
  notificationCount: z.number().int().nonnegative().default(0),
  /** Show user avatar / menu */
  showUserMenu: z.boolean().default(true),
  /** User display name */
  userName: z.string().optional(),
  /** User avatar URL */
  userAvatar: z.string().optional(),
  /** Background color */
  backgroundColor: z.string().default("#FFFFFF"),
  /** Border bottom style */
  borderStyle: z.enum(["line", "shadow", "none"]).default("line"),
  /** Position behavior */
  position: z.enum(["static", "sticky", "fixed"]).default("sticky"),
  /** Z-index */
  zIndex: z.number().default(1100),
}).strict();

export type TopBarConfig = z.infer<typeof TopBarConfigSchema>;

// ---------------------------------------------------------------------------
// Mobile Menu Config
// ---------------------------------------------------------------------------

export const MobileMenuConfigSchema = z.object({
  /** Breakpoint (px) below which mobile menu appears */
  breakpoint: z.number().default(768),
  /** Menu style */
  style: z.enum(["drawer", "fullscreen", "bottom-sheet"]).default("drawer"),
  /** Drawer position (when style is "drawer") */
  drawerPosition: z.enum(["left", "right"]).default("left"),
  /** Drawer width (when style is "drawer") */
  drawerWidth: z.union([z.number(), z.string()]).default("80%"),
  /** Show overlay when menu is open */
  showOverlay: z.boolean().default(true),
  /** Close on overlay click */
  closeOnOverlayClick: z.boolean().default(true),
  /** Close on Escape key */
  closeOnEscape: z.boolean().default(true),
  /** Close on navigation (route change) */
  closeOnNavigate: z.boolean().default(true),
  /** Hamburger button position */
  hamburgerPosition: z.enum(["left", "right"]).default("left"),
  /** Animation type */
  animation: z.enum(["slide", "fade", "none"]).default("slide"),
  /** Animation duration (ms) */
  animationDuration: z.number().default(200),
}).strict();

export type MobileMenuConfig = z.infer<typeof MobileMenuConfigSchema>;

// ---------------------------------------------------------------------------
// Combined Navigation Config
// ---------------------------------------------------------------------------

export const NavigationConfigSchema = z.object({
  sidebar: SidebarConfigSchema.optional(),
  breadcrumb: BreadcrumbConfigSchema.optional(),
  tabs: TabConfigSchema.optional(),
  topBar: TopBarConfigSchema.optional(),
  mobileMenu: MobileMenuConfigSchema.optional(),
}).strict();

export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;
