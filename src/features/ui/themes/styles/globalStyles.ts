import {
  defaultThemeTokens,
  industryStandardFiveColorPalette,
  createThemeCSSVariables,
  getThemeTokens,
  themeTokens,
  type ThemeCSSVariables,
  type ThemeMode,
  type ThemePalette,
  type ThemeSizingTokens,
  type ThemeSurfaceTokens,
  type ThemeTokens,
  type ThemeToolbarTokens,
  type ThemeMainToolbarTokens,
} from "../core/theme";

export {
  defaultThemeTokens,
  industryStandardFiveColorPalette,
  createThemeCSSVariables,
  getThemeTokens,
  themeTokens,
  type ThemeCSSVariables,
  type ThemeMode,
  type ThemePalette,
  type ThemeSizingTokens,
  type ThemeSurfaceTokens,
  type ThemeTokens,
};

export const globalThemeStyleId = "ui-theme-global-styles";

export const mainToolbarThemeStyleId = "ui-theme-main-toolbar";
export const buildToolbarThemeStyleId = "ui-theme-build-toolbar";

export const globalThemeStyleCss = `
:root {
  color-scheme: dark;
}

[data-theme-mode="light"] {
  color-scheme: light;
}
`;

export const mainToolbarThemeStyleCss = (toolbar: ThemeMainToolbarTokens) => `
:root {
  --theme-main-toolbar-padding: ${toolbar.shell.padding};
  --theme-main-toolbar-gap: ${toolbar.shell.gap};
  --theme-main-toolbar-radius: ${toolbar.shell.borderRadius};
  --theme-main-toolbar-shell-background: ${toolbar.shell.background};
  --theme-main-toolbar-shell-border: ${toolbar.shell.border};
  --theme-main-toolbar-shell-shadow: ${toolbar.shell.shadow};
  --theme-main-toolbar-shell-backdrop: ${toolbar.shell.backdrop};
  --theme-main-toolbar-button-radius: ${toolbar.button.borderRadius};
  --theme-main-toolbar-button-padding-x: ${toolbar.button.paddingX};
  --theme-main-toolbar-button-padding-y: ${toolbar.button.paddingY};
  --theme-main-toolbar-button-icon-size: ${toolbar.button.iconSize};
  --theme-main-toolbar-button-stroke-width: ${toolbar.button.strokeWidth};
  --theme-main-toolbar-button-shadow: ${toolbar.button.shadow};
  --theme-main-toolbar-button-active-scale: ${toolbar.button.activeScale};
  --theme-main-toolbar-button-idle-opacity: ${toolbar.button.idleOpacity};
  --theme-main-toolbar-button-active-background: ${toolbar.button.activeBackground};
  --theme-main-toolbar-button-active-foreground: ${toolbar.button.activeForeground};
  --theme-main-toolbar-button-idle-foreground: ${toolbar.button.idleForeground};
  --theme-main-toolbar-button-hover-background: ${toolbar.button.hoverBackground};
  --theme-main-toolbar-button-hover-foreground: ${toolbar.button.hoverForeground};
  --theme-main-toolbar-separator-width: ${toolbar.separator.width};
  --theme-main-toolbar-separator-height: ${toolbar.separator.height};
  --theme-main-toolbar-separator-color: ${toolbar.separator.color};
  --theme-main-toolbar-separator-opacity: ${toolbar.separator.opacity};
  --theme-main-toolbar-resource-gap: ${toolbar.resourceBadge.gap};
  --theme-main-toolbar-resource-padding-x: ${toolbar.resourceBadge.paddingX};
  --theme-main-toolbar-resource-padding-y: ${toolbar.resourceBadge.paddingY};
  --theme-main-toolbar-resource-icon-size: ${toolbar.resourceBadge.iconSize};
  --theme-main-toolbar-resource-text-size: ${toolbar.resourceBadge.textSize};
  --theme-main-toolbar-money-padding-x: ${toolbar.moneyIndicator.paddingX};
  --theme-main-toolbar-money-padding-y: ${toolbar.moneyIndicator.paddingY};
  --theme-main-toolbar-money-gap: ${toolbar.moneyIndicator.gap};
  --theme-main-toolbar-money-icon-size: ${toolbar.moneyIndicator.iconSize};
  --theme-main-toolbar-money-radius: ${toolbar.moneyIndicator.radius};
  --theme-main-toolbar-money-border: ${toolbar.moneyIndicator.border};
  --theme-main-toolbar-money-shadow: ${toolbar.moneyIndicator.shadow};
  --theme-main-toolbar-money-background: ${toolbar.moneyIndicator.background};
  --theme-main-toolbar-money-foreground: ${toolbar.moneyIndicator.foreground};
  --theme-main-toolbar-money-hover-scale: ${toolbar.moneyIndicator.hoverScale};
  --theme-main-toolbar-menu-padding: ${toolbar.menu.padding};
  --theme-main-toolbar-menu-min-width: ${toolbar.menu.minWidth};
  --theme-main-toolbar-menu-radius: ${toolbar.menu.radius};
  --theme-main-toolbar-menu-background: ${toolbar.menu.background};
  --theme-main-toolbar-menu-border: ${toolbar.menu.border};
  --theme-main-toolbar-menu-shadow: ${toolbar.menu.shadow};
  --theme-main-toolbar-menu-backdrop: ${toolbar.menu.backdrop};
  --theme-main-toolbar-menu-z-index: ${toolbar.menu.zIndex};
  --theme-main-toolbar-menu-position-offset: ${toolbar.menu.positionOffset};
  --theme-main-toolbar-menu-header-padding-x: ${toolbar.menu.headerPaddingX};
  --theme-main-toolbar-menu-header-padding-y: ${toolbar.menu.headerPaddingY};
  --theme-main-toolbar-menu-header-margin-bottom: ${toolbar.menu.headerMarginBottom};
  --theme-main-toolbar-menu-header-border-bottom: ${toolbar.menu.headerBorderBottom};
  --theme-main-toolbar-menu-header-text-size: ${toolbar.menu.headerTextSize};
  --theme-main-toolbar-menu-header-font-family: ${toolbar.menu.headerFontFamily};
  --theme-main-toolbar-menu-header-font-weight: ${toolbar.menu.headerFontWeight};
  --theme-main-toolbar-menu-header-text-transform: ${toolbar.menu.headerTextTransform};
  --theme-main-toolbar-menu-header-tracking: ${toolbar.menu.headerTracking};
  --theme-main-toolbar-menu-header-foreground: ${toolbar.menu.headerForeground};
  --theme-main-toolbar-menu-row-padding-x: ${toolbar.menu.rowPaddingX};
  --theme-main-toolbar-menu-row-padding-y: ${toolbar.menu.rowPaddingY};
  --theme-main-toolbar-menu-row-gap: ${toolbar.menu.rowGap};
  --theme-main-toolbar-menu-row-radius: ${toolbar.menu.rowRadius};
  --theme-main-toolbar-menu-row-text-size: ${toolbar.menu.rowTextSize};
  --theme-main-toolbar-menu-row-font-weight: ${toolbar.menu.rowFontWeight};
  --theme-main-toolbar-menu-row-transition: ${toolbar.menu.rowTransition};
  --theme-main-toolbar-menu-row-idle-foreground: ${toolbar.menu.rowIdleForeground};
  --theme-main-toolbar-menu-row-idle-background: ${toolbar.menu.rowIdleBackground};
  --theme-main-toolbar-menu-row-hover-foreground: ${toolbar.menu.rowHoverForeground};
  --theme-main-toolbar-menu-row-hover-background: ${toolbar.menu.rowHoverBackground};
  --theme-main-toolbar-menu-row-active-foreground: ${toolbar.menu.rowActiveForeground};
  --theme-main-toolbar-menu-row-active-background: ${toolbar.menu.rowActiveBackground};
  --theme-main-toolbar-menu-row-icon-size: ${toolbar.menu.rowIconSize};
  --theme-main-toolbar-menu-row-icon-stroke-width: ${toolbar.menu.rowIconStrokeWidth};
  --theme-main-toolbar-menu-check-icon-size: ${toolbar.menu.checkIconSize};
  --theme-main-toolbar-menu-check-icon-foreground: ${toolbar.menu.checkIconForeground};
}
`;

export const buildToolbarThemeStyleCss = (toolbar: ThemeToolbarTokens) => `
:root {
  --theme-build-toolbar-padding: ${toolbar.padding};
  --theme-build-toolbar-gap: ${toolbar.gap};
  --theme-build-toolbar-radius: ${toolbar.borderRadius};
  --theme-build-toolbar-button-radius: ${toolbar.button.borderRadius};
  --theme-build-toolbar-button-padding-x: ${toolbar.button.paddingX};
  --theme-build-toolbar-button-padding-y: ${toolbar.button.paddingY};
  --theme-build-toolbar-button-icon-size: ${toolbar.button.iconSize};
  --theme-build-toolbar-button-stroke-width: ${toolbar.button.strokeWidth};
  --theme-build-toolbar-button-shadow: ${toolbar.button.shadow};
  --theme-build-toolbar-button-active-scale: ${toolbar.button.activeScale};
  --theme-build-toolbar-button-idle-opacity: ${toolbar.button.idleOpacity};
  --theme-build-toolbar-button-active-background: ${toolbar.button.activeBackground};
  --theme-build-toolbar-button-active-foreground: ${toolbar.button.activeForeground};
  --theme-build-toolbar-button-idle-foreground: ${toolbar.button.idleForeground};
  --theme-build-toolbar-button-hover-background: ${toolbar.button.hoverBackground};
  --theme-build-toolbar-button-hover-foreground: ${toolbar.button.hoverForeground};
  --theme-build-toolbar-shell-background: ${toolbar.shellBackground};
  --theme-build-toolbar-shell-border: ${toolbar.shellBorder};
  --theme-build-toolbar-shell-shadow: ${toolbar.shellShadow};
  --theme-build-toolbar-shell-backdrop: ${toolbar.shellBackdrop};
}
`;

export const getGlobalThemeStyle = () => ({
  id: globalThemeStyleId,
  cssText: globalThemeStyleCss,
});

export const getMainToolbarThemeStyle = (theme = getThemeTokens("dark")) => ({
  id: mainToolbarThemeStyleId,
  cssText: mainToolbarThemeStyleCss(theme.sizing.components.mainToolbar),
});

export const getBuildToolbarThemeStyle = (theme = getThemeTokens("dark")) => ({
  id: buildToolbarThemeStyleId,
  cssText: buildToolbarThemeStyleCss(theme.sizing.components.buildToolbar),
});

export const createGlobalThemeStyles = (mode: "light" | "dark" = "dark") => {
  const theme = getThemeTokens(mode);
  return {
    ...getGlobalThemeStyle(),
    variables: createThemeCSSVariables(theme),
    theme,
    toolbarStyles: {
      mainToolbar: getMainToolbarThemeStyle(theme),
      buildToolbar: getBuildToolbarThemeStyle(theme),
    },
  };
};
