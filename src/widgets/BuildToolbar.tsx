import {
  useSimulationStore,
} from "../shared/utils/store";
import {
  Cursor01Icon,
  Home01Icon,
  ShoppingBag01Icon,
  OfficeIcon,
  Settings01Icon,
  Building01Icon,
  Building02Icon,
  Building03Icon,
  Edit01Icon,
  CheckmarkCircle01Icon,
} from "hugeicons-react";
import { SmartTooltip } from "../shared/components/SmartTooltip";
import { useMemo } from "react";

type BuildToolId =
  | "select"
  | "lobby"
  | "residential"
  | "commercial"
  | "office"
  | "utility"
  | "elevator"
  | "stairs";

export const BuildToolbar = () => {
  const setActiveTool = useSimulationStore((state) => state.setActiveTool);
  const activeTool = useSimulationStore((state) => state.activeTool);
  const mode = useSimulationStore((state) => state.mode);

  const tools = useMemo(
    () => [
      {
        id: "select" as BuildToolId,
        icon: Cursor01Icon,
        label: "Select",
        description: "Select and inspect building modules.",
        shortcut: "1",
      },
      {
        id: "lobby" as BuildToolId,
        icon: Building01Icon,
        label: "Lobby",
        description: "Place lobby and entrance modules.",
        shortcut: "2",
      },
      {
        id: "residential" as BuildToolId,
        icon: Home01Icon,
        label: "Residential",
        description: "Place residential apartment modules.",
        shortcut: "3",
      },
      {
        id: "commercial" as BuildToolId,
        icon: ShoppingBag01Icon,
        label: "Commercial",
        description: "Place retail and commercial modules.",
        shortcut: "4",
      },
      {
        id: "office" as BuildToolId,
        icon: OfficeIcon,
        label: "Office",
        description: "Place office modules.",
        shortcut: "5",
      },
      {
        id: "utility" as BuildToolId,
        icon: Settings01Icon,
        label: "Utility",
        description: "Place utilities and service modules.",
        shortcut: "6",
      },
      {
        id: "elevator" as BuildToolId,
        icon: Building02Icon,
        label: "Elevator",
        description: "Place elevator shafts.",
        shortcut: "7",
      },
      {
        id: "stairs" as BuildToolId,
        icon: Building03Icon,
        label: "Stairs",
        description: "Place stair core modules.",
        shortcut: "8",
      },
    ],
    [],
  );

  if (mode !== "studio") {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 flex justify-center z-50">
      <div className="w-full max-w-6xl bg-background/90 backdrop-blur-xl p-2 rounded-2xl border border-text/10 flex flex-wrap items-center justify-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div className="px-3 py-2 rounded-xl bg-text/5 border border-text/10 text-xs uppercase tracking-widest text-text/50">
          Build Toolbar
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <SmartTooltip
                key={tool.id}
                content={tool.label}
                description={tool.description}
                shortcut={tool.shortcut}
                position="top"
              >
                <button
                  onClick={() => setActiveTool(tool.id as any)}
                  className={`p-3.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
                    activeTool === tool.id
                      ? "bg-primary text-background shadow-[0_0_15px_var(--primary)] scale-110"
                      : "text-text/40 hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <Icon size={24} strokeWidth={1.5} />
                </button>
              </SmartTooltip>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-widest text-text/30">
          <Edit01Icon size={14} />
          Construction Mode
        </div>
      </div>
    </div>
  );
};
