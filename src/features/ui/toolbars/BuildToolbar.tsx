import { useState, useMemo } from "react";
import { useSimulationStore } from "../../../shared/utils/store";
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
  Layers01Icon as LayersIcon,
} from "hugeicons-react";
import { Construction } from "lucide-react";
import { SmartTooltip } from "../../../shared/components/SmartTooltip";

type BuildToolId =
  | "select"
  | "structure"
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

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [
      {
        id: "select",
        icon: Cursor01Icon,
        label: "Select",
        description: "Inspect building modules.",
        shortcut: "1",
      },
      {
        id: "structure",
        icon: Construction,
        label: "Structure",
        description: "Place structural scaffold.",
        shortcut: "2",
      },
      {
        id: "residential",
        icon: Home01Icon,
        label: "Residential",
        subTypes: [
          { id: "res_studio", label: "Studio", size: [10, 40], color: "#4ade80" },
          { id: "res_1br", label: "1-Bedroom", size: [20, 40], color: "#22c55e" },
          { id: "res_2br", label: "2-Bedroom", size: [30, 40], color: "#16a34a" },
        ]
      },
      {
        id: "office",
        icon: OfficeIcon,
        label: "Office",
        subTypes: [
          { id: "off_small", label: "Small Office", size: [10, 40], color: "#60a5fa" },
          { id: "off_med", label: "Executive Suite", size: [20, 40], color: "#3b82f6" },
          { id: "off_large", label: "Corporate HQ", size: [30, 80], color: "#2563eb" },
        ]
      },
      {
        id: "commercial",
        icon: ShoppingBag01Icon,
        label: "Commercial",
        subTypes: [
          { id: "com_cafe", label: "Cafe", size: [10, 40], color: "#fb923c" },
          { id: "com_shop", label: "Boutique", size: [20, 40], color: "#f97316" },
          { id: "com_cinema", label: "Cinema", size: [40, 80], color: "#ea580c" },
        ]
      },
      {
        id: "utility",
        icon: Settings01Icon,
        label: "Utility",
        subTypes: [
          { id: "util_ele", label: "Elevator", size: [10, 40], type: "elevator" },
          { id: "util_stairs", label: "Stairs", size: [10, 40], type: "stairs" },
          { id: "util_lobby", label: "Lobby", size: [10, 40], type: "lobby" },
        ]
      },
    ],
    [],
  );

  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none">
      <div className="inline-flex flex-col items-center bg-background/80 backdrop-blur-2xl px-4 py-3 rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] gap-3 pointer-events-auto transition-all duration-500">
        <div className="text-[9px] font-bold text-primary/80 uppercase tracking-[0.4em] mb-1">
          Architectural Core
        </div>
        <div className="flex items-center gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expandedCategory === cat.id;

            return (
              <div
                key={cat.id}
                className="relative group"
                onMouseEnter={() => setExpandedCategory(cat.id)}
                onMouseLeave={() => setExpandedCategory(null)}
              >
                {/* Expanding Drawer Bridge */}
                {cat.subTypes && (
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col gap-2 p-3 bg-background/90 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom pb-8 -mb-6 ${isExpanded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
                    }`}>
                    {cat.subTypes.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTool(sub.type || cat.id as any)}
                        className="whitespace-nowrap px-4 py-2 text-[11px] font-medium text-text/70 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-3 border border-transparent hover:border-primary/20"
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: sub.color || 'var(--primary)' }} />
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveTool(cat.id as any)}
                  className={`relative p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 ${activeTool === cat.id || (cat.subTypes?.some(s => activeTool === (s.type || cat.id)))
                    ? "bg-primary text-background shadow-[0_0_30px_var(--primary)]"
                    : "text-text/50 hover:text-primary hover:bg-primary/5"
                    }`}
                >
                  <Icon size={24} strokeWidth={1.5} />

                  {/* Subtle Indicator for Drafts */}
                  {cat.subTypes && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse opacity-50" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
