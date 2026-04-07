import React, { useState, useEffect } from "react";
import {
    Home01Icon,
    ShoppingBag01Icon,
    OfficeIcon,
    Settings01Icon,
    Building01Icon,
    Building02Icon,
    Building03Icon,
    Edit01Icon,
    InformationCircleIcon,
} from "hugeicons-react";
import { motion } from "framer-motion";
import { useSimulationStore } from "../../../shared/utils/store";

const typeIconMap = {
    lobby: Building01Icon,
    residential: Home01Icon,
    commercial: ShoppingBag01Icon,
    office: OfficeIcon,
    utility: Settings01Icon,
    elevator: Building02Icon,
    stairs: Building03Icon,
};

export const SelectionPanel = () => {
    const selectedId = useSimulationStore((state) => state.selectedId);
    const shapes = useSimulationStore((state) => state.shapes);
    const updateShape = useSimulationStore((state) => state.updateShape);
    const uiPositions = useSimulationStore((state) => state.uiPositions);
    const setUIPosition = useSimulationStore((state) => state.setUIPosition);

    const shape = shapes.find((s) => s.id === selectedId);
    const pos = uiPositions["selection-panel"] || { x: 0, y: 0 };
    const [localName, setLocalName] = useState(shape?.name || "");

    useEffect(() => {
        if (shape) {
            setLocalName(shape.name || "");
        }
    }, [shape?.id, shape?.name]);

    if (!shape) return null;

    const Icon = (typeIconMap as any)[shape.type] || InformationCircleIcon;

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextName = e.target.value;
        setLocalName(nextName);
        updateShape(shape.id, { name: nextName }, true);
    };

    const handleDragEnd = (_: any, info: any) => {
        setUIPosition("selection-panel", {
            x: pos.x + info.offset.x,
            y: pos.y + info.offset.y,
        });
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            animate={{ x: pos.x, y: pos.y }}
            className="absolute top-4 left-4 bg-background/90 backdrop-blur-2xl border border-text/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] min-w-[280px] w-auto select-none z-50 cursor-grab active:cursor-grabbing"
            style={{ padding: `0.3rem` }}
        >
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_5px_var(--accent)]" />
                    <span className="text-[9px] font-mono tracking-[0.2em] text-text font-bold uppercase">
                        Selection Info
                    </span>
                </div>

                <div className="flex flex-col gap-2.5 p-0.5">
                    {/* Room Name Entry */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[8px] font-mono text-text/30 tracking-widest uppercase">Room Name</span>
                            <Edit01Icon size={10} className="text-text/20" />
                        </div>
                        <input
                            className="bg-text/5 border border-text/10 rounded-xl px-3 py-1.5 text-[11px] text-text font-medium outline-none focus:border-accent/50 focus:bg-accent/5 transition-all pointer-events-auto w-full"
                            value={localName}
                            onChange={handleNameChange}
                            placeholder="Enter room name..."
                            onKeyDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Room Type Info */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono text-text/30 tracking-widest uppercase px-1">Module Type</span>
                        <div className="flex items-center gap-3 bg-text/5 border border-text/10 rounded-xl px-2.5 py-1.5">
                            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                                <Icon size={18} strokeWidth={1.5} />
                            </div>
                            <div className="flex flex-col overflow-visible">
                                <span className="text-[9px] text-text font-bold uppercase tracking-wider leading-none mb-0.5 whitespace-nowrap">{shape.type}</span>
                                <span className="text-[6.5px] text-text/40 font-mono tracking-tighter tabular-nums break-all">ID: {shape.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
