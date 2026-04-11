import { useState, useMemo, useEffect } from "react";
import { useSimulationStore } from "../../../shared/utils/store";
import {
  Cursor01Icon,
  Home01Icon,
  ShoppingBag01Icon,
  OfficeIcon,
  Settings01Icon,
  Building01Icon,
  CheckmarkCircle01Icon,
  Layers01Icon as LayersIcon,
  HelpCircleIcon,
  ChefHatIcon,
  Store01Icon,
} from "hugeicons-react";
import { Construction, Briefcase, Coins } from "lucide-react";
import { SmartTooltip } from "../../../shared/components/SmartTooltip";
import roomMetadata from "../../../entities/rooms/roomMetadata.json";
import {
  resolveTraitsByCategory,
  getIconComponent,
} from "../../../shared/utils/metadataUtils";

const TOOL_ALIASES: Record<string, string> = {
  studio: "residential",
  apartment: "residential",
  residential: "residential",
  office: "office",
  commercial: "commercial",
  lobby: "lobby",
  structure: "structure",
};

const normalizeToolType = (rawType?: string, fallback?: string) => {
  const candidate = (rawType || fallback || "").toLowerCase();
  return TOOL_ALIASES[candidate] ?? candidate;
};

// Shared Icon Registry
const ICON_REGISTRY: Record<string, any> = {
  Select: Cursor01Icon,
  Structure: Construction,
  Lobby: Building01Icon,
  Residential: Home01Icon,
  Office: OfficeIcon,
  Restaurant: ChefHatIcon,
  Store: Store01Icon,
  Commercial: ShoppingBag01Icon,
  FootTraffic: LayersIcon,
  Services: Briefcase,
  Unknown: HelpCircleIcon,
  Settings: Settings01Icon,
};

// Fallback colors for procedural generation
const COLOR_REGISTRY: Record<string, string> = {
  Residential: "#4ade80",
  Apartment: "#4ade80",
  Office: "#60a5fa",
  Restaurant: "#ff6b6b",
  Store: "#fb923c",
  Commercial: "#fb923c",
  FootTraffic: "#a78bfa",
  Lobby: "#fcd34d",
  Services: "#38bdf8",
  Structure: "#94a3b8",
  Unknown: "#ef4444",
};

const GUI_SPACING_SCALE = 0.85;
const GUI_SPACING_REM = 0.375 * GUI_SPACING_SCALE;
const BUILD_ICON_GAP_REM = 1 * GUI_SPACING_SCALE;
const BUILD_PADDING_HORIZONTAL_REM = 1 * GUI_SPACING_SCALE;
const BUILD_PADDING_VERTICAL_REM = 0.75 * GUI_SPACING_SCALE;
const BUILD_TOOLBAR_GAP_REM = 0.75 * GUI_SPACING_SCALE;
const THEME_BUILD_TOOLBAR_BUTTON_RADIUS =
  "var(--theme-build-toolbar-button-radius)";
const HEADER_VERTICAL_SCALE = 0.9;
const HEADER_VERTICAL_GAP_REM = 1.5;
const HEADER_PADDING_BOTTOM_REM = 0.5;

const RoomInfoTooltip = ({ metadata }: { metadata: any }) => {
  if (!metadata) return null;
  const { utilities, services } = resolveTraitsByCategory(metadata.metadata);

  const name = metadata.name || "";
  const type = metadata.metadata?.type || "";
  const showType = type && !name.toLowerCase().includes(type.toLowerCase());

  return (
    <div className="flex flex-col gap-3 max-w-full">
      <div
        className="flex items-center justify-between border-b border-white/5"
        style={{
          gap: `${HEADER_VERTICAL_GAP_REM * HEADER_VERTICAL_SCALE}rem`,
          paddingBottom: `${HEADER_PADDING_BOTTOM_REM * HEADER_VERTICAL_SCALE}rem`,
        }}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400">
          <Coins size={12} className="shrink-0" />$
          {metadata.metadata?.average_rent?.toLocaleString()}/mo
        </div>
        {showType && (
          <span className="text-[9px] font-bold text-text/30 uppercase tracking-tighter truncate max-w-[120px]">
            {type}
          </span>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-text/60 italic border-l-2 border-primary/20 pl-2">
        {metadata.specificDescription}
      </p>

      {utilities.length > 0 && (
        <div className="flex gap-2.5">
          {utilities.map((u: any) => {
            const Icon = getIconComponent(u.icon);
            return Icon ? (
              <Icon key={u.key} size={15} className="text-primary/70" />
            ) : null;
          })}
        </div>
      )}

      {services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {services.map((s: any) => (
            <span
              key={s.key}
              className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] font-bold text-primary/80 whitespace-nowrap"
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const BuildToolbar = () => {
  const setActiveTool = useSimulationStore((state) => state.setActiveTool);
  const setActiveModuleId = useSimulationStore(
    (state) => state.setActiveModuleId,
  );
  const activeTool = useSimulationStore((state) => state.activeTool);
  const activeModuleId = useSimulationStore((state) => state.activeModuleId);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [memoryState, setMemoryState] = useState<Record<string, string>>({});

  const categories = useMemo(() => {
    const rooms = roomMetadata.rooms as any[];
    const grouped: Record<string, any[]> = {};

    for (const r of rooms) {
      if (!grouped[r.class]) grouped[r.class] = [];
      grouped[r.class].push({
        ...r,
        label: r.name,
        color: COLOR_REGISTRY[r.class] || "#ffffff",
        type: normalizeToolType(
          r.metadata.type?.toLowerCase(),
          r.class.toLowerCase(),
        ),
      });
    }

    const explicitOrder = ["Select", "Structure", "Lobby", "FootTraffic"];
    const baseNav = [
      {
        id: "select",
        icon: ICON_REGISTRY.Select,
        label: "Select",
        description: "Inspect building modules.",
      },
      {
        id: "structure",
        icon: ICON_REGISTRY.Structure,
        label: "Structure",
        description: "Place structural scaffold.",
      },
      {
        id: "lobby",
        icon: ICON_REGISTRY.Lobby,
        label: "Lobby",
        description: "Place entry nodes.",
      },
    ];

    const dynamicCats = Object.keys(grouped).map((cls) => ({
      id: cls.toLowerCase(),
      _rawClass: cls,
      icon: ICON_REGISTRY[cls] || ICON_REGISTRY.Settings,
      label: cls,
      subTypes: grouped[cls],
    }));

    dynamicCats.sort((a, b) => {
      const idxA = explicitOrder.indexOf(a._rawClass);
      const idxB = explicitOrder.indexOf(b._rawClass);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.label.localeCompare(b.label, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return [...baseNav, ...dynamicCats] as any[];
  }, []);

  useEffect(() => {
    if (activeTool && activeModuleId) {
      const cat = categories.find((c) =>
        (c as any).subTypes?.some((s: any) => s.id === activeModuleId),
      );
      if (cat)
        setMemoryState((prev) => ({ ...prev, [cat.id]: activeModuleId }));
    }
  }, [activeTool, activeModuleId, categories]);

  const handleCategoryClick = (cat: any) => {
    if (cat.subTypes && cat.subTypes.length > 0) {
      const lastSelectedId = memoryState[cat.id] || cat.subTypes[0].id;
      const sub = cat.subTypes.find((s: any) => s.id === lastSelectedId);
      if (sub) {
        setActiveTool(normalizeToolType(sub.type, cat.id));
        setActiveModuleId(sub.id);
      }
    } else {
      setActiveTool(normalizeToolType(undefined, cat.id));
      setActiveModuleId(null);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none">
      <div
        className="inline-flex flex-col items-center rounded-2xl border border-text/10 bg-background/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] pointer-events-auto"
        style={{
          padding: "var(--theme-build-toolbar-padding)",
          gap: "var(--theme-build-toolbar-gap)",
        }}
      >
        <div
          className="flex items-center"
          style={{ gap: `${BUILD_ICON_GAP_REM}rem` }}
        >
          {categories.map((cat: any) => {
            const Icon = cat.icon;
            const isExpanded = expandedCategory === cat.id;
            const isActive =
              activeTool === cat.id ||
              cat.subTypes?.some((s: any) => s.id === activeModuleId);

            return (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={() => setExpandedCategory(cat.id)}
                onMouseLeave={() => setExpandedCategory(null)}
              >
                {cat.subTypes && (
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col gap-0 p-1.5 bg-background/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom pb-6 -mb-4 ${isExpanded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"}`}
                  >
                    <div className="text-[9px] font-bold text-text/40 uppercase tracking-widest pl-2 mb-1">
                      {cat.label} Types
                    </div>
                    {cat.subTypes.map((sub: any) => (
                      <SmartTooltip
                        key={sub.id}
                        content={sub.label}
                        description={<RoomInfoTooltip metadata={sub} />}
                        position="right"
                        width="308px"
                      >
                        <button
                          onClick={() => {
                            setActiveTool(normalizeToolType(sub.type, cat.id));
                            setActiveModuleId(sub.id);
                            setExpandedCategory(null);
                          }}
                          className={`whitespace-nowrap px-4 py-1 text-[10.5px] font-semibold rounded-xl transition-all flex items-center justify-between border ${activeModuleId === sub.id ? "bg-primary/20 text-primary border-primary/30" : "text-text/70 hover:text-text hover:bg-white/5 border-transparent"}`}
                          style={{ gap: `${BUILD_ICON_GAP_REM}rem` }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: sub.color,
                                boxShadow: `0 0 8px ${sub.color}`,
                              }}
                            />
                            {sub.label}
                          </div>
                          {activeModuleId === sub.id && (
                            <CheckmarkCircle01Icon
                              size={13}
                              className="text-primary"
                            />
                          )}
                        </button>
                      </SmartTooltip>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleCategoryClick(cat)}
                  className={`relative rounded-xl transition-all duration-500 group ${isActive ? "bg-primary text-background shadow-[0_0_30px_var(--primary)]" : "text-text/50 hover:text-primary hover:bg-primary/10"}`}
                  style={{
                    padding: "0.6375rem 0.85rem",
                    borderRadius: THEME_BUILD_TOOLBAR_BUTTON_RADIUS,
                  }}
                >
                  <Icon size={26} strokeWidth={1.5} />
                  {cat.subTypes && isActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-background border border-primary rounded-full" />
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
