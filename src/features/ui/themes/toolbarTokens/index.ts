import type { ThemeTokens, ThemeToolbarTokens } from "../core/theme";

export const getMainToolbarTokens = (theme: ThemeTokens): ThemeToolbarTokens =>
  theme.sizing.components.mainToolbar;

export const getBuildToolbarTokens = (theme: ThemeTokens): ThemeToolbarTokens =>
  theme.sizing.components.buildToolbar;
