import { useSimulationStore } from "../../../shared/utils/store";
import { audioEngine } from "../../audio-engine/AudioEngine";
import {
  Menu01Icon,
  FlashIcon,
  Settings01Icon,
  Wifi01Icon,
  Edit01Icon,
  ViewIcon,
  CheckmarkCircle01Icon,
  KeyboardIcon,
  PlayIcon,
  PauseIcon,
  Forward02Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
} from "hugeicons-react";
import { Droplet, Map, DollarSign, Zap, Rocket } from "lucide-react";
import { SmartTooltip } from "../../../shared/components/SmartTooltip";
import React, { useState, createElement, useEffect } from "react";
import themes from "../themes/palettes/color_palettes.json";
import { useFinanceStore } from "../../finance/store/financeStore";
import { useTenancyStore } from "../../tenancy/store/tenancyStore";
import { useTimeStore } from "../../time/store/timeStore";
import { SettingsPanel } from "../../settings/ui/SettingsPanel";

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
const HEADER_VERTICAL_GAP_REM = 1.5;
const HEADER_PADDING_BOTTOM_REM = 0.5;

const toolbarButtonClass =
  "rounded-xl transition-all duration-300 flex items-center justify-center";
const toolbarButtonStyle = { padding: `${GUI_BUTTON_PADDING_REM}rem` };
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
  gap: `${RESOURCE_ICON_NUMBER_GAP_REM}rem`,
  padding: `${RESOURCE_VERTICAL_PADDING_REM}rem ${RESOURCE_HORIZONTAL_PADDING_REM}rem`,
};

const moneyIndicatorButtonStyle = {
  padding: `${MONEY_BUTTON_PADDING_REM}rem ${MONEY_BUTTON_PADDING_REM * 2}rem`,
  gap: `${MONEY_BUTTON_GAP_REM}rem`,
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const formatMoneyDisplay = (value: number) => moneyFormatter.format(value);

export const MainToolbar = () => {
  const themeName = useSimulationStore((state) => state.themeName);
  const setThemeName = useSimulationStore((state) => state.setThemeName);
  const shapes = useSimulationStore((state) => state.shapes);
  const spendableMoney = useSimulationStore((state) => state.spendableMoney);
  const undo = useSimulationStore((state) => state.undo);
  const redo = useSimulationStore((state) => state.redo);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const { resourceUsage, resourceCapacity, updateBalances } = useFinanceStore();
  const occupants = useTenancyStore(state => state.occupants);

  const { sunTime, dayOfWeek, gameSpeed, setGameSpeed } = useTimeStore();

  useEffect(() => {
    updateBalances();
  }, [shapes, occupants, updateBalances]);

  const showControls = useSimulationStore((state) => state.showControls);
  const setShowControls = useSimulationStore((state) => state.setShowControls);
  const showWeather = useSimulationStore((state) => state.showWeather);
  const setShowWeather = useSimulationStore((state) => state.setShowWeather);
  const showPlacementGrid = useSimulationStore(
    (state) => state.showPlacementGrid,
  );
  const setShowPlacementGrid = useSimulationStore(
    (state) => state.setShowPlacementGrid,
  );

  const showMinimap = useSimulationStore((state) => state.showMinimap);
  const setShowMinimap = useSimulationStore((state) => state.setShowMinimap);
  const showWeatherPanel = useSimulationStore(
    (state) => state.showWeatherPanel,
  );
  const setShowWeatherPanel = useSimulationStore(
    (state) => state.setShowWeatherPanel,
  );

  const formattedSpendableMoney = formatMoneyDisplay(spendableMoney);
  const moneyIndicator = (
    <SmartTooltip content="Spendable Money">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-[0.75rem] font-semibold text-primary shadow-[0_10px_30px_rgba(37,99,235,0.35)] transition-all hover:scale-[1.02]"
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
        onClick={() => {
          audioEngine.triggerUIClick();
          onClick();
        }}
        className={`${toolbarButtonClass} ${isActive ? activeButtonClasses : idleButtonClasses
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
          onClick={() => {
            audioEngine.triggerUIClick();
            setShowMainMenu(!showMainMenu);
          }}
          className={`${toolbarButtonClass} ${showMainMenu
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
          className="absolute top-full mt-2 left-0 bg-background/90 backdrop-blur-2xl border border-primary/10 rounded-xl shadow-2xl flex flex-col gap-1 z-[100]"
          style={{ padding: `${GUI_SPACING_REM}rem`, minWidth: "180px" }}
        >
          <div className="px-2 py-1 border-b border-primary/5 mb-1">
            <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">
              Settings & HUD
            </span>
          </div>

          <button
            onClick={() => setShowControls(!showControls)}
            className={`flex items-center justify-between gap-4 rounded-lg text-xs transition-all ${showControls
              ? "bg-primary/20 text-text"
              : "text-text/60 hover:text-text hover:bg-primary/5"
              }`}
            style={{
              padding: `${GUI_SPACING_REM}rem ${GUI_SPACING_REM * 2}rem`,
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
            className={`flex items-center justify-between gap-4 rounded-lg text-xs transition-all ${showWeatherPanel
              ? "bg-primary/20 text-text"
              : "text-text/60 hover:text-text hover:bg-primary/5"
              }`}
            style={{
              padding: `${GUI_SPACING_REM}rem ${GUI_SPACING_REM * 2}rem`,
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
            className={`flex items-center justify-between gap-4 rounded-lg text-xs transition-all ${showPlacementGrid
              ? "bg-primary/20 text-emerald-400"
              : "text-text/60 hover:text-text hover:bg-primary/5"
              }`}
            style={{
              padding: `${GUI_SPACING_REM}rem ${GUI_SPACING_REM * 2}rem`,
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
            className={`flex items-center justify-between gap-4 rounded-lg text-xs transition-all ${showMinimap
              ? "bg-primary/20 text-text"
              : "text-text/60 hover:text-text hover:bg-primary/5"
              }`}
            style={{
              padding: `${GUI_SPACING_REM}rem ${GUI_SPACING_REM * 2}rem`,
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
          {/* --- Settings separator & entry --- */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
          <button
            onClick={() => {
              setShowSettingsPanel(true);
              setShowMainMenu(false);
            }}
            className="flex items-center gap-2 rounded-lg text-xs transition-all text-text/60 hover:text-text hover:bg-primary/5"
            style={{
              padding: `${GUI_SPACING_REM}rem ${GUI_SPACING_REM * 2}rem`,
            }}
          >
            <Settings01Icon size={14} />
            <span>Performance Settings</span>
          </button>
        </div>
      )}
    </div>
  );

  const resourceBadge = (
    label: string,
    Icon: React.ComponentType<any>,
    value: string | number,
    iconColor: string,
  ) => (
    <SmartTooltip content={label}>
      <div
        className="flex items-center text-sm font-medium text-text/80"
        style={resourceBadgeStyle}
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
        <span className="whitespace-nowrap font-mono">{value}</span>
      </div>
    </SmartTooltip>
  );

  return (
    <div className="absolute top-4 left-4 z-[60]">
      <SettingsPanel isOpen={showSettingsPanel} onClose={() => setShowSettingsPanel(false)} />

      <div
        className="inline-flex items-center rounded-2xl border border-text/10 bg-background/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        style={{
          padding: `${GUI_CONTAINER_PADDING_REM}rem`,
          gap: `${GUI_SPACING_REM}rem`,
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
            `${resourceUsage.power}/${resourceCapacity.power}`,
            "text-yellow-400",
          )}
          {resourceBadge(
            "Water",
            Droplet,
            `${resourceUsage.water}/${resourceCapacity.water}`,
            "text-blue-400"
          )}
          {resourceBadge(
            "Internet",
            Wifi01Icon,
            `${resourceUsage.internet}/${resourceCapacity.internet}`,
            "#FF5F1F"
          )}
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
              onClick={() => {
                audioEngine.triggerUIClick();
                setShowThemeMenu(!showThemeMenu);
              }}
              className={`${toolbarButtonClass} ${showThemeMenu
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
                  className={`flex items-center justify-between gap-4 rounded-lg text-xs transition-all ${themeName === name
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
          () => setShowMinimap(!showMinimap),
          Map,
          "Toggle Minimap",
          "Show or hide the diagnostic terrain overview.",
          showMinimap,
        )}

        {/* Time Control Module */}
        <div style={separatorStyle} />

        <div className="flex items-center gap-4 px-3 py-1 bg-white/5 rounded-xl border border-white/5 ml-1">
          {/* Speed Controls */}
          <div className="flex items-center gap-1">
            <SmartTooltip content="Pause" description="Halt time progression." position="top">
              <button
                onClick={() => setGameSpeed(0)}
                className={`p-1.5 rounded-lg transition-all ${gameSpeed === 0 ? 'bg-primary text-background' : 'text-text/40 hover:text-text hover:bg-white/10'}`}
              >
                <PauseIcon size={18} />
              </button>
            </SmartTooltip>
            <SmartTooltip content="Normal (1x)" description="10m in-game is 1 real-world second. A day takes 2m 24s" position="top">
              <button
                onClick={() => setGameSpeed(1)}
                className={`p-1.5 rounded-lg transition-all ${gameSpeed === 1 ? 'bg-primary text-background' : 'text-text/40 hover:text-text hover:bg-white/10'}`}
              >
                <PlayIcon size={18} />
              </button>
            </SmartTooltip>
            <SmartTooltip content="Fast (2x)" description="20m in-game is 1 real-world second. A day takes 1m 12s" position="top">
              <button
                onClick={() => setGameSpeed(2)}
                className={`p-1.5 rounded-lg transition-all ${gameSpeed === 2 ? 'bg-primary text-background' : 'text-text/40 hover:text-text hover:bg-white/10'}`}
              >
                <Forward02Icon size={18} />
              </button>
            </SmartTooltip>
            <SmartTooltip content="Faster (5x)" description="50m in-game is 1 real-world second. A day takes ~29s" position="top">
              <button
                onClick={() => setGameSpeed(5)}
                className={`p-1.5 rounded-lg transition-all ${gameSpeed === 5 ? 'bg-primary text-background' : 'text-text/40 hover:text-text hover:bg-white/10'}`}
              >
                <div className="flex -space-x-1"><Forward02Icon size={18} /><Forward02Icon size={18} /></div>
              </button>
            </SmartTooltip>
            <SmartTooltip content="Super (10x)" description="100 in-game minutes = 1 real-world second. (A full 24h day takes ~14s)" position="top">
              <button
                onClick={() => {
                  audioEngine.triggerUIClick();
                  setGameSpeed(10);
                }}
                className={`p-1.5 rounded-lg transition-all ${gameSpeed === 10 ? 'bg-primary text-background' : 'text-text/40 hover:text-text hover:bg-white/10'}`}
              >
                <Rocket size={16} />
              </button>
            </SmartTooltip>
          </div>

          <div style={{ ...separatorStyle, height: '16px' }} />

          {/* Weekday Indicator */}
          <div className="flex gap-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <span
                key={i}
                className={`text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-sm transition-all ${dayOfWeek === i + 1 ? 'bg-primary text-background' : 'bg-white/10 text-text/30'}`}
              >
                {day}
              </span>
            ))}
          </div>

          <div style={{ ...separatorStyle, height: '16px' }} />

          {/* Digital Clock */}
          <div className="flex flex-col items-end">
            <span className="text-xl font-black tracking-tight min-w-[4rem]">
              {(() => {
                const totalMinutes = Math.floor(sunTime * 1440);
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
              })()}
            </span>
            <span className="text-xs font-black tracking-tight min-w-[4rem]">
              {(() => {
                const totalMinutes = Math.floor(sunTime * 1440);
                const hours = Math.floor(totalMinutes / 60);
                if (hours >= 6 && hours < 18) {
                  return (
                    <div className="flex items-center gap-1 text-amber-400/60">
                      <Zap size={10} fill="currentColor" />
                      <span className="uppercase">Daylight</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center gap-1 text-blue-400/60">
                      <div className="w-2 h-2 rounded-full border-2 border-current border-r-transparent -rotate-45" />
                      <span className="uppercase">Night</span>
                    </div>
                  );
                }
              })()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
