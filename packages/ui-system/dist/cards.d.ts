/**
 * UI-009: Card Component Specs
 *
 * Type definitions and Zod schemas for card components, including
 * variants, sections (header/body/footer), media slots, and action areas.
 */
import { z } from "zod";
export declare const CardVariants: readonly ["default", "elevated", "outlined"];
export type CardVariant = (typeof CardVariants)[number];
export declare const CardVariantSchema: z.ZodEnum<["default", "elevated", "outlined"]>;
export interface CardVariantStyle {
    background: string;
    border: string;
    boxShadow: string;
    hoverBoxShadow: string;
}
export declare const CardVariantStyles: Record<CardVariant, CardVariantStyle>;
export declare const CardHeaderSchema: z.ZodObject<{
    /** Title text */
    title: z.ZodString;
    /** Subtitle text */
    subtitle: z.ZodOptional<z.ZodString>;
    /** Avatar / icon identifier */
    avatar: z.ZodOptional<z.ZodString>;
    /** Action area (e.g. dropdown menu trigger) */
    action: z.ZodOptional<z.ZodString>;
    /** Show divider below header */
    showDivider: z.ZodDefault<z.ZodBoolean>;
    /** Padding */
    padding: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    title: string;
    showDivider: boolean;
    padding: number;
    subtitle?: string | undefined;
    avatar?: string | undefined;
    action?: string | undefined;
}, {
    title: string;
    subtitle?: string | undefined;
    avatar?: string | undefined;
    action?: string | undefined;
    showDivider?: boolean | undefined;
    padding?: number | undefined;
}>;
export type CardHeader = z.infer<typeof CardHeaderSchema>;
export declare const CardBodySchema: z.ZodObject<{
    /** Padding */
    padding: z.ZodDefault<z.ZodNumber>;
    /** Allow body to scroll */
    scrollable: z.ZodDefault<z.ZodBoolean>;
    /** Max height when scrollable */
    maxHeight: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
}, "strict", z.ZodTypeAny, {
    padding: number;
    scrollable: boolean;
    maxHeight?: string | number | undefined;
}, {
    padding?: number | undefined;
    scrollable?: boolean | undefined;
    maxHeight?: string | number | undefined;
}>;
export type CardBody = z.infer<typeof CardBodySchema>;
export declare const CardFooterSchema: z.ZodObject<{
    /** Alignment of footer content */
    alignment: z.ZodDefault<z.ZodEnum<["left", "center", "right", "space-between"]>>;
    /** Show divider above footer */
    showDivider: z.ZodDefault<z.ZodBoolean>;
    /** Padding */
    padding: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    showDivider: boolean;
    padding: number;
    alignment: "center" | "left" | "right" | "space-between";
}, {
    showDivider?: boolean | undefined;
    padding?: number | undefined;
    alignment?: "center" | "left" | "right" | "space-between" | undefined;
}>;
export type CardFooter = z.infer<typeof CardFooterSchema>;
export declare const CardMediaPositions: readonly ["top", "bottom", "left", "right", "background"];
export type CardMediaPosition = (typeof CardMediaPositions)[number];
export declare const CardMediaSchema: z.ZodObject<{
    /** Media source URL */
    src: z.ZodString;
    /** Alt text */
    alt: z.ZodDefault<z.ZodString>;
    /** Media position relative to card body */
    position: z.ZodDefault<z.ZodEnum<["top", "bottom", "left", "right", "background"]>>;
    /** Media height (px) */
    height: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    /** Object fit */
    objectFit: z.ZodDefault<z.ZodEnum<["cover", "contain", "fill", "none"]>>;
    /** Show overlay on media */
    overlay: z.ZodDefault<z.ZodBoolean>;
    /** Overlay color */
    overlayColor: z.ZodDefault<z.ZodString>;
    /** Aspect ratio (e.g. "16/9") */
    aspectRatio: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    src: string;
    alt: string;
    position: "left" | "right" | "top" | "bottom" | "background";
    height: string | number;
    objectFit: "none" | "fill" | "cover" | "contain";
    overlay: boolean;
    overlayColor: string;
    aspectRatio?: string | undefined;
}, {
    src: string;
    alt?: string | undefined;
    position?: "left" | "right" | "top" | "bottom" | "background" | undefined;
    height?: string | number | undefined;
    objectFit?: "none" | "fill" | "cover" | "contain" | undefined;
    overlay?: boolean | undefined;
    overlayColor?: string | undefined;
    aspectRatio?: string | undefined;
}>;
export type CardMedia = z.infer<typeof CardMediaSchema>;
export declare const CardActionSchema: z.ZodObject<{
    /** Action identifier */
    id: z.ZodString;
    /** Display label */
    label: z.ZodString;
    /** Icon identifier */
    icon: z.ZodOptional<z.ZodString>;
    /** Variant */
    variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
    /** Size */
    size: z.ZodDefault<z.ZodEnum<["sm", "md"]>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    variant: "primary" | "secondary" | "ghost" | "danger";
    size: "sm" | "md";
    id: string;
    label: string;
    icon?: string | undefined;
}, {
    id: string;
    label: string;
    disabled?: boolean | undefined;
    variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
    size?: "sm" | "md" | undefined;
    icon?: string | undefined;
}>;
export type CardAction = z.infer<typeof CardActionSchema>;
export declare const CardActionAreaSchema: z.ZodObject<{
    /** Actions */
    actions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Action identifier */
        id: z.ZodString;
        /** Display label */
        label: z.ZodString;
        /** Icon identifier */
        icon: z.ZodOptional<z.ZodString>;
        /** Variant */
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
        /** Size */
        size: z.ZodDefault<z.ZodEnum<["sm", "md"]>>;
        /** Disabled */
        disabled: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        disabled: boolean;
        variant: "primary" | "secondary" | "ghost" | "danger";
        size: "sm" | "md";
        id: string;
        label: string;
        icon?: string | undefined;
    }, {
        id: string;
        label: string;
        disabled?: boolean | undefined;
        variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
        size?: "sm" | "md" | undefined;
        icon?: string | undefined;
    }>, "many">>;
    /** Layout */
    layout: z.ZodDefault<z.ZodEnum<["horizontal", "vertical"]>>;
    /** Alignment */
    alignment: z.ZodDefault<z.ZodEnum<["left", "center", "right", "space-between"]>>;
    /** Padding */
    padding: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    padding: number;
    alignment: "center" | "left" | "right" | "space-between";
    actions: {
        disabled: boolean;
        variant: "primary" | "secondary" | "ghost" | "danger";
        size: "sm" | "md";
        id: string;
        label: string;
        icon?: string | undefined;
    }[];
    layout: "horizontal" | "vertical";
}, {
    padding?: number | undefined;
    alignment?: "center" | "left" | "right" | "space-between" | undefined;
    actions?: {
        id: string;
        label: string;
        disabled?: boolean | undefined;
        variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
        size?: "sm" | "md" | undefined;
        icon?: string | undefined;
    }[] | undefined;
    layout?: "horizontal" | "vertical" | undefined;
}>;
export type CardActionArea = z.infer<typeof CardActionAreaSchema>;
export declare const CardPropsSchema: z.ZodObject<{
    /** Visual variant */
    variant: z.ZodDefault<z.ZodEnum<["default", "elevated", "outlined"]>>;
    /** Header section */
    header: z.ZodOptional<z.ZodObject<{
        /** Title text */
        title: z.ZodString;
        /** Subtitle text */
        subtitle: z.ZodOptional<z.ZodString>;
        /** Avatar / icon identifier */
        avatar: z.ZodOptional<z.ZodString>;
        /** Action area (e.g. dropdown menu trigger) */
        action: z.ZodOptional<z.ZodString>;
        /** Show divider below header */
        showDivider: z.ZodDefault<z.ZodBoolean>;
        /** Padding */
        padding: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        title: string;
        showDivider: boolean;
        padding: number;
        subtitle?: string | undefined;
        avatar?: string | undefined;
        action?: string | undefined;
    }, {
        title: string;
        subtitle?: string | undefined;
        avatar?: string | undefined;
        action?: string | undefined;
        showDivider?: boolean | undefined;
        padding?: number | undefined;
    }>>;
    /** Body section */
    body: z.ZodOptional<z.ZodObject<{
        /** Padding */
        padding: z.ZodDefault<z.ZodNumber>;
        /** Allow body to scroll */
        scrollable: z.ZodDefault<z.ZodBoolean>;
        /** Max height when scrollable */
        maxHeight: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    }, "strict", z.ZodTypeAny, {
        padding: number;
        scrollable: boolean;
        maxHeight?: string | number | undefined;
    }, {
        padding?: number | undefined;
        scrollable?: boolean | undefined;
        maxHeight?: string | number | undefined;
    }>>;
    /** Footer section */
    footer: z.ZodOptional<z.ZodObject<{
        /** Alignment of footer content */
        alignment: z.ZodDefault<z.ZodEnum<["left", "center", "right", "space-between"]>>;
        /** Show divider above footer */
        showDivider: z.ZodDefault<z.ZodBoolean>;
        /** Padding */
        padding: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        showDivider: boolean;
        padding: number;
        alignment: "center" | "left" | "right" | "space-between";
    }, {
        showDivider?: boolean | undefined;
        padding?: number | undefined;
        alignment?: "center" | "left" | "right" | "space-between" | undefined;
    }>>;
    /** Media slot */
    media: z.ZodOptional<z.ZodObject<{
        /** Media source URL */
        src: z.ZodString;
        /** Alt text */
        alt: z.ZodDefault<z.ZodString>;
        /** Media position relative to card body */
        position: z.ZodDefault<z.ZodEnum<["top", "bottom", "left", "right", "background"]>>;
        /** Media height (px) */
        height: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
        /** Object fit */
        objectFit: z.ZodDefault<z.ZodEnum<["cover", "contain", "fill", "none"]>>;
        /** Show overlay on media */
        overlay: z.ZodDefault<z.ZodBoolean>;
        /** Overlay color */
        overlayColor: z.ZodDefault<z.ZodString>;
        /** Aspect ratio (e.g. "16/9") */
        aspectRatio: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        src: string;
        alt: string;
        position: "left" | "right" | "top" | "bottom" | "background";
        height: string | number;
        objectFit: "none" | "fill" | "cover" | "contain";
        overlay: boolean;
        overlayColor: string;
        aspectRatio?: string | undefined;
    }, {
        src: string;
        alt?: string | undefined;
        position?: "left" | "right" | "top" | "bottom" | "background" | undefined;
        height?: string | number | undefined;
        objectFit?: "none" | "fill" | "cover" | "contain" | undefined;
        overlay?: boolean | undefined;
        overlayColor?: string | undefined;
        aspectRatio?: string | undefined;
    }>>;
    /** Action area */
    actionArea: z.ZodOptional<z.ZodObject<{
        /** Actions */
        actions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Action identifier */
            id: z.ZodString;
            /** Display label */
            label: z.ZodString;
            /** Icon identifier */
            icon: z.ZodOptional<z.ZodString>;
            /** Variant */
            variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
            /** Size */
            size: z.ZodDefault<z.ZodEnum<["sm", "md"]>>;
            /** Disabled */
            disabled: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            disabled: boolean;
            variant: "primary" | "secondary" | "ghost" | "danger";
            size: "sm" | "md";
            id: string;
            label: string;
            icon?: string | undefined;
        }, {
            id: string;
            label: string;
            disabled?: boolean | undefined;
            variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
            size?: "sm" | "md" | undefined;
            icon?: string | undefined;
        }>, "many">>;
        /** Layout */
        layout: z.ZodDefault<z.ZodEnum<["horizontal", "vertical"]>>;
        /** Alignment */
        alignment: z.ZodDefault<z.ZodEnum<["left", "center", "right", "space-between"]>>;
        /** Padding */
        padding: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        padding: number;
        alignment: "center" | "left" | "right" | "space-between";
        actions: {
            disabled: boolean;
            variant: "primary" | "secondary" | "ghost" | "danger";
            size: "sm" | "md";
            id: string;
            label: string;
            icon?: string | undefined;
        }[];
        layout: "horizontal" | "vertical";
    }, {
        padding?: number | undefined;
        alignment?: "center" | "left" | "right" | "space-between" | undefined;
        actions?: {
            id: string;
            label: string;
            disabled?: boolean | undefined;
            variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
            size?: "sm" | "md" | undefined;
            icon?: string | undefined;
        }[] | undefined;
        layout?: "horizontal" | "vertical" | undefined;
    }>>;
    /** Border radius */
    borderRadius: z.ZodDefault<z.ZodString>;
    /** Make entire card clickable */
    clickable: z.ZodDefault<z.ZodBoolean>;
    /** Link URL (if clickable) */
    href: z.ZodOptional<z.ZodString>;
    /** Enable hover effect */
    hoverable: z.ZodDefault<z.ZodBoolean>;
    /** Card width */
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Card min-height */
    minHeight: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Full-width card */
    fullWidth: z.ZodDefault<z.ZodBoolean>;
    /** Loading state */
    loading: z.ZodDefault<z.ZodBoolean>;
    /** Accessible label */
    ariaLabel: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    loading: boolean;
    variant: "default" | "elevated" | "outlined";
    fullWidth: boolean;
    borderRadius: string;
    clickable: boolean;
    hoverable: boolean;
    ariaLabel?: string | undefined;
    header?: {
        title: string;
        showDivider: boolean;
        padding: number;
        subtitle?: string | undefined;
        avatar?: string | undefined;
        action?: string | undefined;
    } | undefined;
    body?: {
        padding: number;
        scrollable: boolean;
        maxHeight?: string | number | undefined;
    } | undefined;
    footer?: {
        showDivider: boolean;
        padding: number;
        alignment: "center" | "left" | "right" | "space-between";
    } | undefined;
    media?: {
        src: string;
        alt: string;
        position: "left" | "right" | "top" | "bottom" | "background";
        height: string | number;
        objectFit: "none" | "fill" | "cover" | "contain";
        overlay: boolean;
        overlayColor: string;
        aspectRatio?: string | undefined;
    } | undefined;
    actionArea?: {
        padding: number;
        alignment: "center" | "left" | "right" | "space-between";
        actions: {
            disabled: boolean;
            variant: "primary" | "secondary" | "ghost" | "danger";
            size: "sm" | "md";
            id: string;
            label: string;
            icon?: string | undefined;
        }[];
        layout: "horizontal" | "vertical";
    } | undefined;
    href?: string | undefined;
    width?: string | number | undefined;
    minHeight?: string | number | undefined;
}, {
    loading?: boolean | undefined;
    variant?: "default" | "elevated" | "outlined" | undefined;
    fullWidth?: boolean | undefined;
    ariaLabel?: string | undefined;
    header?: {
        title: string;
        subtitle?: string | undefined;
        avatar?: string | undefined;
        action?: string | undefined;
        showDivider?: boolean | undefined;
        padding?: number | undefined;
    } | undefined;
    body?: {
        padding?: number | undefined;
        scrollable?: boolean | undefined;
        maxHeight?: string | number | undefined;
    } | undefined;
    footer?: {
        showDivider?: boolean | undefined;
        padding?: number | undefined;
        alignment?: "center" | "left" | "right" | "space-between" | undefined;
    } | undefined;
    media?: {
        src: string;
        alt?: string | undefined;
        position?: "left" | "right" | "top" | "bottom" | "background" | undefined;
        height?: string | number | undefined;
        objectFit?: "none" | "fill" | "cover" | "contain" | undefined;
        overlay?: boolean | undefined;
        overlayColor?: string | undefined;
        aspectRatio?: string | undefined;
    } | undefined;
    actionArea?: {
        padding?: number | undefined;
        alignment?: "center" | "left" | "right" | "space-between" | undefined;
        actions?: {
            id: string;
            label: string;
            disabled?: boolean | undefined;
            variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
            size?: "sm" | "md" | undefined;
            icon?: string | undefined;
        }[] | undefined;
        layout?: "horizontal" | "vertical" | undefined;
    } | undefined;
    borderRadius?: string | undefined;
    clickable?: boolean | undefined;
    href?: string | undefined;
    hoverable?: boolean | undefined;
    width?: string | number | undefined;
    minHeight?: string | number | undefined;
}>;
export type CardProps = z.infer<typeof CardPropsSchema>;
export declare const CardGridSchema: z.ZodObject<{
    /** Number of columns */
    columns: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        xs: z.ZodDefault<z.ZodNumber>;
        sm: z.ZodDefault<z.ZodNumber>;
        md: z.ZodDefault<z.ZodNumber>;
        lg: z.ZodDefault<z.ZodNumber>;
        xl: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sm: number;
        md: number;
        lg: number;
        xs: number;
        xl: number;
    }, {
        sm?: number | undefined;
        md?: number | undefined;
        lg?: number | undefined;
        xs?: number | undefined;
        xl?: number | undefined;
    }>]>;
    /** Gap between cards (px) */
    gap: z.ZodDefault<z.ZodNumber>;
    /** Equal height cards */
    equalHeight: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    gap: number;
    columns: number | {
        sm: number;
        md: number;
        lg: number;
        xs: number;
        xl: number;
    };
    equalHeight: boolean;
}, {
    columns: number | {
        sm?: number | undefined;
        md?: number | undefined;
        lg?: number | undefined;
        xs?: number | undefined;
        xl?: number | undefined;
    };
    gap?: number | undefined;
    equalHeight?: boolean | undefined;
}>;
export type CardGrid = z.infer<typeof CardGridSchema>;
//# sourceMappingURL=cards.d.ts.map