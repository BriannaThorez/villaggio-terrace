import {
  useSimulationStore,
} from "../shared/utils/store";
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
} from "hugeicons-react";
import { SmartTooltip } from "../shared/components/SmartTooltip";
import { generateSVG } from "../shared/utils/svgExport";
import React, { useState, createElement } from "react";
import themes from "../shared/themes/color_palettes.json";

const GUI_SPACING_REM = 0.375;
const GUI_CONTAINER_PADDING_REM = GUI_SPACING_REM * 2;
const GUI_BUTTON_PADDING_REM = 0.44;
const GUI_RESOURCE_BADGE_PADDING_REM = GUI_SPACING_REM * 1.5;
const GUI_RESOURCE_GAP_REM = GUI_SPACING_REM;
const GUI_ICON_SIZE = 28;
const GUI_ICON_STROKE = 1.5;

const toolbarButtonClass = "rounded-xl transition-all duration-300 flex items-center justify-center";
const toolbarButtonStyle = { padding: `${GUI_BUTTON_PADDING_REM}rem` };
const activeButtonClasses =
  "bg-primary text-background shadow-[0_0_15px_var(--primary)] scale-110";
const idleButtonClasses = "text-text/40 hover:text-primary hover:bg-primary/5";

const separatorStyle = {
  width: "1px",
  height: "32px",
  backgroundColor: "var(--text)",
  opacity: 0.2,
};

const resourceBadgeStyle = {
  gap: `${GUI_RESOURCE_GAP_REM}rem`,
  padding: `${GUI_RESOURCE_BADGE_PADDING_REM}rem ${GUI_RESOURCE_BADGE_PADDING_REM * 2}rem`,
};

export const MainToolbar = () => {
  const mode = useSimulationStore((state) => state.mode);
  const setMode = useSimulationStore((state) => state.setMode);
  const themeName = useSimulationStore((state) => state.themeName);
  const setThemeName = useSimulationStore((state) => state.setThemeName);
  const resources = useSimulationStore((state) => state.resources);
  const undo = useSimulationStore((state) => state.undo);
  const redo = useSimulationStore((state) => state.redo);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const isStudioMode = mode === "studio";
  const isViewerMode = mode === "viewer";

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

  if (!isStudioMode) {
    return null;
  }

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
    <SmartTooltip content="Open menu">
      <button
        className={`${toolbarButtonClass} text-text/60 hover:bg-primary/10 hover:text-primary`}
        style={toolbarButtonStyle}
      >
        <Menu01Icon size={GUI_ICON_SIZE} />
      </button>
    </SmartTooltip>
  );

  const resourceBadge = (
    label: string,
    Icon: typeof FlashIcon,
    value: number,
    iconColor: string,
  ) => (
    <SmartTooltip content={label}>
      <div className="flex items-center text-sm font-medium text-text/80" style={resourceBadgeStyle}>
        {value}
        <Icon size={GUI_ICON_SIZE} strokeWidth={GUI_ICON_STROKE} className={iconColor} />
      </div>
    </SmartTooltip>
  );

  return (
    <div className="absolute top-4 left-4 z-50">
      <div
        className="inline-flex items-center rounded-2xl border border-text/10 bg-background/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        style={{
          padding: `${GUI_CONTAINER_PADDING_REM}rem`,
          gap: `${GUI_SPACING_REM}rem`,
        }}
      >
        {menuButton}
        <div style={separatorStyle} />
        {resourceBadge("Power", FlashIcon, resources.power, "text-yellow-400")}
        {resourceBadge("Water", Settings01Icon, resources.water, "text-blue-400")}
        {resourceBadge("Internet", Wifi01Icon, resources.internet, "text-green-400")}
        <div style={separatorStyle} />
        {iconButton(
          () => setMode("studio"),
          Edit01Icon,
          "Studio Mode",
          "Full creative control. Create, edit, and link nodes.",
          isStudioMode,
        )}
        {iconButton(undo, ArrowTurnBackwardIcon, "Undo", "Revert the last action.")}
        {iconButton(redo, ArrowTurnForwardIcon, "Redo", "Restore the last undone action.")}
        {iconButton(
          () => setMode("viewer"),
          ViewIcon,
          "Viewer Mode",
          "Clean presentation mode. All editing tools are hidden.",
          isViewerMode,
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
              <Settings01Icon size={GUI_ICON_SIZE} strokeWidth={GUI_ICON_STROKE} />
            </button>
          </SmartTooltip>

          {showThemeMenu && (
            <div
              onMouseLeave={() => setShowThemeMenu(false)}
              className="absolute bottom-full mb-2 left-0 bg-background/90 backdrop-blur-2xl border border-primary/10 rounded-xl shadow-2xl flex flex-col gap-1 z-[100]"
              style={{ padding: `${GUI_SPACING_REM}rem`, minWidth: "160px" }}
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
                  style={{ padding: `${GUI_SPACING_REM}rem ${GUI_SPACING_REM * 2}rem` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="capitalize">{name.replace("_", " ")}</span>
                    <div className="flex gap-1">
                      {[
                        palette.neutral_light,
                        palette.neutral_dark,
                        palette.primary,
                        palette.secondary,
                        palette.accent,
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
          handleExport,
          Download01Icon,
          "Export Data",
          "Download the current simulation as a structured JSON file.",
        )}
      </div>
    </div>
  );
};
