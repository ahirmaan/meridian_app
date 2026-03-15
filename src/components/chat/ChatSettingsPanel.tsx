import { motion } from "framer-motion";
import { X, Pin, PinOff, Brain, Trash2, ArrowRight } from "lucide-react";
import React, { useState } from "react";
import { updateChatPinned, updateChatThoughtTrace } from "../../lib/chatService";

interface ChatSettingsPanelProps {
    onClose: () => void;
    chat: {
        id: string;
        is_pinned?: boolean;
        show_thought_trace?: boolean;
        type?: "chat" | "project";
    };
    onUpdate: (id: string, updates: any) => void;
    onClearHistory: () => void;
}

export function ChatSettingsPanel({
    onClose,
    chat,
    onUpdate,
    onClearHistory,
}: ChatSettingsPanelProps) {
    const [isPinned, setIsPinned] = useState(chat.is_pinned || false);
    const [showTrace, setShowTrace] = useState(chat.show_thought_trace !== false);

    const togglePin = async () => {
        const newVal = !isPinned;
        setIsPinned(newVal);
        await updateChatPinned(chat.id, newVal);
        onUpdate(chat.id, { is_pinned: newVal });
    };

    const toggleTrace = async () => {
        const newVal = !showTrace;
        setShowTrace(newVal);
        await updateChatThoughtTrace(chat.id, newVal);
        onUpdate(chat.id, { show_thought_trace: newVal });
    };

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
                <div className="flex items-center justify-between p-8 pb-6 border-b border-neutral-800/50">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-white font-semibold text-lg tracking-tight">
                            Chat Settings
                        </h2>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold opacity-70">Configure session</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-900 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-10 no-scrollbar">

                    {/* Main Toggles */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold opacity-80">Preferences</h3>

                        {/* Pin Chat */}
                        <button
                            onClick={togglePin}
                            className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-2xl hover:border-neutral-700 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isPinned ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-800 text-neutral-500'}`}>
                                    {isPinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5" />}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-white">
                                        {chat.type === "project" ? "Pin Project" : "Pin Chat"}
                                    </p>
                                    <p className="text-[11px] text-neutral-400 opacity-80">Keep at the top of sidebar</p>
                                </div>
                            </div>
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isPinned ? 'bg-amber-500' : 'bg-neutral-800'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isPinned ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </button>

                        {/* Thought Trace */}
                        <button
                            onClick={toggleTrace}
                            className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-2xl hover:border-neutral-700 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showTrace ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-800 text-neutral-500'}`}>
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-white">Thought Trace</p>
                                    <p className="text-[11px] text-neutral-500">Show AI reasoning steps</p>
                                </div>
                            </div>
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showTrace ? 'bg-emerald-500' : 'bg-neutral-800'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showTrace ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </button>
                    </div>

                    <div className="w-full h-px bg-neutral-800/50" />

                    {/* Danger Zone */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold text-red-500/80">Danger Zone</h3>
                        <button
                            onClick={() => {
                                if (confirm("Are you sure you want to clear all messages in this chat? This cannot be undone.")) {
                                    onClearHistory();
                                }
                            }}
                            className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-all group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-red-500">Clear History</p>
                                    <p className="text-[11px] text-red-500/50">Wipe messages from this session</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-red-500/30 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-8 border-t border-neutral-800/50 bg-neutral-900/20">
                    <p className="text-[10px] text-neutral-600 text-center leading-relaxed font-medium">
                        CHAT ID: {chat.id}
                    </p>
                </div>
            </motion.div>
        </>
    );
}
