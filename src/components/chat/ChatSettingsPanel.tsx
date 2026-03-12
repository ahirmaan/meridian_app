"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import React from "react";

interface ChatSettingsPanelProps {
    onClose: () => void;
}

export function ChatSettingsPanel({
    onClose,
}: ChatSettingsPanelProps) {
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
                            Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <p className="text-sm text-neutral-500">
                        Settings are currently under maintenance.
                    </p>
                </div>
            </motion.div>
        </>
    );
}
