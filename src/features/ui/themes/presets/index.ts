// Palette-only presets barrel.
// This module intentionally exposes only the simple theme/palette surface.

export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  primary: string;
  secondary: string;
  accent: string;
  neutralLight: string;
  neutralDark: string;
};

export type ThemeDefinition = {
  name: string;
  mode: ThemeMode;
  palette: ThemePalette;
};

export const themes: Record<string, ThemeDefinition> = {
  neonTeal: {
    name: "neonTeal",
    mode: "dark",
    palette: {
      primary: "#22d3ee",
      secondary: "#0a0a0a",
      accent: "#22d3ee",
      neutralLight: "#ffffff",
      neutralDark: "#050505",
    },
  },
  cozyCabin: {
    name: "cozyCabin",
    mode: "light",
    palette: {
      primary: "#8e735b",
      secondary: "#d4a373",
      accent: "#c8a279",
      neutralLight: "#f5f2ed",
      neutralDark: "#2b1d0e",
    },
  },
};

export const defaultTheme = themes.cozyCabin;

export const getThemePalette = (themeName: string): ThemePalette => {
  return themes[themeName]?.palette ?? defaultTheme.palette;
};

export const getThemeMode = (themeName: string): ThemeMode => {
  return themes[themeName]?.mode ?? defaultTheme.mode;
};
