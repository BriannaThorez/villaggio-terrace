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

const HEADER_VERTICAL_SCALE = 0.9;
const HEADER_VERTICAL_GAP_REM = 1.5;
const HEADER_PADDING_BOTTOM_REM = 0.5;

const formatDisplayPart = (value?: string) =>
  (value || "").replace(/\b\w/g, (char) => char.toUpperCase());

const buildRoomDisplayName = (room: any) => {
  const size = formatDisplayPart(room?.metadata?.size);
  const specialization = formatDisplayPart(room?.metadata?.specialization);
  const form = formatDisplayPart(room?.metadata?.form);
  const quality = formatDisplayPart(room?.metadata?.quality);
  const className = formatDisplayPart(room?.class);

  const topLine = [size, specialization, form].filter(Boolean).join(" ");
  const bottomLine = [quality, className].filter(Boolean).join(" ");

  return {
    topLine,
    bottomLine,
  };
};

const RoomInfoTooltip = ({ metadata }: { metadata: any }) => {
  if (!metadata) return null;
  const { utilities, services } = resolveTraitsByCategory(metadata.metadata);

  const { topLine, bottomLine } = buildRoomDisplayName(metadata);

  return (
    <div className="flex flex-col gap-2 max-w-full">
      <div className="flex flex-col border-b border-white/5 pb-1.5">
        <span className="text-[10px] font-mono font-bold text-emerald-400 leading-tight">
          {topLine}
        </span>
        <span className="text-[9px] font-bold text-text/30 uppercase tracking-tighter leading-tight">
          {bottomLine}
        </span>
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

type BuildCategory = {
  id: string;
  icon: any;
  label: string;
  description?: string;
  subTypes?: Array<{
    id: string;
    label: string;
    color?: string;
    type?: string;
    size?: number[];
  }>;
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

  const handleCategoryClick = (cat: BuildCategory) => {
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
      <div className="pointer-events-auto inline-flex flex-col items-stretch bg-background/80 backdrop-blur-2xl px-4 py-3 rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] gap-3 transition-all duration-500">
        <div className="flex items-center gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expandedCategory === cat.id;
            const isActive =
              activeTool === cat.id ||
              cat.subTypes?.some((s) => s.id === activeModuleId);

            return (
              <div
                key={cat.id}
                className="relative group"
                onMouseEnter={() => setExpandedCategory(cat.id)}
                onMouseLeave={() => setExpandedCategory(null)}
              >
                {cat.subTypes && (
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col gap-2 p-3 bg-background/90 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom pb-8 -mb-6 ${isExpanded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"}`}
                  >
                    {cat.subTypes.map((sub) => {
                      const display = buildRoomDisplayName(sub);
                      return (
                        <SmartTooltip
                          key={sub.id}
                          content={display.topLine}
                          description={
                            <div className="flex flex-col gap-1 max-w-full">
                              <div className="text-[10px] font-mono font-bold text-emerald-400 leading-tight">
                                {display.topLine}
                              </div>
                              <div className="text-[9px] font-bold text-text/30 uppercase tracking-tighter leading-tight">
                                {display.bottomLine}
                              </div>
                            </div>
                          }
                          position="right"
                          width="308px"
                        >
                          <button
                            onClick={() => {
                              setActiveTool(
                                normalizeToolType(sub.type, cat.id),
                              );
                              setActiveModuleId(sub.id);
                            }}
                            className="whitespace-nowrap px-4 py-2 text-[11px] font-medium text-text/70 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-3 border border-transparent hover:border-primary/20"
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: sub.color || "var(--primary)",
                              }}
                            />
                            {display.topLine}
                          </button>
                        </SmartTooltip>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => handleCategoryClick(cat)}
                  className={`relative p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 ${
                    isActive
                      ? "bg-primary text-background shadow-[0_0_30px_var(--primary)]"
                      : "text-text/50 hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <Icon size={24} strokeWidth={1.5} />

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
