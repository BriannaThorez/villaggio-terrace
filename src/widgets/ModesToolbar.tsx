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
import { useState } from "react";
import themes from "../shared/themes/color_palettes.json";

export const ModesToolbar = () => {
  const mode = useSimulationStore((state) => state.mode);
  const setMode = useSimulationStore((state) => state.setMode);
  const themeName = useSimulationStore((state) => state.themeName);
  const setThemeName = useSimulationStore((state) => state.setThemeName);
  const resources = useSimulationStore((state) => state.resources);
  const undo = useSimulationStore((state) => state.undo);
  const redo = useSimulationStore((state) => state.redo);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

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

  return (
    <div className="absolute top-4 left-4 right-4 flex justify-center z-50">
      <div className="w-full max-w-6xl bg-background/90 backdrop-blur-xl p-2 rounded-2xl border border-text/10 flex flex-wrap items-center justify-between gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div className="flex flex-wrap items-center gap-2">
          <button className="p-3 rounded-xl text-text/60 hover:bg-primary/10 hover:text-primary">
            <Menu01Icon size={30} />
          </button>
          <div className="w-px h-8 bg-text/10 mx-0.5" />

          <SmartTooltip content="Power">
            <div className="flex items-center gap-2 px-3 py-2 text-base font-medium text-text/80">
              {resources.power}
              <FlashIcon size={24} className="text-yellow-500" />
            </div>
          </SmartTooltip>

          <SmartTooltip content="Water">
            <div className="flex items-center gap-2 px-3 py-2 text-base font-medium text-text/80">
              {resources.water}
              <Settings01Icon size={24} className="text-blue-500" />
            </div>
          </SmartTooltip>

          <SmartTooltip content="Internet">
            <div className="flex items-center gap-2 px-3 py-2 text-base font-medium text-text/80">
              {resources.internet}
              <Wifi01Icon size={24} className="text-green-500" />
            </div>
          </SmartTooltip>

          <div className="w-px h-8 bg-text/10 mx-0.5" />

          <SmartTooltip
            content="Studio Mode"
            description="Full creative control. Create, edit, and link nodes."
            position="top"
          >
            <button
              onClick={() => setMode("studio")}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                mode === "studio"
                  ? "bg-primary text-background shadow-[0_0_15px_var(--primary)]"
                  : "text-text/40 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Edit01Icon size={27} strokeWidth={2} />
            </button>
          </SmartTooltip>

          <SmartTooltip
            content="Undo"
            description="Revert the last action."
            position="top"
          >
            <button
              onClick={undo}
              className="p-3 rounded-xl text-text/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center"
            >
              <ArrowTurnBackwardIcon size={27} strokeWidth={2} />
            </button>
          </SmartTooltip>

          <SmartTooltip
            content="Redo"
            description="Restore the last undone action."
            position="top"
          >
            <button
              onClick={redo}
              className="p-3 rounded-xl text-text/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center"
            >
              <ArrowTurnForwardIcon size={27} strokeWidth={2} />
            </button>
          </SmartTooltip>

          <SmartTooltip
            content="Viewer Mode"
            description="Clean presentation mode. All editing tools are hidden."
            position="top"
          >
            <button
              onClick={() => setMode("viewer")}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                mode === "viewer"
                  ? "bg-primary text-background shadow-[0_0_15px_var(--primary)]"
                  : "text-text/40 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <ViewIcon size={27} strokeWidth={2} />
            </button>
          </SmartTooltip>

          <div className="w-px h-8 bg-text/10 mx-0.5" />

          <div className="relative">
            <SmartTooltip
              content="Switch Theme"
              description="Choose a color palette for the entire simulation."
              position="top"
            >
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                  showThemeMenu
                    ? "bg-primary/10 text-primary"
                    : "text-text/40 hover:text-primary hover:bg-primary/5"
                }`}
              >
                <Settings01Icon size={27} strokeWidth={2} />
              </button>
            </SmartTooltip>

            {showThemeMenu && (
              <div
                onMouseLeave={() => setShowThemeMenu(false)}
                className="absolute bottom-full mb-2 left-0 bg-background/90 backdrop-blur-2xl border border-primary/10 rounded-xl p-2 shadow-2xl flex flex-col gap-1 min-w-[160px] z-[100]"
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
                    className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-xs transition-all ${
                      themeName === name
                        ? "bg-primary/20 text-primary"
                        : "text-text/60 hover:text-text hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="capitalize">
                        {name.replace("_", " ")}
                      </span>
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

          <SmartTooltip
            content="Export Data"
            description="Download the current simulation as a structured JSON file."
            position="top"
          >
            <button
              onClick={handleExport}
              className="p-3 rounded-xl text-text/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center"
            >
              <Download01Icon size={27} strokeWidth={2} />
            </button>
          </SmartTooltip>
        </div>
      </div>
    </div>
  );
};
