import colorPalettes from "./palettes/color_palettes.json";

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

type PaletteRecord = {
  primary: string;
  secondary: string;
  accent: string;
  neutral_light: string;
  neutral_dark: string;
  mode: ThemeMode;
};

const buildThemeDefinition = (
  name: string,
  palette: PaletteRecord,
): ThemeDefinition => ({
  name,
  mode: palette.mode,
  palette: {
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    neutralLight: palette.neutral_light,
    neutralDark: palette.neutral_dark,
  },
});

export const themes: Record<string, ThemeDefinition> = {
  neonTeal: buildThemeDefinition(
    "neonTeal",
    (colorPalettes as Record<string, PaletteRecord>).neon_teal,
  ),
  cozyCabin: buildThemeDefinition(
    "cozyCabin",
    (colorPalettes as Record<string, PaletteRecord>).cozy_cabin,
  ),
};

export const defaultTheme = themes.cozyCabin;

export const getThemePalette = (themeName: string): ThemePalette => {
  return themes[themeName]?.palette ?? defaultTheme.palette;
};

export const getThemeMode = (themeName: string): ThemeMode => {
  return themes[themeName]?.mode ?? defaultTheme.mode;
};
