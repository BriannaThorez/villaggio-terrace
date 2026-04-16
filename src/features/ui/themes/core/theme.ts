// Minimal theme stub to prevent linting errors. 
// The user has chosen to maintain the current GUI via static styling rather than a dynamic token system.

export type ThemeMode = "light" | "dark";
export type ThemeTokens = Record<string, any>;
export type ThemeToolbarTokens = Record<string, any>;

export const themeTokens: ThemeTokens = {};
export const getThemeTokens = (_mode: ThemeMode = "dark"): ThemeTokens => ({});
