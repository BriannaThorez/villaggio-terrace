import React, { useState, useEffect, useMemo } from "react";
import {
    Edit01Icon,
    InformationCircleIcon,
    Coins01Icon,
} from "hugeicons-react";
import { motion } from "framer-motion";
import { useSimulationStore } from "../../../shared/utils/store";
import { useTenancyStore } from "../../tenancy/store/tenancyStore";
import roomMetadata from "../../../entities/rooms/roomMetadata.json";
import { resolveTraitsByCategory, getIconComponent } from "../../../shared/utils/metadataUtils";
import { UserPlus, UserMinus, Users } from "lucide-react";

export const SelectionPanel = () => {
    const selectedId = useSimulationStore((state) => state.selectedId);
    const shapes = useSimulationStore((state) => state.shapes);
    const updateShape = useSimulationStore((state) => state.updateShape);
    const uiPositions = useSimulationStore((state) => state.uiPositions);
    const setUIPosition = useSimulationStore((state) => state.setUIPosition);

    const { occupants, assignTenant, evictTenant } = useTenancyStore();

    const shape = shapes.find((s) => s.id === selectedId);
    const pos = uiPositions["selection-panel"] || { x: 20, y: 80 };
    const [localName, setLocalName] = useState(shape?.name || "");

    const metadata = useMemo(() => {
        if (!shape?.metadataId) return null;
        return (roomMetadata.rooms as any[]).find(m => m.id === shape.metadataId);
    }, [shape?.metadataId]);

    const { preferences, utilities, services } = useMemo(() => {
        return resolveTraitsByCategory(metadata?.metadata);
    }, [metadata]);

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

    const tenant = occupants[shape.id];
    let incomeText = "";
    let isExpense = false;

    if (metadata?.class === "Services" && metadata?.metadata?.upkeep_cost) {
        isExpense = true;
        incomeText = `-$${metadata.metadata.upkeep_cost.toLocaleString()}/wk`;
    } else {
        const income = tenant ? tenant.monthlyRent : (metadata?.metadata?.average_rent || 0);
        if (income > 0) {
            incomeText = tenant 
                ? `+$${income.toLocaleString()}/wk` 
                : `(Est. +$${income.toLocaleString()}/wk)`;
        }
    }

    // Resolve combined description from library + variant
    const classInfo = metadata ? (roomMetadata.classLibrary as any)[metadata.class] : null;
    const categoryDesc = classInfo?.description || "";
    const description = metadata
        ? `${categoryDesc} ${metadata.specificDescription}`
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

            <div className="p-4 flex flex-col gap-4">
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
                            {metadata?.class || "Standard"} {metadata?.metadata?.type || shape.type}
                        </span>
                    </div>
                    {incomeText && (
                        <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                            <Coins01Icon size={12} strokeWidth={2.5} />
                            {incomeText}
                        </div>
                    )}
                </div>

                {/* Tenancy Section */}
                {['Apartment', 'Office', 'Restaurant', 'Store'].includes(metadata?.class) && (
                    <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-text/30 uppercase tracking-[0.2em]">Tenancy Status</span>
                    {tenant ? (
                        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Users size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-text">{tenant.name}</span>
                                    <span className="text-[9px] text-text/40">Since {new Date(tenant.moveInDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => evictTenant(shape.id)}
                                className="p-2 text-text/40 hover:text-red-400 transition-colors"
                            >
                                <UserMinus size={14} />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => assignTenant(shape.id, {
                                tenantId: `t_${Math.random().toString(36).substr(2, 9)}`,
                                name: "Prospect Candidate",
                                moveInDate: Date.now(),
                                monthlyRent: metadata?.metadata?.average_rent || 1000
                            })}
                            className="flex items-center justify-center gap-2 w-full p-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-text/40 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-bold"
                        >
                            <UserPlus size={14} />
                            Assign Occupant
                        </button>
                    )}
                </div>
                )}

                {/* [Description] */}
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent/20 rounded-full" />
                    <p className="pl-3 text-[11px] leading-[1.6] text-text/60 font-medium italic">
                        {description}
                    </p>
                </div>

                {/* Utilities (Icons) */}
                {utilities.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-text/30 uppercase tracking-[0.2em]">Required Utilities</span>
                        <div className="flex items-center gap-3">
                            {utilities.map(util => {
                                const Icon = getIconComponent(util.icon);
                                return (
                                    <div key={util.key} className="group/util relative">
                                        <div className="p-2 bg-white/5 border border-white/10 rounded-lg text-text/60 hover:text-primary hover:border-primary/50 transition-all flex items-center gap-1">
                                            {Icon && <Icon size={16} strokeWidth={1.5} />}
                                            <span className="text-[10px] font-mono font-bold text-text/80">{util.value}</span>
                                        </div>
                                        {/* Tooltip on tiny icons */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-background border border-white/10 rounded text-[9px] opacity-0 group-hover/util:opacity-100 pointer-events-none whitespace-nowrap transition-opacity font-mono">
                                            {util.label}: {util.value}/cycle
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Services (Pills) */}
                {services.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-text/30 uppercase tracking-[0.2em]">Mandatory Services</span>
                        <div className="flex flex-wrap gap-1.5">
                            {services.map(service => (
                                <div key={service.key} className="px-2 py-1 bg-primary/5 border border-primary/20 rounded-full">
                                    <span className="text-[10px] font-medium text-primary/80">{service.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Subtle ID Footer */}
                <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-text/20 uppercase tracking-widest">
                    <span>Node ID: {shape.id.split('_').pop()}</span>
                    <InformationCircleIcon size={10} />
                </div>
            </div>
        </motion.div>
    );
};
