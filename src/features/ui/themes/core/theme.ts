export type ThemeMode = "light" | "dark";

export type ThemeScaleTokens = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  xxxl: string;
};

export type ThemeCompensationTokens = {
  scaleMin: string;
  scaleMax: string;
  uiScale: string;
  containerScale: string;
  toolbarScale: string;
  iconScale: string;
  fontScale: string;
};

export type ThemeToolbarSeparatorTokens = {
  width: string;
  height: string;
  color: string;
  opacity: string;
};

export type ThemeToolbarBadgeTokens = {
  gap: string;
  paddingX: string;
  paddingY: string;
  iconSize: string;
  textSize: string;
  iconStrokeWidth: string;
  textForeground: string;
  iconForegroundFallback: string;
  containerFontWeight: string;
};

export type ThemeToolbarMoneyTokens = {
  paddingX: string;
  paddingY: string;
  gap: string;
  iconSize: string;
  radius: string;
  border: string;
  shadow: string;
  background: string;
  foreground: string;
  hoverScale: string;
};

export type ThemeToolbarMenuTokens = {
  padding: string;
  minWidth: string;
  radius: string;
  background: string;
  border: string;
  shadow: string;
  backdrop: string;
  zIndex: string;
  positionOffset: string;
  headerPaddingX: string;
  headerPaddingY: string;
  headerMarginBottom: string;
  headerBorderBottom: string;
  headerTextSize: string;
  headerFontFamily: string;
  headerFontWeight: string;
  headerTextTransform: string;
  headerTracking: string;
  headerForeground: string;
  rowPaddingX: string;
  rowPaddingY: string;
  rowGap: string;
  rowRadius: string;
  rowTextSize: string;
  rowFontWeight: string;
  rowTransition: string;
  rowIdleForeground: string;
  rowIdleBackground: string;
  rowHoverForeground: string;
  rowHoverBackground: string;
  rowActiveForeground: string;
  rowActiveBackground: string;
  rowIconSize: string;
  rowIconStrokeWidth: string;
  checkIconSize: string;
  checkIconForeground: string;
};

export type ThemeToolbarButtonTokens = {
  paddingX: string;
  paddingY: string;
  iconSize: string;
  strokeWidth: string;
  borderRadius: string;
  shadow: string;
  activeScale: string;
  idleOpacity: string;
  activeBackground: string;
  activeForeground: string;
  idleForeground: string;
  hoverBackground: string;
  hoverForeground: string;
};

export type ThemeMainToolbarTokens = {
  shell: {
    padding: string;
    gap: string;
    borderRadius: string;
    background: string;
    border: string;
    shadow: string;
    backdrop: string;
  };
  button: ThemeToolbarButtonTokens;
  separator: ThemeToolbarSeparatorTokens;
  resourceBadge: ThemeToolbarBadgeTokens;
  moneyIndicator: ThemeToolbarMoneyTokens;
  menu: ThemeToolbarMenuTokens;
};

export type ThemeButtonTokens = {
  paddingX: string;
  paddingY: string;
  iconSize: string;
  strokeWidth: string;
  borderRadius: string;
  shadow: string;
  activeScale: string;
  idleOpacity: string;
  activeBackground: string;
  activeForeground: string;
  idleForeground: string;
  hoverBackground: string;
  hoverForeground: string;
};

export type ThemeToolbarTokens = {
  padding: string;
  gap: string;
  borderRadius: string;
  shellBackground: string;
  shellBorder: string;
  shellShadow: string;
  shellBackdrop: string;
  button: ThemeButtonTokens;
};

export type ThemeToolbarComponentTokens = {
  mainToolbar: ThemeMainToolbarTokens;
  buildToolbar: ThemeToolbarTokens;
};

export type ThemePalette = {
  primary: string;
  secondary: string;
  accent: string;
  neutralLight: string;
  neutralDark: string;
};

export type ThemeSurfaceTokens = {
  background: string;
  foreground: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderSubtle: string;
  overlay: string;
  shadow: string;
};

export type ThemeSizingTokens = {
  spacing: ThemeScaleTokens;
  compensation: ThemeCompensationTokens;
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    pill: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
  button: ThemeButtonTokens;
  toolbar: ThemeToolbarTokens;
  components: ThemeToolbarComponentTokens;
};

export type ThemeTokens = {
  name: string;
  mode: ThemeMode;
  palette: ThemePalette;
  surfaces: ThemeSurfaceTokens;
  sizing: ThemeSizingTokens;
};

export type ThemeCSSVariables = Record<string, string>;

export const industryStandardFiveColorPalette = {
  primary: "#22d3ee",
  secondary: "#0f172a",
  accent: "#a855f7",
  neutralLight: "#f8fafc",
  neutralDark: "#020617",
} as const;

const spacingScale = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  xxl: "2rem",
  xxxl: "3rem",
} as const;

const compensationScale = {
  scaleMin: "0.875",
  scaleMax: "1.15",
  uiScale: "clamp(0.9, 0.8 + 0.25vw, 1.08)",
  containerScale: "clamp(0.92, 0.85 + 0.18vw, 1.1)",
  toolbarScale: "clamp(0.9, 0.82 + 0.2vw, 1.08)",
  iconScale: "clamp(0.92, 0.9 + 0.1vw, 1.04)",
  fontScale: "clamp(0.94, 0.92 + 0.08vw, 1.05)",
} as const satisfies ThemeCompensationTokens;

const radiusScale = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  pill: "9999px",
} as const;

const shadowScale = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.12)",
  md: "0 10px 30px rgba(0, 0, 0, 0.25)",
  lg: "0 20px 50px rgba(0, 0, 0, 0.4)",
} as const;

const baseButton = {
  paddingX: "0.44rem",
  paddingY: "0.44rem",
  iconSize: "28px",
  strokeWidth: "1.5",
  borderRadius: radiusScale.xl,
  shadow: "0 0 15px var(--primary)",
  activeScale: "1.1",
  idleOpacity: "1",
  activeBackground: "var(--primary)",
  activeForeground: "var(--background)",
  idleForeground: "var(--text)",
  hoverBackground: "transparent",
  hoverForeground: "var(--primary)",
} as const satisfies ThemeButtonTokens;

const mainToolbarButton = {
  ...baseButton,
} as const satisfies ThemeToolbarButtonTokens;

const buildToolbarButton = {
  ...baseButton,
  paddingX: "0.85rem",
  paddingY: "0.6375rem",
  iconSize: "26px",
} as const satisfies ThemeToolbarButtonTokens;

const mainToolbarShell = {
  padding: "0.75rem",
  gap: "0.375rem",
  borderRadius: radiusScale.xl,
  background: "rgba(255, 255, 255, 0.9)",
  border: "rgba(255, 255, 255, 0.1)",
  shadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
  backdrop: "blur(16px)",
} as const satisfies ThemeMainToolbarTokens["shell"];

const mainToolbarSeparator = {
  width: "1px",
  height: "27.2px",
  color: "var(--text)",
  opacity: "0.2",
} as const satisfies ThemeToolbarSeparatorTokens;

const mainToolbarResourceBadge = {
  gap: "0.2125rem",
  paddingX: "0.4675rem",
  paddingY: "0.187rem",
  iconSize: "20px",
  textSize: "0.875rem",
  iconStrokeWidth: "1.25",
  textForeground: "text-text/80",
  iconForegroundFallback: "currentColor",
  containerFontWeight: "500",
} as const satisfies ThemeToolbarBadgeTokens;

const mainToolbarMoneyIndicator = {
  paddingX: "0.765rem",
  paddingY: "0.3825rem",
  gap: "0.3825rem",
  iconSize: "18px",
  radius: radiusScale.pill,
  border: "1px solid rgba(37, 99, 235, 0.3)",
  shadow: "0 10px 30px rgba(37, 99, 235, 0.35)",
  background: "bg-primary/5",
  foreground: "text-primary",
  hoverScale: "1.02",
} as const satisfies ThemeToolbarMoneyTokens;

const mainToolbarMenu = {
  padding: "0.31875rem",
  minWidth: "180px",
  radius: radiusScale.xl,
  background: "bg-background/90",
  border: "border-primary/10",
  shadow: "shadow-2xl",
  backdrop: "blur(16px)",
  zIndex: "100",
  positionOffset: "top-full mt-2 left-0",
  headerPaddingX: "0.5rem",
  headerPaddingY: "0.31875rem",
  headerMarginBottom: "0.25rem",
  headerBorderBottom: "border-primary/5",
  headerTextSize: "8px",
  headerFontFamily: "font-mono",
  headerFontWeight: "400",
  headerTextTransform: "uppercase",
  headerTracking: "widest",
  headerForeground: "text-text/40",
  rowPaddingX: "0.6375rem",
  rowPaddingY: "0.31875rem",
  rowGap: "1rem",
  rowRadius: "0.5rem",
  rowTextSize: "0.75rem",
  rowFontWeight: "400",
  rowTransition: "all",
  rowIdleForeground: "text-text/60",
  rowIdleBackground: "transparent",
  rowHoverForeground: "text-text",
  rowHoverBackground: "bg-primary/5",
  rowActiveForeground: "text-text",
  rowActiveBackground: "bg-primary/20",
  rowIconSize: "12px",
  rowIconStrokeWidth: "1.5",
  checkIconSize: "12px",
  checkIconForeground: "text-primary",
} as const satisfies ThemeToolbarMenuTokens;

const baseSizing = {
  spacing: spacingScale,
  compensation: compensationScale,
  radius: radiusScale,
  shadow: shadowScale,
  button: baseButton,
  toolbar: {
    padding: "0.75rem",
    gap: "0.375rem",
    borderRadius: radiusScale.xl,
    shellBackground: "var(--background)",
    shellBorder: "var(--text)",
    shellShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
    shellBackdrop: "blur(16px)",
    button: baseButton,
  },
  components: {
    mainToolbar: {
      shell: mainToolbarShell,
      button: mainToolbarButton,
      separator: mainToolbarSeparator,
      resourceBadge: mainToolbarResourceBadge,
      moneyIndicator: mainToolbarMoneyIndicator,
      menu: mainToolbarMenu,
    },
    buildToolbar: {
      padding: "0.6375rem 0.85rem",
      gap: "0.6375rem",
      borderRadius: radiusScale.xl,
      shellBackground: "var(--background)",
      shellBorder: "var(--text)",
      shellShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
      shellBackdrop: "blur(16px)",
      button: buildToolbarButton,
    },
  },
} as const satisfies ThemeSizingTokens;

const lightPalette: ThemePalette = {
  primary: "#8e735b",
  secondary: "#d4a373",
  accent: "#c8a279",
  neutralLight: "#f5f2ed",
  neutralDark: "#2b1d0e",
};

const darkPalette: ThemePalette = {
  primary: "#22d3ee",
  secondary: "#0a0a0a",
  accent: "#22d3ee",
  neutralLight: "#ffffff",
  neutralDark: "#050505",
};

const lightSurfaces: ThemeSurfaceTokens = {
  background: "#f5f2ed",
  foreground: "#2b1d0e",
  surface: "rgba(255, 255, 255, 0.88)",
  surfaceMuted: "rgba(255, 255, 255, 0.72)",
  border: "rgba(43, 29, 14, 0.14)",
  borderSubtle: "rgba(43, 29, 14, 0.08)",
  overlay: "rgba(43, 29, 14, 0.55)",
  shadow: "0 20px 50px rgba(43, 29, 14, 0.18)",
};

const darkSurfaces: ThemeSurfaceTokens = {
  background: "#050505",
  foreground: "#ffffff",
  surface: "rgba(12, 12, 12, 0.9)",
  surfaceMuted: "rgba(12, 12, 12, 0.8)",
  border: "rgba(255, 255, 255, 0.1)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  overlay: "rgba(0, 0, 0, 0.55)",
  shadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
};

export const themeTokens: Record<ThemeMode, ThemeTokens> = {
  light: {
    name: "cozy_cabin",
    mode: "light",
    palette: lightPalette,
    surfaces: lightSurfaces,
    sizing: baseSizing,
  },
  dark: {
    name: "neon_teal",
    mode: "dark",
    palette: darkPalette,
    surfaces: darkSurfaces,
    sizing: baseSizing,
  },
};

export const defaultThemeTokens = themeTokens.dark;

export const createThemeCSSVariables = (
  theme: ThemeTokens,
): ThemeCSSVariables => ({
  "--theme-name": theme.name,
  "--theme-mode": theme.mode,
  "--theme-global-font-size": "14px",
  "--theme-ui-scale": theme.sizing.compensation.uiScale,
  "--theme-ui-scale-min": theme.sizing.compensation.scaleMin,
  "--theme-ui-scale-max": theme.sizing.compensation.scaleMax,
  "--theme-container-scale": theme.sizing.compensation.containerScale,
  "--theme-toolbar-scale": theme.sizing.compensation.toolbarScale,
  "--theme-icon-scale": theme.sizing.compensation.iconScale,
  "--theme-font-scale": theme.sizing.compensation.fontScale,
  "--theme-primary": theme.palette.primary,
  "--theme-secondary": theme.palette.secondary,
  "--theme-accent": theme.palette.accent,
  "--theme-neutral-light": theme.palette.neutralLight,
  "--theme-neutral-dark": theme.palette.neutralDark,
  "--theme-background": theme.surfaces.background,
  "--theme-foreground": theme.surfaces.foreground,
  "--theme-surface": theme.surfaces.surface,
  "--theme-surface-muted": theme.surfaces.surfaceMuted,
  "--theme-border": theme.surfaces.border,
  "--theme-border-subtle": theme.surfaces.borderSubtle,
  "--theme-overlay": theme.surfaces.overlay,
  "--theme-shadow": theme.surfaces.shadow,
  "--theme-space-xs": theme.sizing.spacing.xs,
  "--theme-space-sm": theme.sizing.spacing.sm,
  "--theme-space-md": theme.sizing.spacing.md,
  "--theme-space-lg": theme.sizing.spacing.lg,
  "--theme-space-xl": theme.sizing.spacing.xl,
  "--theme-space-xxl": theme.sizing.spacing.xxl,
  "--theme-space-xxxl": theme.sizing.spacing.xxxl,
  "--theme-radius-sm": theme.sizing.radius.sm,
  "--theme-radius-md": theme.sizing.radius.md,
  "--theme-radius-lg": theme.sizing.radius.lg,
  "--theme-radius-xl": theme.sizing.radius.xl,
  "--theme-radius-pill": theme.sizing.radius.pill,
  "--theme-shadow-sm": theme.sizing.shadow.sm,
  "--theme-shadow-md": theme.sizing.shadow.md,
  "--theme-shadow-lg": theme.sizing.shadow.lg,
  "--theme-button-padding-x": theme.sizing.button.paddingX,
  "--theme-button-padding-y": theme.sizing.button.paddingY,
  "--theme-button-icon-size": theme.sizing.button.iconSize,
  "--theme-button-stroke-width": theme.sizing.button.strokeWidth,
  "--theme-button-radius": theme.sizing.button.borderRadius,
  "--theme-toolbar-padding": theme.sizing.toolbar.padding,
  "--theme-toolbar-gap": theme.sizing.toolbar.gap,
  "--theme-toolbar-radius": theme.sizing.toolbar.borderRadius,
  "--theme-main-toolbar-padding":
    theme.sizing.components.mainToolbar.shell.padding,
  "--theme-main-toolbar-gap": theme.sizing.components.mainToolbar.shell.gap,
  "--theme-main-toolbar-radius":
    theme.sizing.components.mainToolbar.shell.borderRadius,
  "--theme-main-toolbar-shell-background":
    theme.sizing.components.mainToolbar.shell.background,
  "--theme-main-toolbar-shell-border":
    theme.sizing.components.mainToolbar.shell.border,
  "--theme-main-toolbar-shell-shadow":
    theme.sizing.components.mainToolbar.shell.shadow,
  "--theme-main-toolbar-shell-backdrop":
    theme.sizing.components.mainToolbar.shell.backdrop,
  "--theme-main-toolbar-button-radius":
    theme.sizing.components.mainToolbar.button.borderRadius,
  "--theme-main-toolbar-button-padding-x":
    theme.sizing.components.mainToolbar.button.paddingX,
  "--theme-main-toolbar-button-padding-y":
    theme.sizing.components.mainToolbar.button.paddingY,
  "--theme-main-toolbar-button-icon-size":
    theme.sizing.components.mainToolbar.button.iconSize,
  "--theme-main-toolbar-button-stroke-width":
    theme.sizing.components.mainToolbar.button.strokeWidth,
  "--theme-main-toolbar-button-shadow":
    theme.sizing.components.mainToolbar.button.shadow,
  "--theme-main-toolbar-button-active-scale":
    theme.sizing.components.mainToolbar.button.activeScale,
  "--theme-main-toolbar-button-idle-opacity":
    theme.sizing.components.mainToolbar.button.idleOpacity,
  "--theme-main-toolbar-button-active-background":
    theme.sizing.components.mainToolbar.button.activeBackground,
  "--theme-main-toolbar-button-active-foreground":
    theme.sizing.components.mainToolbar.button.activeForeground,
  "--theme-main-toolbar-button-idle-foreground":
    theme.sizing.components.mainToolbar.button.idleForeground,
  "--theme-main-toolbar-button-hover-background":
    theme.sizing.components.mainToolbar.button.hoverBackground,
  "--theme-main-toolbar-button-hover-foreground":
    theme.sizing.components.mainToolbar.button.hoverForeground,
  "--theme-main-toolbar-separator-width":
    theme.sizing.components.mainToolbar.separator.width,
  "--theme-main-toolbar-separator-height":
    theme.sizing.components.mainToolbar.separator.height,
  "--theme-main-toolbar-separator-color":
    theme.sizing.components.mainToolbar.separator.color,
  "--theme-main-toolbar-separator-opacity":
    theme.sizing.components.mainToolbar.separator.opacity,
  "--theme-main-toolbar-resource-gap":
    theme.sizing.components.mainToolbar.resourceBadge.gap,
  "--theme-main-toolbar-resource-padding-x":
    theme.sizing.components.mainToolbar.resourceBadge.paddingX,
  "--theme-main-toolbar-resource-padding-y":
    theme.sizing.components.mainToolbar.resourceBadge.paddingY,
  "--theme-main-toolbar-resource-icon-size":
    theme.sizing.components.mainToolbar.resourceBadge.iconSize,
  "--theme-main-toolbar-resource-text-size":
    theme.sizing.components.mainToolbar.resourceBadge.textSize,
  "--theme-main-toolbar-money-padding-x":
    theme.sizing.components.mainToolbar.moneyIndicator.paddingX,
  "--theme-main-toolbar-money-padding-y":
    theme.sizing.components.mainToolbar.moneyIndicator.paddingY,
  "--theme-main-toolbar-money-gap":
    theme.sizing.components.mainToolbar.moneyIndicator.gap,
  "--theme-main-toolbar-money-icon-size":
    theme.sizing.components.mainToolbar.moneyIndicator.iconSize,
  "--theme-main-toolbar-money-radius":
    theme.sizing.components.mainToolbar.moneyIndicator.radius,
  "--theme-main-toolbar-money-border":
    theme.sizing.components.mainToolbar.moneyIndicator.border,
  "--theme-main-toolbar-money-shadow":
    theme.sizing.components.mainToolbar.moneyIndicator.shadow,
  "--theme-main-toolbar-money-background":
    theme.sizing.components.mainToolbar.moneyIndicator.background,
  "--theme-main-toolbar-money-foreground":
    theme.sizing.components.mainToolbar.moneyIndicator.foreground,
  "--theme-main-toolbar-money-hover-scale":
    theme.sizing.components.mainToolbar.moneyIndicator.hoverScale,
  "--theme-main-toolbar-menu-padding":
    theme.sizing.components.mainToolbar.menu.padding,
  "--theme-main-toolbar-menu-min-width":
    theme.sizing.components.mainToolbar.menu.minWidth,
  "--theme-main-toolbar-menu-radius":
    theme.sizing.components.mainToolbar.menu.radius,
  "--theme-main-toolbar-menu-background":
    theme.sizing.components.mainToolbar.menu.background,
  "--theme-main-toolbar-menu-border":
    theme.sizing.components.mainToolbar.menu.border,
  "--theme-main-toolbar-menu-shadow":
    theme.sizing.components.mainToolbar.menu.shadow,
  "--theme-main-toolbar-menu-backdrop":
    theme.sizing.components.mainToolbar.menu.backdrop,
  "--theme-main-toolbar-menu-z-index":
    theme.sizing.components.mainToolbar.menu.zIndex,
  "--theme-main-toolbar-menu-position-offset":
    theme.sizing.components.mainToolbar.menu.positionOffset,
  "--theme-main-toolbar-menu-header-padding-x":
    theme.sizing.components.mainToolbar.menu.headerPaddingX,
  "--theme-main-toolbar-menu-header-padding-y":
    theme.sizing.components.mainToolbar.menu.headerPaddingY,
  "--theme-main-toolbar-menu-header-margin-bottom":
    theme.sizing.components.mainToolbar.menu.headerMarginBottom,
  "--theme-main-toolbar-menu-header-border-bottom":
    theme.sizing.components.mainToolbar.menu.headerBorderBottom,
  "--theme-main-toolbar-menu-header-text-size":
    theme.sizing.components.mainToolbar.menu.headerTextSize,
  "--theme-main-toolbar-menu-header-font-family":
    theme.sizing.components.mainToolbar.menu.headerFontFamily,
  "--theme-main-toolbar-menu-header-font-weight":
    theme.sizing.components.mainToolbar.menu.headerFontWeight,
  "--theme-main-toolbar-menu-header-text-transform":
    theme.sizing.components.mainToolbar.menu.headerTextTransform,
  "--theme-main-toolbar-menu-header-tracking":
    theme.sizing.components.mainToolbar.menu.headerTracking,
  "--theme-main-toolbar-menu-header-foreground":
    theme.sizing.components.mainToolbar.menu.headerForeground,
  "--theme-main-toolbar-menu-row-padding-x":
    theme.sizing.components.mainToolbar.menu.rowPaddingX,
  "--theme-main-toolbar-menu-row-padding-y":
    theme.sizing.components.mainToolbar.menu.rowPaddingY,
  "--theme-main-toolbar-menu-row-gap":
    theme.sizing.components.mainToolbar.menu.rowGap,
  "--theme-main-toolbar-menu-row-radius":
    theme.sizing.components.mainToolbar.menu.rowRadius,
  "--theme-main-toolbar-menu-row-text-size":
    theme.sizing.components.mainToolbar.menu.rowTextSize,
  "--theme-main-toolbar-menu-row-font-weight":
    theme.sizing.components.mainToolbar.menu.rowFontWeight,
  "--theme-main-toolbar-menu-row-transition":
    theme.sizing.components.mainToolbar.menu.rowTransition,
  "--theme-main-toolbar-menu-row-idle-foreground":
    theme.sizing.components.mainToolbar.menu.rowIdleForeground,
  "--theme-main-toolbar-menu-row-idle-background":
    theme.sizing.components.mainToolbar.menu.rowIdleBackground,
  "--theme-main-toolbar-menu-row-hover-foreground":
    theme.sizing.components.mainToolbar.menu.rowHoverForeground,
  "--theme-main-toolbar-menu-row-hover-background":
    theme.sizing.components.mainToolbar.menu.rowHoverBackground,
  "--theme-main-toolbar-menu-row-active-foreground":
    theme.sizing.components.mainToolbar.menu.rowActiveForeground,
  "--theme-main-toolbar-menu-row-active-background":
    theme.sizing.components.mainToolbar.menu.rowActiveBackground,
  "--theme-main-toolbar-menu-row-icon-size":
    theme.sizing.components.mainToolbar.menu.rowIconSize,
  "--theme-main-toolbar-menu-row-icon-stroke-width":
    theme.sizing.components.mainToolbar.menu.rowIconStrokeWidth,
  "--theme-main-toolbar-menu-check-icon-size":
    theme.sizing.components.mainToolbar.menu.checkIconSize,
  "--theme-main-toolbar-menu-check-icon-foreground":
    theme.sizing.components.mainToolbar.menu.checkIconForeground,
});

export const getThemeTokens = (mode: ThemeMode = "dark"): ThemeTokens =>
  themeTokens[mode];
