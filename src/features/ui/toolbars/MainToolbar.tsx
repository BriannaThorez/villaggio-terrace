import { useSimulationStore } from "../../../shared/utils/store";
import {
  Menu01Icon,
  FlashIcon,
  Settings01Icon,
  Wifi01Icon,
  Edit01Icon,
  ViewIcon,
  CheckmarkCircle01Icon,
  Download01Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  KeyboardIcon,
} from "hugeicons-react";
import { Droplet, Map, DollarSign } from "lucide-react";
import { SmartTooltip } from "../../../shared/components/SmartTooltip";
import { generateSVG } from "../../../shared/utils/svgExport";
import React, { useState, createElement } from "react";
type PaletteSwatch = {
  neutral_light: string;
  neutral_dark: string;
  primary: string;
  secondary: string;
  accent: string;
};

import themes from "../themes/palettes/color_palettes.json";
const paletteEntries = themes as Record<string, PaletteSwatch>;

const GUI_SPACING_SCALE = 0.85;
const HEADER_VERTICAL_SCALE = 0.9;

const GUI_SPACING_REM = 0.375 * GUI_SPACING_SCALE;
const GUI_CONTAINER_PADDING_REM = GUI_SPACING_REM * 2;
const GUI_BUTTON_PADDING_REM = 0.44 * GUI_SPACING_SCALE;
const RESOURCE_ICON_NUMBER_GAP_REM = 0.25 * GUI_SPACING_SCALE;
const RESOURCE_HORIZONTAL_PADDING_REM = 0.55 * GUI_SPACING_SCALE;
const RESOURCE_VERTICAL_PADDING_REM = 0.22 * GUI_SPACING_SCALE;
const RESOURCE_CONTAINER_GAP_REM = 0.15 * GUI_SPACING_SCALE;
const MONEY_BUTTON_PADDING_REM = 0.45 * GUI_SPACING_SCALE;
const MONEY_BUTTON_GAP_REM = 0.45 * GUI_SPACING_SCALE;
const GUI_ICON_SIZE = 28;
const GUI_ICON_STROKE = 1.5;
const THEME_MAIN_TOOLBAR_PADDING = "var(--theme-main-toolbar-padding)";
const THEME_MAIN_TOOLBAR_GAP = "var(--theme-main-toolbar-gap)";
const THEME_MAIN_TOOLBAR_RADIUS = "var(--theme-main-toolbar-radius)";
const THEME_MAIN_TOOLBAR_BUTTON_RADIUS =
  "var(--theme-main-toolbar-button-radius)";
const THEME_MAIN_TOOLBAR_BUTTON_PADDING_X =
  "var(--theme-main-toolbar-button-padding-x)";
const THEME_MAIN_TOOLBAR_BUTTON_PADDING_Y =
  "var(--theme-main-toolbar-button-padding-y)";
const THEME_MAIN_TOOLBAR_BUTTON_STROKE_WIDTH =
  "var(--theme-main-toolbar-button-stroke-width)";
const THEME_MAIN_TOOLBAR_BUTTON_SHADOW =
  "var(--theme-main-toolbar-button-shadow)";
const THEME_MAIN_TOOLBAR_BUTTON_ACTIVE_SCALE =
  "var(--theme-main-toolbar-button-active-scale)";
const THEME_MAIN_TOOLBAR_BUTTON_IDLE_OPACITY =
  "var(--theme-main-toolbar-button-idle-opacity)";
const THEME_MAIN_TOOLBAR_BUTTON_ACTIVE_BACKGROUND =
  "var(--theme-main-toolbar-button-active-background)";
const THEME_MAIN_TOOLBAR_BUTTON_ACTIVE_FOREGROUND =
  "var(--theme-main-toolbar-button-active-foreground)";
const THEME_MAIN_TOOLBAR_BUTTON_IDLE_FOREGROUND =
  "var(--theme-main-toolbar-button-idle-foreground)";
const THEME_MAIN_TOOLBAR_BUTTON_HOVER_BACKGROUND =
  "var(--theme-main-toolbar-button-hover-background)";
const THEME_MAIN_TOOLBAR_BUTTON_HOVER_FOREGROUND =
  "var(--theme-main-toolbar-button-hover-foreground)";
const THEME_MAIN_TOOLBAR_SEPARATOR_WIDTH =
  "var(--theme-main-toolbar-separator-width)";
const THEME_MAIN_TOOLBAR_SEPARATOR_HEIGHT =
  "var(--theme-main-toolbar-separator-height)";
const THEME_MAIN_TOOLBAR_SEPARATOR_COLOR =
  "var(--theme-main-toolbar-separator-color)";
const THEME_MAIN_TOOLBAR_SEPARATOR_OPACITY =
  "var(--theme-main-toolbar-separator-opacity)";
const THEME_MAIN_TOOLBAR_RESOURCE_GAP =
  "var(--theme-main-toolbar-resource-gap)";
const THEME_MAIN_TOOLBAR_RESOURCE_PADDING_X =
  "var(--theme-main-toolbar-resource-padding-x)";
const THEME_MAIN_TOOLBAR_RESOURCE_PADDING_Y =
  "var(--theme-main-toolbar-resource-padding-y)";
const THEME_MAIN_TOOLBAR_RESOURCE_ICON_SIZE =
  "var(--theme-main-toolbar-resource-icon-size)";
const THEME_MAIN_TOOLBAR_RESOURCE_TEXT_SIZE =
  "var(--theme-main-toolbar-resource-text-size)";
const THEME_MAIN_TOOLBAR_MONEY_PADDING_X =
  "var(--theme-main-toolbar-money-padding-x)";
const THEME_MAIN_TOOLBAR_MONEY_PADDING_Y =
  "var(--theme-main-toolbar-money-padding-y)";
const THEME_MAIN_TOOLBAR_MONEY_GAP = "var(--theme-main-toolbar-money-gap)";
const THEME_MAIN_TOOLBAR_MONEY_ICON_SIZE =
  "var(--theme-main-toolbar-money-icon-size)";
const THEME_MAIN_TOOLBAR_MONEY_RADIUS =
  "var(--theme-main-toolbar-money-radius)";
const THEME_MAIN_TOOLBAR_MONEY_BORDER =
  "var(--theme-main-toolbar-money-border)";
const THEME_MAIN_TOOLBAR_MONEY_SHADOW =
  "var(--theme-main-toolbar-money-shadow)";
const THEME_MAIN_TOOLBAR_MONEY_BACKGROUND =
  "var(--theme-main-toolbar-money-background)";
const THEME_MAIN_TOOLBAR_MONEY_FOREGROUND =
  "var(--theme-main-toolbar-money-foreground)";
const THEME_MAIN_TOOLBAR_MONEY_HOVER_SCALE =
  "var(--theme-main-toolbar-money-hover-scale)";
const THEME_MAIN_TOOLBAR_MENU_PADDING =
  "var(--theme-main-toolbar-menu-padding)";
const THEME_MAIN_TOOLBAR_MENU_MIN_WIDTH =
  "var(--theme-main-toolbar-menu-min-width)";
const THEME_MAIN_TOOLBAR_MENU_RADIUS = "var(--theme-main-toolbar-menu-radius)";
const THEME_MAIN_TOOLBAR_MENU_BACKGROUND =
  "var(--theme-main-toolbar-menu-background)";
const THEME_MAIN_TOOLBAR_MENU_BORDER = "var(--theme-main-toolbar-menu-border)";
const THEME_MAIN_TOOLBAR_MENU_SHADOW = "var(--theme-main-toolbar-menu-shadow)";
const THEME_MAIN_TOOLBAR_MENU_BACKDROP =
  "var(--theme-main-toolbar-menu-backdrop)";
const THEME_MAIN_TOOLBAR_MENU_Z_INDEX =
  "var(--theme-main-toolbar-menu-z-index)";
const THEME_MAIN_TOOLBAR_MENU_POSITION_OFFSET =
  "var(--theme-main-toolbar-menu-position-offset)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_PADDING_X =
  "var(--theme-main-toolbar-menu-header-padding-x)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_PADDING_Y =
  "var(--theme-main-toolbar-menu-header-padding-y)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_MARGIN_BOTTOM =
  "var(--theme-main-toolbar-menu-header-margin-bottom)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_BORDER_BOTTOM =
  "var(--theme-main-toolbar-menu-header-border-bottom)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_TEXT_SIZE =
  "var(--theme-main-toolbar-menu-header-text-size)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_FONT_FAMILY =
  "var(--theme-main-toolbar-menu-header-font-family)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_FONT_WEIGHT =
  "var(--theme-main-toolbar-menu-header-font-weight)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_TEXT_TRANSFORM =
  "var(--theme-main-toolbar-menu-header-text-transform)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_TRACKING =
  "var(--theme-main-toolbar-menu-header-tracking)";
const THEME_MAIN_TOOLBAR_MENU_HEADER_FOREGROUND =
  "var(--theme-main-toolbar-menu-header-foreground)";
const THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_X =
  "var(--theme-main-toolbar-menu-row-padding-x)";
const THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_Y =
  "var(--theme-main-toolbar-menu-row-padding-y)";
const THEME_MAIN_TOOLBAR_MENU_ROW_GAP =
  "var(--theme-main-toolbar-menu-row-gap)";
const THEME_MAIN_TOOLBAR_MENU_ROW_RADIUS =
  "var(--theme-main-toolbar-menu-row-radius)";
const THEME_MAIN_TOOLBAR_MENU_ROW_TEXT_SIZE =
  "var(--theme-main-toolbar-menu-row-text-size)";
const THEME_MAIN_TOOLBAR_MENU_ROW_FONT_WEIGHT =
  "var(--theme-main-toolbar-menu-row-font-weight)";
const THEME_MAIN_TOOLBAR_MENU_ROW_TRANSITION =
  "var(--theme-main-toolbar-menu-row-transition)";
const THEME_MAIN_TOOLBAR_MENU_ROW_IDLE_FOREGROUND =
  "var(--theme-main-toolbar-menu-row-idle-foreground)";
const THEME_MAIN_TOOLBAR_MENU_ROW_IDLE_BACKGROUND =
  "var(--theme-main-toolbar-menu-row-idle-background)";
const THEME_MAIN_TOOLBAR_MENU_ROW_HOVER_FOREGROUND =
  "var(--theme-main-toolbar-menu-row-hover-foreground)";
const THEME_MAIN_TOOLBAR_MENU_ROW_HOVER_BACKGROUND =
  "var(--theme-main-toolbar-menu-row-hover-background)";
const THEME_MAIN_TOOLBAR_MENU_ROW_ACTIVE_FOREGROUND =
  "var(--theme-main-toolbar-menu-row-active-foreground)";
const THEME_MAIN_TOOLBAR_MENU_ROW_ACTIVE_BACKGROUND =
  "var(--theme-main-toolbar-menu-row-active-background)";
const THEME_MAIN_TOOLBAR_MENU_ROW_ICON_SIZE =
  "var(--theme-main-toolbar-menu-row-icon-size)";
const THEME_MAIN_TOOLBAR_MENU_ROW_ICON_STROKE_WIDTH =
  "var(--theme-main-toolbar-menu-row-icon-stroke-width)";
const THEME_MAIN_TOOLBAR_MENU_CHECK_ICON_SIZE =
  "var(--theme-main-toolbar-menu-check-icon-size)";
const THEME_MAIN_TOOLBAR_MENU_CHECK_ICON_FOREGROUND =
  "var(--theme-main-toolbar-menu-check-icon-foreground)";
const HEADER_VERTICAL_GAP_REM = 1.5;
const HEADER_PADDING_BOTTOM_REM = 0.5;

const toolbarButtonClass =
  "transition-all duration-300 flex items-center justify-center";
const toolbarButtonStyle = {
  padding: `${GUI_BUTTON_PADDING_REM}rem`,
  borderRadius: THEME_MAIN_TOOLBAR_BUTTON_RADIUS,
  boxShadow: THEME_MAIN_TOOLBAR_BUTTON_SHADOW,
};
const activeButtonClasses =
  "bg-primary text-background shadow-[0_0_15px_var(--primary)] scale-110";
const idleButtonClasses = "text-text/40 hover:text-primary hover:bg-primary/5";

const separatorStyle = {
  width: "1px",
  height: `${32 * GUI_SPACING_SCALE}px`,
  backgroundColor: "var(--text)",
  opacity: 0.2,
};

const resourceBadgeStyle = {
  gap: THEME_MAIN_TOOLBAR_RESOURCE_GAP,
  padding: `${THEME_MAIN_TOOLBAR_RESOURCE_PADDING_Y} ${THEME_MAIN_TOOLBAR_RESOURCE_PADDING_X}`,
};

const moneyIndicatorButtonStyle = {
  padding: `${THEME_MAIN_TOOLBAR_MONEY_PADDING_Y} ${THEME_MAIN_TOOLBAR_MONEY_PADDING_X}`,
  gap: THEME_MAIN_TOOLBAR_MONEY_GAP,
  borderRadius: THEME_MAIN_TOOLBAR_MONEY_RADIUS,
  border: THEME_MAIN_TOOLBAR_MONEY_BORDER,
  boxShadow: THEME_MAIN_TOOLBAR_MONEY_SHADOW,
  background: THEME_MAIN_TOOLBAR_MONEY_BACKGROUND,
  color: THEME_MAIN_TOOLBAR_MONEY_FOREGROUND,
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const formatMoneyDisplay = (value: number) => moneyFormatter.format(value);

export const MainToolbar = () => {
  const themeName = useSimulationStore((state) => state.themeName);
  const setThemeName = useSimulationStore((state) => state.setThemeName);
  const resources = useSimulationStore((state) => state.resources);
  const spendableMoney = useSimulationStore((state) => state.spendableMoney);
  const undo = useSimulationStore((state) => state.undo);
  const redo = useSimulationStore((state) => state.redo);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);

  const showControls = useSimulationStore((state) => state.showControls);
  const setShowControls = useSimulationStore((state) => state.setShowControls);
  const showWeatherPanel = useSimulationStore(
    (state) => state.showWeatherPanel,
  );
  const setShowWeatherPanel = useSimulationStore(
    (state) => state.setShowWeatherPanel,
  );
  const showPlacementGrid = useSimulationStore(
    (state) => state.showPlacementGrid,
  );
  const setShowPlacementGrid = useSimulationStore(
    (state) => state.setShowPlacementGrid,
  );

  const showMinimap = useSimulationStore((state) => state.showMinimap);
  const setShowMinimap = useSimulationStore((state) => state.setShowMinimap);

  const handleExport = () => {
    const state = useSimulationStore.getState();
    const shapes = state.shapes;
    const links = state.links;

    if (shapes.length === 0) return;

    const currentTheme = themes[themeName as keyof typeof themes];
    const svg = generateSVG(shapes, links, currentTheme, themeName);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation-export-${new Date().getTime()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formattedSpendableMoney = formatMoneyDisplay(spendableMoney);
  const moneyIndicator = (
    <SmartTooltip content="Spendable Money">
      <button
        type="button"
        className="inline-flex items-center justify-center text-[0.75rem] font-semibold transition-all"
        style={moneyIndicatorButtonStyle}
      >
        <DollarSign size={18} strokeWidth={1.5} />
        <span className="whitespace-nowrap">{formattedSpendableMoney}</span>
      </button>
    </SmartTooltip>
  );

  const iconButton = (
    onClick: () => void,
    icon: React.ComponentType<any>,
    tooltip: string,
    description: string,
    isActive?: boolean,
  ) => (
    <SmartTooltip content={tooltip} description={description} position="top">
      <button
        onClick={onClick}
        className={`${toolbarButtonClass} ${
          isActive ? activeButtonClasses : idleButtonClasses
        }`}
        style={toolbarButtonStyle}
      >
        {createElement(icon, {
          size: GUI_ICON_SIZE,
          strokeWidth: GUI_ICON_STROKE,
        })}
      </button>
    </SmartTooltip>
  );

  const menuButton = (
    <div className="relative">
      <SmartTooltip content="Open Menu">
        <button
          onClick={() => setShowMainMenu(!showMainMenu)}
          className={`${toolbarButtonClass} ${
            showMainMenu
              ? "bg-primary/20 text-primary"
              : "text-text/60 hover:bg-primary/10 hover:text-primary"
          }`}
          style={toolbarButtonStyle}
        >
          <Menu01Icon size={GUI_ICON_SIZE} />
        </button>
      </SmartTooltip>

      {showMainMenu && (
        <div
          onMouseLeave={() => setShowMainMenu(false)}
          className="absolute flex flex-col bg-white border border-black/10 rounded-[1.5rem] shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-2xl"
          style={{
            insetBlockStart: "var(--theme-main-toolbar-menu-position-offset)",
            insetInlineStart: 0,
            padding: "0.375rem",
            minWidth: "180px",
            zIndex: THEME_MAIN_TOOLBAR_MENU_Z_INDEX as any,
            gap: "0.25rem",
          }}
        >
          <div
            style={{
              padding: `${THEME_MAIN_TOOLBAR_MENU_HEADER_PADDING_Y} ${THEME_MAIN_TOOLBAR_MENU_HEADER_PADDING_X}`,
              marginBottom: THEME_MAIN_TOOLBAR_MENU_HEADER_MARGIN_BOTTOM,
              borderBottom: THEME_MAIN_TOOLBAR_MENU_HEADER_BORDER_BOTTOM,
            }}
          >
            <span
              style={{
                fontSize: THEME_MAIN_TOOLBAR_MENU_HEADER_TEXT_SIZE,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: THEME_MAIN_TOOLBAR_MENU_HEADER_TRACKING,
                color: "var(--theme-main-toolbar-menu-header-foreground)",
              }}
            >
              Settings & HUD
            </span>
          </div>

          <button
            onClick={() => setShowControls(!showControls)}
            className="flex items-center justify-between"
            style={{
              padding: `${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_Y} ${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_X}`,
              gap: THEME_MAIN_TOOLBAR_MENU_ROW_GAP,
              borderRadius: THEME_MAIN_TOOLBAR_MENU_ROW_RADIUS,
              fontSize: THEME_MAIN_TOOLBAR_MENU_ROW_TEXT_SIZE,
              fontWeight: THEME_MAIN_TOOLBAR_MENU_ROW_FONT_WEIGHT as any,
              transitionProperty: THEME_MAIN_TOOLBAR_MENU_ROW_TRANSITION,
              color: showControls
                ? "var(--theme-main-toolbar-menu-row-active-foreground)"
                : "var(--theme-main-toolbar-menu-row-idle-foreground)",
              background: showControls
                ? "var(--theme-main-toolbar-menu-row-active-background)"
                : "var(--theme-main-toolbar-menu-row-idle-background)",
            }}
          >
            <div className="flex items-center gap-2">
              <KeyboardIcon size={14} />
              <span>Show Control Hints</span>
            </div>
            {showControls && (
              <CheckmarkCircle01Icon size={14} className="text-primary" />
            )}
          </button>

          <button
            onClick={() => setShowWeatherPanel(!showWeatherPanel)}
            className="flex items-center justify-between"
            style={{
              padding: `${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_Y} ${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_X}`,
              gap: THEME_MAIN_TOOLBAR_MENU_ROW_GAP,
              borderRadius: THEME_MAIN_TOOLBAR_MENU_ROW_RADIUS,
              fontSize: THEME_MAIN_TOOLBAR_MENU_ROW_TEXT_SIZE,
              fontWeight: THEME_MAIN_TOOLBAR_MENU_ROW_FONT_WEIGHT as any,
              transitionProperty: THEME_MAIN_TOOLBAR_MENU_ROW_TRANSITION,
              color: showWeatherPanel
                ? "var(--theme-main-toolbar-menu-row-active-foreground)"
                : "var(--theme-main-toolbar-menu-row-idle-foreground)",
              background: showWeatherPanel
                ? "var(--theme-main-toolbar-menu-row-active-background)"
                : "var(--theme-main-toolbar-menu-row-idle-background)",
            }}
          >
            <div className="flex items-center gap-2">
              <FlashIcon size={14} />
              <span>Atmosphere Controls</span>
            </div>
            {showWeatherPanel && (
              <CheckmarkCircle01Icon size={14} className="text-primary" />
            )}
          </button>

          <button
            onClick={() => setShowPlacementGrid(!showPlacementGrid)}
            className="flex items-center justify-between"
            style={{
              padding: `${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_Y} ${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_X}`,
              gap: THEME_MAIN_TOOLBAR_MENU_ROW_GAP,
              borderRadius: THEME_MAIN_TOOLBAR_MENU_ROW_RADIUS,
              fontSize: THEME_MAIN_TOOLBAR_MENU_ROW_TEXT_SIZE,
              fontWeight: THEME_MAIN_TOOLBAR_MENU_ROW_FONT_WEIGHT as any,
              transitionProperty: THEME_MAIN_TOOLBAR_MENU_ROW_TRANSITION,
              color: showPlacementGrid
                ? "var(--theme-main-toolbar-menu-row-active-foreground)"
                : "var(--theme-main-toolbar-menu-row-idle-foreground)",
              background: showPlacementGrid
                ? "var(--theme-main-toolbar-menu-row-active-background)"
                : "var(--theme-main-toolbar-menu-row-idle-background)",
            }}
          >
            <div className="flex items-center gap-2">
              <ViewIcon size={14} />
              <span>Object Placement Debug</span>
            </div>
            {showPlacementGrid && (
              <CheckmarkCircle01Icon size={14} className="text-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className="flex items-center justify-between"
            style={{
              padding: `${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_Y} ${THEME_MAIN_TOOLBAR_MENU_ROW_PADDING_X}`,
              gap: THEME_MAIN_TOOLBAR_MENU_ROW_GAP,
              borderRadius: THEME_MAIN_TOOLBAR_MENU_ROW_RADIUS,
              fontSize: THEME_MAIN_TOOLBAR_MENU_ROW_TEXT_SIZE,
              fontWeight: THEME_MAIN_TOOLBAR_MENU_ROW_FONT_WEIGHT as any,
              transitionProperty: THEME_MAIN_TOOLBAR_MENU_ROW_TRANSITION,
              color: showMinimap
                ? "var(--theme-main-toolbar-menu-row-active-foreground)"
                : "var(--theme-main-toolbar-menu-row-idle-foreground)",
              background: showMinimap
                ? "var(--theme-main-toolbar-menu-row-active-background)"
                : "var(--theme-main-toolbar-menu-row-idle-background)",
            }}
          >
            <div className="flex items-center gap-2">
              <Map size={14} />
              <span>Diagnostic Minimap</span>
            </div>
            {showMinimap && (
              <CheckmarkCircle01Icon size={14} className="text-primary" />
            )}
          </button>
        </div>
      )}
    </div>
  );

  const resourceBadge = (
    label: string,
    Icon: React.ComponentType<any>,
    value: number,
    iconColor: string,
  ) => (
    <SmartTooltip content={label}>
      <div
        className="flex items-center text-sm font-medium text-text/80"
        style={{
          gap: `${RESOURCE_ICON_NUMBER_GAP_REM}rem`,
          padding: `${RESOURCE_VERTICAL_PADDING_REM}rem ${RESOURCE_HORIZONTAL_PADDING_REM}rem`,
        }}
      >
        <Icon
          size={20}
          strokeWidth={1.25}
          className={!iconColor.startsWith("#") ? iconColor : undefined}
          style={{
            ...(iconColor.startsWith("#") ? { color: iconColor } : {}),
            flexShrink: 0,
          }}
        />
        <span className="whitespace-nowrap">{value}</span>
      </div>
    </SmartTooltip>
  );

  return (
    <div className="absolute top-4 left-4 z-[60]">
      <div
        className="pointer-events-auto relative inline-flex items-center bg-white border border-black/10 rounded-[1.5rem] shadow-[0_16px_40px_rgba(0,0,0,0.16)] overflow-visible"
        style={{
          padding: "0.75rem",
          gap: "0.375rem",
          backdropFilter: "blur(14px)",
        }}
      >
        {menuButton}
        {moneyIndicator}
        <div style={separatorStyle} />

        {/* Resource Indicators Group with 50% spacing adjustment and equal alignment */}
        <div
          className="flex items-center"
          style={{ gap: `${RESOURCE_CONTAINER_GAP_REM}rem` }}
        >
          {resourceBadge(
            "Power",
            FlashIcon,
            resources.power,
            "text-yellow-400",
          )}
          {resourceBadge("Water", Droplet, resources.water, "text-blue-400")}
          {resourceBadge("Internet", Wifi01Icon, resources.internet, "#FF5F1F")}
        </div>

        <div style={separatorStyle} />
        {iconButton(
          undo,
          ArrowTurnBackwardIcon,
          "Undo",
          "Revert the last action.",
        )}
        {iconButton(
          redo,
          ArrowTurnForwardIcon,
          "Redo",
          "Restore the last undone action.",
        )}
        <div style={separatorStyle} />
        <div className="relative">
          <SmartTooltip
            content="Switch Theme"
            description="Choose a color palette for the entire simulation."
            position="top"
          >
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`${toolbarButtonClass} ${
                showThemeMenu
                  ? "bg-primary/10 text-primary"
                  : "text-text/40 hover:text-primary hover:bg-primary/5"
              }`}
              style={toolbarButtonStyle}
            >
              <Settings01Icon
                size={GUI_ICON_SIZE}
                strokeWidth={GUI_ICON_STROKE}
              />
            </button>
          </SmartTooltip>

          {showThemeMenu && (
            <div
              onMouseLeave={() => setShowThemeMenu(false)}
              className="absolute bottom-full mb-2 left-0 bg-background/90 backdrop-blur-2xl border border-primary/10 rounded-xl shadow-2xl flex flex-col gap-1 z-[100]"
              style={{ padding: `${GUI_SPACING_REM}rem`, minWidth: "180px" }}
            >
              <div className="px-2 py-1 border-b border-primary/5 mb-1">
                <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">
                  Select Theme
                </span>
              </div>
              {Object.entries(themes).map(([name, palette]) => (
                <button
                  key={name}
                  onClick={() => {
                    setThemeName(name);
                    setShowThemeMenu(false);
                  }}
                  className={`flex items-center justify-between gap-4 rounded-lg text-xs transition-all ${
                    themeName === name
                      ? "bg-primary/20 text-primary"
                      : "text-text/60 hover:text-text hover:bg-primary/5"
                  }`}
                  style={{
                    padding: `${GUI_SPACING_REM}rem ${GUI_SPACING_REM * 2}rem`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="capitalize">{name.replace("_", " ")}</span>
                    <div className="flex gap-1">
                      {[
                        paletteEntries[name].neutral_light,
                        paletteEntries[name].neutral_dark,
                        paletteEntries[name].primary,
                        paletteEntries[name].secondary,
                        paletteEntries[name].accent,
                      ].map((color, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full border border-white/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  {themeName === name && <CheckmarkCircle01Icon size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {iconButton(
          () => setShowMinimap(!showMinimap),
          Map,
          "Toggle Minimap",
          "Show or hide the diagnostic terrain overview.",
          showMinimap,
        )}

        <div style={separatorStyle} />
        {iconButton(
          handleExport,
          Download01Icon,
          "Export Data",
          "Download the current simulation as a structured JSON file.",
        )}
      </div>
    </div>
  );
};
