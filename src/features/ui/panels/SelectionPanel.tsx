import React, { useState, useEffect, useMemo } from "react";
import {
    Edit01Icon,
    InformationCircleIcon,
    Coins01Icon,
} from "hugeicons-react";
import { motion } from "framer-motion";
import { useSimulationStore } from "../../../shared/utils/store";
import roomMetadata from "../../../entities/rooms/roomMetadata.json";

export const SelectionPanel = () => {
    const selectedId = useSimulationStore((state) => state.selectedId);
    const shapes = useSimulationStore((state) => state.shapes);
    const updateShape = useSimulationStore((state) => state.updateShape);
    const uiPositions = useSimulationStore((state) => state.uiPositions);
    const setUIPosition = useSimulationStore((state) => state.setUIPosition);

    const shape = shapes.find((s) => s.id === selectedId);
    const pos = uiPositions["selection-panel"] || { x: 20, y: 80 };
    const [localName, setLocalName] = useState(shape?.name || "");

    const metadata = useMemo(() => {
        if (!shape?.metadataId) return null;
        return roomMetadata.find(m => m.id === shape.metadataId);
    }, [shape?.metadataId]);

    useEffect(() => {
        if (shape) {
            setLocalName(shape.name || "");
        }
    }, [shape?.id, shape?.name]);

    if (!shape) return null;

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

    const income = metadata?.metadata?.average_rent;
    const incomeText = income ? `+$${income.toLocaleString()}/mo` : "";
    const description = metadata
        ? `${metadata.categoryDescription} ${metadata.specificDescription}`
        : "Standard architectural implementation.";

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            animate={{ x: pos.x, y: pos.y }}
            className="absolute top-0 left-0 bg-background/85 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.4)] w-[320px] select-none z-50 cursor-grab active:cursor-grabbing overflow-hidden"
        >
            {/* Top Accent Bar */}
            <div className="h-1 bg-gradient-to-r from-accent/50 via-accent to-accent/50 w-full" />

            <div className="p-4 flex flex-col gap-3">
                {/* [Name] - Editable Header */}
                <div className="relative group">
                    <input
                        className="bg-transparent border-none p-0 text-[18px] text-text font-bold outline-none w-full placeholder:text-text/20 focus:ring-0"
                        value={localName}
                        onChange={handleNameChange}
                        placeholder="Unnamed Room"
                        onKeyDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none">
                        <Edit01Icon size={14} />
                    </div>
                </div>

                {/* [Class] [Type] +[Income]/mo */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-md">
                        <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider">
                            {metadata?.metadata?.class || "Standard"} {metadata?.metadata?.type || shape.type}
                        </span>
                    </div>
                    {incomeText && (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                            <Coins01Icon size={12} strokeWidth={2.5} />
                            {incomeText}
                        </div>
                    )}
                </div>

                {/* [Description] */}
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent/20 rounded-full" />
                    <p className="pl-3 text-[11px] leading-[1.6] text-text/60 font-medium italic">
                        {description}
                    </p>
                </div>

                {/* Subtle ID Footer */}
                <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-text/20 uppercase tracking-widest">
                    <span>Node ID: {shape.id.split('_').pop()}</span>
                    <InformationCircleIcon size={10} />
                </div>
            </div>
        </motion.div>
    );
};
