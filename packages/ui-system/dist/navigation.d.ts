/**
 * UI-007: Navigation Specs
 *
 * Type definitions and Zod schemas for sidebar, breadcrumb, tab,
 * top-bar, and mobile menu navigation patterns.
 */
import { z } from "zod";
export declare const SidebarItemSchema: z.ZodType<SidebarItem>;
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
export declare const SidebarConfigSchema: z.ZodObject<{
    /** Navigation items */
    items: z.ZodArray<z.ZodType<SidebarItem, z.ZodTypeDef, SidebarItem>, "many">;
    /** Sidebar width (px) */
    width: z.ZodDefault<z.ZodNumber>;
    /** Collapsed width (px) */
    collapsedWidth: z.ZodDefault<z.ZodNumber>;
    /** Whether sidebar is collapsible */
    collapsible: z.ZodDefault<z.ZodBoolean>;
    /** Whether sidebar is initially collapsed */
    defaultCollapsed: z.ZodDefault<z.ZodBoolean>;
    /** Show logo / header section */
    showHeader: z.ZodDefault<z.ZodBoolean>;
    /** Show footer section */
    showFooter: z.ZodDefault<z.ZodBoolean>;
    /** Position */
    position: z.ZodDefault<z.ZodEnum<["left", "right"]>>;
    /** Background color */
    backgroundColor: z.ZodDefault<z.ZodString>;
    /** Border style */
    borderStyle: z.ZodDefault<z.ZodEnum<["line", "shadow", "none"]>>;
}, "strict", z.ZodTypeAny, {
    position: "left" | "right";
    width: number;
    backgroundColor: string;
    items: SidebarItem[];
    collapsedWidth: number;
    collapsible: boolean;
    defaultCollapsed: boolean;
    showHeader: boolean;
    showFooter: boolean;
    borderStyle: "none" | "line" | "shadow";
}, {
    items: SidebarItem[];
    position?: "left" | "right" | undefined;
    width?: number | undefined;
    backgroundColor?: string | undefined;
    collapsedWidth?: number | undefined;
    collapsible?: boolean | undefined;
    defaultCollapsed?: boolean | undefined;
    showHeader?: boolean | undefined;
    showFooter?: boolean | undefined;
    borderStyle?: "none" | "line" | "shadow" | undefined;
}>;
export type SidebarConfig = z.infer<typeof SidebarConfigSchema>;
export declare const BreadcrumbItemSchema: z.ZodObject<{
    /** Display label */
    label: z.ZodString;
    /** Route / URL (omit for current page) */
    href: z.ZodOptional<z.ZodString>;
    /** Icon identifier */
    icon: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    label: string;
    icon?: string | undefined;
    href?: string | undefined;
}, {
    label: string;
    icon?: string | undefined;
    href?: string | undefined;
}>;
export type BreadcrumbItem = z.infer<typeof BreadcrumbItemSchema>;
export declare const BreadcrumbConfigSchema: z.ZodObject<{
    /** Breadcrumb items (ordered from root to current) */
    items: z.ZodArray<z.ZodObject<{
        /** Display label */
        label: z.ZodString;
        /** Route / URL (omit for current page) */
        href: z.ZodOptional<z.ZodString>;
        /** Icon identifier */
        icon: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        label: string;
        icon?: string | undefined;
        href?: string | undefined;
    }, {
        label: string;
        icon?: string | undefined;
        href?: string | undefined;
    }>, "many">;
    /** Separator character or icon */
    separator: z.ZodDefault<z.ZodString>;
    /** Maximum visible items (collapses middle items) */
    maxVisible: z.ZodDefault<z.ZodNumber>;
    /** Show home icon for first item */
    showHomeIcon: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    maxVisible: number;
    items: {
        label: string;
        icon?: string | undefined;
        href?: string | undefined;
    }[];
    separator: string;
    showHomeIcon: boolean;
}, {
    items: {
        label: string;
        icon?: string | undefined;
        href?: string | undefined;
    }[];
    maxVisible?: number | undefined;
    separator?: string | undefined;
    showHomeIcon?: boolean | undefined;
}>;
export type BreadcrumbConfig = z.infer<typeof BreadcrumbConfigSchema>;
export declare const TabItemSchema: z.ZodObject<{
    /** Unique tab identifier */
    id: z.ZodString;
    /** Display label */
    label: z.ZodString;
    /** Icon identifier */
    icon: z.ZodOptional<z.ZodString>;
    /** Disabled state */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Badge / count */
    badge: z.ZodOptional<z.ZodString>;
    /** Closable */
    closable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    id: string;
    label: string;
    closable: boolean;
    icon?: string | undefined;
    badge?: string | undefined;
}, {
    id: string;
    label: string;
    disabled?: boolean | undefined;
    icon?: string | undefined;
    badge?: string | undefined;
    closable?: boolean | undefined;
}>;
export type TabItem = z.infer<typeof TabItemSchema>;
export declare const TabConfigSchema: z.ZodObject<{
    /** Tab items */
    tabs: z.ZodArray<z.ZodObject<{
        /** Unique tab identifier */
        id: z.ZodString;
        /** Display label */
        label: z.ZodString;
        /** Icon identifier */
        icon: z.ZodOptional<z.ZodString>;
        /** Disabled state */
        disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        /** Badge / count */
        badge: z.ZodOptional<z.ZodString>;
        /** Closable */
        closable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strict", z.ZodTypeAny, {
        disabled: boolean;
        id: string;
        label: string;
        closable: boolean;
        icon?: string | undefined;
        badge?: string | undefined;
    }, {
        id: string;
        label: string;
        disabled?: boolean | undefined;
        icon?: string | undefined;
        badge?: string | undefined;
        closable?: boolean | undefined;
    }>, "many">;
    /** Currently active tab id */
    activeTabId: z.ZodString;
    /** Tab style variant */
    variant: z.ZodDefault<z.ZodEnum<["underline", "pills", "enclosed", "segmented"]>>;
    /** Tab size */
    size: z.ZodDefault<z.ZodEnum<["sm", "md", "lg"]>>;
    /** Orientation */
    orientation: z.ZodDefault<z.ZodEnum<["horizontal", "vertical"]>>;
    /** Full-width tabs */
    fullWidth: z.ZodDefault<z.ZodBoolean>;
    /** Enable keyboard navigation */
    keyboardNavigation: z.ZodDefault<z.ZodBoolean>;
    /** Enable lazy content loading */
    lazyLoad: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    variant: "underline" | "pills" | "enclosed" | "segmented";
    size: "sm" | "md" | "lg";
    fullWidth: boolean;
    tabs: {
        disabled: boolean;
        id: string;
        label: string;
        closable: boolean;
        icon?: string | undefined;
        badge?: string | undefined;
    }[];
    activeTabId: string;
    orientation: "horizontal" | "vertical";
    keyboardNavigation: boolean;
    lazyLoad: boolean;
}, {
    tabs: {
        id: string;
        label: string;
        disabled?: boolean | undefined;
        icon?: string | undefined;
        badge?: string | undefined;
        closable?: boolean | undefined;
    }[];
    activeTabId: string;
    variant?: "underline" | "pills" | "enclosed" | "segmented" | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    fullWidth?: boolean | undefined;
    orientation?: "horizontal" | "vertical" | undefined;
    keyboardNavigation?: boolean | undefined;
    lazyLoad?: boolean | undefined;
}>;
export type TabConfig = z.infer<typeof TabConfigSchema>;
export declare const TopBarConfigSchema: z.ZodObject<{
    /** Height (px) */
    height: z.ZodDefault<z.ZodNumber>;
    /** Show logo */
    showLogo: z.ZodDefault<z.ZodBoolean>;
    /** Logo URL / identifier */
    logo: z.ZodOptional<z.ZodString>;
    /** Show global search */
    showSearch: z.ZodDefault<z.ZodBoolean>;
    /** Search placeholder */
    searchPlaceholder: z.ZodDefault<z.ZodString>;
    /** Show notification bell */
    showNotifications: z.ZodDefault<z.ZodBoolean>;
    /** Unread notification count */
    notificationCount: z.ZodDefault<z.ZodNumber>;
    /** Show user avatar / menu */
    showUserMenu: z.ZodDefault<z.ZodBoolean>;
    /** User display name */
    userName: z.ZodOptional<z.ZodString>;
    /** User avatar URL */
    userAvatar: z.ZodOptional<z.ZodString>;
    /** Background color */
    backgroundColor: z.ZodDefault<z.ZodString>;
    /** Border bottom style */
    borderStyle: z.ZodDefault<z.ZodEnum<["line", "shadow", "none"]>>;
    /** Position behavior */
    position: z.ZodDefault<z.ZodEnum<["static", "sticky", "fixed"]>>;
    /** Z-index */
    zIndex: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    position: "static" | "sticky" | "fixed";
    height: number;
    backgroundColor: string;
    zIndex: number;
    borderStyle: "none" | "line" | "shadow";
    showLogo: boolean;
    showSearch: boolean;
    searchPlaceholder: string;
    showNotifications: boolean;
    notificationCount: number;
    showUserMenu: boolean;
    logo?: string | undefined;
    userName?: string | undefined;
    userAvatar?: string | undefined;
}, {
    position?: "static" | "sticky" | "fixed" | undefined;
    height?: number | undefined;
    backgroundColor?: string | undefined;
    zIndex?: number | undefined;
    borderStyle?: "none" | "line" | "shadow" | undefined;
    showLogo?: boolean | undefined;
    logo?: string | undefined;
    showSearch?: boolean | undefined;
    searchPlaceholder?: string | undefined;
    showNotifications?: boolean | undefined;
    notificationCount?: number | undefined;
    showUserMenu?: boolean | undefined;
    userName?: string | undefined;
    userAvatar?: string | undefined;
}>;
export type TopBarConfig = z.infer<typeof TopBarConfigSchema>;
export declare const MobileMenuConfigSchema: z.ZodObject<{
    /** Breakpoint (px) below which mobile menu appears */
    breakpoint: z.ZodDefault<z.ZodNumber>;
    /** Menu style */
    style: z.ZodDefault<z.ZodEnum<["drawer", "fullscreen", "bottom-sheet"]>>;
    /** Drawer position (when style is "drawer") */
    drawerPosition: z.ZodDefault<z.ZodEnum<["left", "right"]>>;
    /** Drawer width (when style is "drawer") */
    drawerWidth: z.ZodDefault<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Show overlay when menu is open */
    showOverlay: z.ZodDefault<z.ZodBoolean>;
    /** Close on overlay click */
    closeOnOverlayClick: z.ZodDefault<z.ZodBoolean>;
    /** Close on Escape key */
    closeOnEscape: z.ZodDefault<z.ZodBoolean>;
    /** Close on navigation (route change) */
    closeOnNavigate: z.ZodDefault<z.ZodBoolean>;
    /** Hamburger button position */
    hamburgerPosition: z.ZodDefault<z.ZodEnum<["left", "right"]>>;
    /** Animation type */
    animation: z.ZodDefault<z.ZodEnum<["slide", "fade", "none"]>>;
    /** Animation duration (ms) */
    animationDuration: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    animationDuration: number;
    closeOnOverlayClick: boolean;
    closeOnEscape: boolean;
    animation: "none" | "fade" | "slide";
    breakpoint: number;
    style: "fullscreen" | "drawer" | "bottom-sheet";
    drawerPosition: "left" | "right";
    drawerWidth: string | number;
    showOverlay: boolean;
    closeOnNavigate: boolean;
    hamburgerPosition: "left" | "right";
}, {
    animationDuration?: number | undefined;
    closeOnOverlayClick?: boolean | undefined;
    closeOnEscape?: boolean | undefined;
    animation?: "none" | "fade" | "slide" | undefined;
    breakpoint?: number | undefined;
    style?: "fullscreen" | "drawer" | "bottom-sheet" | undefined;
    drawerPosition?: "left" | "right" | undefined;
    drawerWidth?: string | number | undefined;
    showOverlay?: boolean | undefined;
    closeOnNavigate?: boolean | undefined;
    hamburgerPosition?: "left" | "right" | undefined;
}>;
export type MobileMenuConfig = z.infer<typeof MobileMenuConfigSchema>;
export declare const NavigationConfigSchema: z.ZodObject<{
    sidebar: z.ZodOptional<z.ZodObject<{
        /** Navigation items */
        items: z.ZodArray<z.ZodType<SidebarItem, z.ZodTypeDef, SidebarItem>, "many">;
        /** Sidebar width (px) */
        width: z.ZodDefault<z.ZodNumber>;
        /** Collapsed width (px) */
        collapsedWidth: z.ZodDefault<z.ZodNumber>;
        /** Whether sidebar is collapsible */
        collapsible: z.ZodDefault<z.ZodBoolean>;
        /** Whether sidebar is initially collapsed */
        defaultCollapsed: z.ZodDefault<z.ZodBoolean>;
        /** Show logo / header section */
        showHeader: z.ZodDefault<z.ZodBoolean>;
        /** Show footer section */
        showFooter: z.ZodDefault<z.ZodBoolean>;
        /** Position */
        position: z.ZodDefault<z.ZodEnum<["left", "right"]>>;
        /** Background color */
        backgroundColor: z.ZodDefault<z.ZodString>;
        /** Border style */
        borderStyle: z.ZodDefault<z.ZodEnum<["line", "shadow", "none"]>>;
    }, "strict", z.ZodTypeAny, {
        position: "left" | "right";
        width: number;
        backgroundColor: string;
        items: SidebarItem[];
        collapsedWidth: number;
        collapsible: boolean;
        defaultCollapsed: boolean;
        showHeader: boolean;
        showFooter: boolean;
        borderStyle: "none" | "line" | "shadow";
    }, {
        items: SidebarItem[];
        position?: "left" | "right" | undefined;
        width?: number | undefined;
        backgroundColor?: string | undefined;
        collapsedWidth?: number | undefined;
        collapsible?: boolean | undefined;
        defaultCollapsed?: boolean | undefined;
        showHeader?: boolean | undefined;
        showFooter?: boolean | undefined;
        borderStyle?: "none" | "line" | "shadow" | undefined;
    }>>;
    breadcrumb: z.ZodOptional<z.ZodObject<{
        /** Breadcrumb items (ordered from root to current) */
        items: z.ZodArray<z.ZodObject<{
            /** Display label */
            label: z.ZodString;
            /** Route / URL (omit for current page) */
            href: z.ZodOptional<z.ZodString>;
            /** Icon identifier */
            icon: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            label: string;
            icon?: string | undefined;
            href?: string | undefined;
        }, {
            label: string;
            icon?: string | undefined;
            href?: string | undefined;
        }>, "many">;
        /** Separator character or icon */
        separator: z.ZodDefault<z.ZodString>;
        /** Maximum visible items (collapses middle items) */
        maxVisible: z.ZodDefault<z.ZodNumber>;
        /** Show home icon for first item */
        showHomeIcon: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        maxVisible: number;
        items: {
            label: string;
            icon?: string | undefined;
            href?: string | undefined;
        }[];
        separator: string;
        showHomeIcon: boolean;
    }, {
        items: {
            label: string;
            icon?: string | undefined;
            href?: string | undefined;
        }[];
        maxVisible?: number | undefined;
        separator?: string | undefined;
        showHomeIcon?: boolean | undefined;
    }>>;
    tabs: z.ZodOptional<z.ZodObject<{
        /** Tab items */
        tabs: z.ZodArray<z.ZodObject<{
            /** Unique tab identifier */
            id: z.ZodString;
            /** Display label */
            label: z.ZodString;
            /** Icon identifier */
            icon: z.ZodOptional<z.ZodString>;
            /** Disabled state */
            disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            /** Badge / count */
            badge: z.ZodOptional<z.ZodString>;
            /** Closable */
            closable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        }, "strict", z.ZodTypeAny, {
            disabled: boolean;
            id: string;
            label: string;
            closable: boolean;
            icon?: string | undefined;
            badge?: string | undefined;
        }, {
            id: string;
            label: string;
            disabled?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
            closable?: boolean | undefined;
        }>, "many">;
        /** Currently active tab id */
        activeTabId: z.ZodString;
        /** Tab style variant */
        variant: z.ZodDefault<z.ZodEnum<["underline", "pills", "enclosed", "segmented"]>>;
        /** Tab size */
        size: z.ZodDefault<z.ZodEnum<["sm", "md", "lg"]>>;
        /** Orientation */
        orientation: z.ZodDefault<z.ZodEnum<["horizontal", "vertical"]>>;
        /** Full-width tabs */
        fullWidth: z.ZodDefault<z.ZodBoolean>;
        /** Enable keyboard navigation */
        keyboardNavigation: z.ZodDefault<z.ZodBoolean>;
        /** Enable lazy content loading */
        lazyLoad: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        variant: "underline" | "pills" | "enclosed" | "segmented";
        size: "sm" | "md" | "lg";
        fullWidth: boolean;
        tabs: {
            disabled: boolean;
            id: string;
            label: string;
            closable: boolean;
            icon?: string | undefined;
            badge?: string | undefined;
        }[];
        activeTabId: string;
        orientation: "horizontal" | "vertical";
        keyboardNavigation: boolean;
        lazyLoad: boolean;
    }, {
        tabs: {
            id: string;
            label: string;
            disabled?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
            closable?: boolean | undefined;
        }[];
        activeTabId: string;
        variant?: "underline" | "pills" | "enclosed" | "segmented" | undefined;
        size?: "sm" | "md" | "lg" | undefined;
        fullWidth?: boolean | undefined;
        orientation?: "horizontal" | "vertical" | undefined;
        keyboardNavigation?: boolean | undefined;
        lazyLoad?: boolean | undefined;
    }>>;
    topBar: z.ZodOptional<z.ZodObject<{
        /** Height (px) */
        height: z.ZodDefault<z.ZodNumber>;
        /** Show logo */
        showLogo: z.ZodDefault<z.ZodBoolean>;
        /** Logo URL / identifier */
        logo: z.ZodOptional<z.ZodString>;
        /** Show global search */
        showSearch: z.ZodDefault<z.ZodBoolean>;
        /** Search placeholder */
        searchPlaceholder: z.ZodDefault<z.ZodString>;
        /** Show notification bell */
        showNotifications: z.ZodDefault<z.ZodBoolean>;
        /** Unread notification count */
        notificationCount: z.ZodDefault<z.ZodNumber>;
        /** Show user avatar / menu */
        showUserMenu: z.ZodDefault<z.ZodBoolean>;
        /** User display name */
        userName: z.ZodOptional<z.ZodString>;
        /** User avatar URL */
        userAvatar: z.ZodOptional<z.ZodString>;
        /** Background color */
        backgroundColor: z.ZodDefault<z.ZodString>;
        /** Border bottom style */
        borderStyle: z.ZodDefault<z.ZodEnum<["line", "shadow", "none"]>>;
        /** Position behavior */
        position: z.ZodDefault<z.ZodEnum<["static", "sticky", "fixed"]>>;
        /** Z-index */
        zIndex: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        position: "static" | "sticky" | "fixed";
        height: number;
        backgroundColor: string;
        zIndex: number;
        borderStyle: "none" | "line" | "shadow";
        showLogo: boolean;
        showSearch: boolean;
        searchPlaceholder: string;
        showNotifications: boolean;
        notificationCount: number;
        showUserMenu: boolean;
        logo?: string | undefined;
        userName?: string | undefined;
        userAvatar?: string | undefined;
    }, {
        position?: "static" | "sticky" | "fixed" | undefined;
        height?: number | undefined;
        backgroundColor?: string | undefined;
        zIndex?: number | undefined;
        borderStyle?: "none" | "line" | "shadow" | undefined;
        showLogo?: boolean | undefined;
        logo?: string | undefined;
        showSearch?: boolean | undefined;
        searchPlaceholder?: string | undefined;
        showNotifications?: boolean | undefined;
        notificationCount?: number | undefined;
        showUserMenu?: boolean | undefined;
        userName?: string | undefined;
        userAvatar?: string | undefined;
    }>>;
    mobileMenu: z.ZodOptional<z.ZodObject<{
        /** Breakpoint (px) below which mobile menu appears */
        breakpoint: z.ZodDefault<z.ZodNumber>;
        /** Menu style */
        style: z.ZodDefault<z.ZodEnum<["drawer", "fullscreen", "bottom-sheet"]>>;
        /** Drawer position (when style is "drawer") */
        drawerPosition: z.ZodDefault<z.ZodEnum<["left", "right"]>>;
        /** Drawer width (when style is "drawer") */
        drawerWidth: z.ZodDefault<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        /** Show overlay when menu is open */
        showOverlay: z.ZodDefault<z.ZodBoolean>;
        /** Close on overlay click */
        closeOnOverlayClick: z.ZodDefault<z.ZodBoolean>;
        /** Close on Escape key */
        closeOnEscape: z.ZodDefault<z.ZodBoolean>;
        /** Close on navigation (route change) */
        closeOnNavigate: z.ZodDefault<z.ZodBoolean>;
        /** Hamburger button position */
        hamburgerPosition: z.ZodDefault<z.ZodEnum<["left", "right"]>>;
        /** Animation type */
        animation: z.ZodDefault<z.ZodEnum<["slide", "fade", "none"]>>;
        /** Animation duration (ms) */
        animationDuration: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        animationDuration: number;
        closeOnOverlayClick: boolean;
        closeOnEscape: boolean;
        animation: "none" | "fade" | "slide";
        breakpoint: number;
        style: "fullscreen" | "drawer" | "bottom-sheet";
        drawerPosition: "left" | "right";
        drawerWidth: string | number;
        showOverlay: boolean;
        closeOnNavigate: boolean;
        hamburgerPosition: "left" | "right";
    }, {
        animationDuration?: number | undefined;
        closeOnOverlayClick?: boolean | undefined;
        closeOnEscape?: boolean | undefined;
        animation?: "none" | "fade" | "slide" | undefined;
        breakpoint?: number | undefined;
        style?: "fullscreen" | "drawer" | "bottom-sheet" | undefined;
        drawerPosition?: "left" | "right" | undefined;
        drawerWidth?: string | number | undefined;
        showOverlay?: boolean | undefined;
        closeOnNavigate?: boolean | undefined;
        hamburgerPosition?: "left" | "right" | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    tabs?: {
        variant: "underline" | "pills" | "enclosed" | "segmented";
        size: "sm" | "md" | "lg";
        fullWidth: boolean;
        tabs: {
            disabled: boolean;
            id: string;
            label: string;
            closable: boolean;
            icon?: string | undefined;
            badge?: string | undefined;
        }[];
        activeTabId: string;
        orientation: "horizontal" | "vertical";
        keyboardNavigation: boolean;
        lazyLoad: boolean;
    } | undefined;
    sidebar?: {
        position: "left" | "right";
        width: number;
        backgroundColor: string;
        items: SidebarItem[];
        collapsedWidth: number;
        collapsible: boolean;
        defaultCollapsed: boolean;
        showHeader: boolean;
        showFooter: boolean;
        borderStyle: "none" | "line" | "shadow";
    } | undefined;
    breadcrumb?: {
        maxVisible: number;
        items: {
            label: string;
            icon?: string | undefined;
            href?: string | undefined;
        }[];
        separator: string;
        showHomeIcon: boolean;
    } | undefined;
    topBar?: {
        position: "static" | "sticky" | "fixed";
        height: number;
        backgroundColor: string;
        zIndex: number;
        borderStyle: "none" | "line" | "shadow";
        showLogo: boolean;
        showSearch: boolean;
        searchPlaceholder: string;
        showNotifications: boolean;
        notificationCount: number;
        showUserMenu: boolean;
        logo?: string | undefined;
        userName?: string | undefined;
        userAvatar?: string | undefined;
    } | undefined;
    mobileMenu?: {
        animationDuration: number;
        closeOnOverlayClick: boolean;
        closeOnEscape: boolean;
        animation: "none" | "fade" | "slide";
        breakpoint: number;
        style: "fullscreen" | "drawer" | "bottom-sheet";
        drawerPosition: "left" | "right";
        drawerWidth: string | number;
        showOverlay: boolean;
        closeOnNavigate: boolean;
        hamburgerPosition: "left" | "right";
    } | undefined;
}, {
    tabs?: {
        tabs: {
            id: string;
            label: string;
            disabled?: boolean | undefined;
            icon?: string | undefined;
            badge?: string | undefined;
            closable?: boolean | undefined;
        }[];
        activeTabId: string;
        variant?: "underline" | "pills" | "enclosed" | "segmented" | undefined;
        size?: "sm" | "md" | "lg" | undefined;
        fullWidth?: boolean | undefined;
        orientation?: "horizontal" | "vertical" | undefined;
        keyboardNavigation?: boolean | undefined;
        lazyLoad?: boolean | undefined;
    } | undefined;
    sidebar?: {
        items: SidebarItem[];
        position?: "left" | "right" | undefined;
        width?: number | undefined;
        backgroundColor?: string | undefined;
        collapsedWidth?: number | undefined;
        collapsible?: boolean | undefined;
        defaultCollapsed?: boolean | undefined;
        showHeader?: boolean | undefined;
        showFooter?: boolean | undefined;
        borderStyle?: "none" | "line" | "shadow" | undefined;
    } | undefined;
    breadcrumb?: {
        items: {
            label: string;
            icon?: string | undefined;
            href?: string | undefined;
        }[];
        maxVisible?: number | undefined;
        separator?: string | undefined;
        showHomeIcon?: boolean | undefined;
    } | undefined;
    topBar?: {
        position?: "static" | "sticky" | "fixed" | undefined;
        height?: number | undefined;
        backgroundColor?: string | undefined;
        zIndex?: number | undefined;
        borderStyle?: "none" | "line" | "shadow" | undefined;
        showLogo?: boolean | undefined;
        logo?: string | undefined;
        showSearch?: boolean | undefined;
        searchPlaceholder?: string | undefined;
        showNotifications?: boolean | undefined;
        notificationCount?: number | undefined;
        showUserMenu?: boolean | undefined;
        userName?: string | undefined;
        userAvatar?: string | undefined;
    } | undefined;
    mobileMenu?: {
        animationDuration?: number | undefined;
        closeOnOverlayClick?: boolean | undefined;
        closeOnEscape?: boolean | undefined;
        animation?: "none" | "fade" | "slide" | undefined;
        breakpoint?: number | undefined;
        style?: "fullscreen" | "drawer" | "bottom-sheet" | undefined;
        drawerPosition?: "left" | "right" | undefined;
        drawerWidth?: string | number | undefined;
        showOverlay?: boolean | undefined;
        closeOnNavigate?: boolean | undefined;
        hamburgerPosition?: "left" | "right" | undefined;
    } | undefined;
}>;
export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;
//# sourceMappingURL=navigation.d.ts.map