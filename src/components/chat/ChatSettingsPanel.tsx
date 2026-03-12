"use client";

import { motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { AVAILABLE_MODELS } from "../../lib/models";
import { getModelLogoSrc } from "../../lib/modelLogos";

interface ChatSettingsPanelProps {
    onClose: () => void;
    modelRoles: Record<string, string>;
    setModelRoles: (roles: Record<string, string>) => void;
}

export function ChatSettingsPanel({
    onClose,
    modelRoles,
    setModelRoles,
}: ChatSettingsPanelProps) {
    const [localRoles, setLocalRoles] = useState<Record<string, string>>({
        ...modelRoles,
    });

    const handleSave = () => {
        console.error("DIAGNOSTIC: ChatSettingsPanel handleSave clicked!");
        // Filter out empty roles
        const cleaned: Record<string, string> = {};
        for (const [key, val] of Object.entries(localRoles)) {
            if (val.trim()) cleaned[key] = val.trim();
        }
        setModelRoles(cleaned);
        onClose();
    };

    const handleClearAll = () => {
        setLocalRoles({});
    };

    const activeCount = Object.values(localRoles).filter((v) => v.trim()).length;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150]"
                onClick={onClose}
            />

            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.25 }}
                className="fixed right-0 top-0 h-full w-96 bg-neutral-950 border-l border-neutral-800 z-[160] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-8 pb-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-semibold text-lg tracking-tight">
                            Model Roles
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-xs text-neutral-500 px-8 pt-2 pb-6 leading-relaxed">
                    Assign specialized roles to models. Each model will follow its role and recommend other specialists when relevant.
                </p>

                {/* Model list */}
                <div className="flex-1 overflow-y-auto px-8 pb-4 flex flex-col gap-4 no-scrollbar">
                    {AVAILABLE_MODELS.map((model) => {
                        const hasRole = !!(localRoles[model.id]?.trim());
                        return (
                            <div key={model.id} className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${hasRole ? "bg-green-500" : "bg-neutral-700"
                                            }`}
                                    />
                                    {(() => {
                                        const logo = getModelLogoSrc(model.id);
                                        return logo ? <img src={logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" /> : null;
                                    })()}
                                    <span className="text-sm text-white font-medium">
                                        {model.label}
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                        {model.provider}
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    placeholder={`e.g. Mathematician, Creative Writer...`}
                                    value={localRoles[model.id] || ""}
                                    onChange={(e) =>
                                        setLocalRoles((prev) => ({
                                            ...prev,
                                            [model.id]: e.target.value,
                                        }))
                                    }
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-colors"
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 border-t border-neutral-800/50 flex flex-col gap-3">
                    {activeCount > 0 && (
                        <p className="text-[11px] text-neutral-500 text-center">
                            {activeCount} model{activeCount > 1 ? "s" : ""} with roles assigned
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={handleClearAll}
                            className="flex-1 py-3 rounded-xl border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-800 transition-colors"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors"
                        >
                            Save Roles
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
