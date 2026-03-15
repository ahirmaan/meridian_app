import { motion } from "framer-motion";
import { X, FolderGit2, Users, Lock, Bot, Info, Save, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { Tooltip } from "../ui/Tooltip";
import { updateProjectRules } from "../../lib/chatService";

interface ProjectDetailsPanelProps {
    onClose: () => void;
    project: {
        id: string;
        title: string;
        description?: string;
        visibility?: string;
        default_model?: string;
        multi_model?: boolean;
        project_rules?: string;
    };
    onUpdateRules: (id: string, rules: string) => void;
}

export function ProjectDetailsPanel({
    onClose,
    project,
    onUpdateRules,
}: ProjectDetailsPanelProps) {
    const [rules, setRules] = useState(project.project_rules || "");
    const [saving, setSaving] = useState(false);

    const handleSaveRules = async () => {
        setSaving(true);
        await updateProjectRules(project.id, rules);
        onUpdateRules(project.id, rules);
        setSaving(false);
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
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-white font-semibold text-lg tracking-tight">
                                Project Details
                            </h2>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold opacity-70">Workspace</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 no-scrollbar">

                    {/* Title & Description */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-xl font-bold text-white">{project.title}</h3>
                        {project.description ? (
                            <p className="text-sm text-neutral-400 leading-relaxed bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/50 font-medium">
                                {project.description}
                            </p>
                        ) : (
                            <p className="text-sm text-neutral-600 italic">No description provided.</p>
                        )}
                    </div>

                    <div className="w-full h-px bg-neutral-800/50" />

                    {/* Project Pinning (Rules) */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Project Rules</h4>
                            </div>
                            <button
                                onClick={handleSaveRules}
                                disabled={saving || rules === project.project_rules}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-white text-black px-4 py-1.5 rounded-full hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-lg shadow-white/5"
                            >
                                <Save className="w-3 h-3" />
                                {saving ? "Saving..." : "Save Rules"}
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={rules}
                                onChange={(e) => setRules(e.target.value)}
                                placeholder="Paste project guidelines, tech stack preferred, or behavior rules here. These are pinned to every model's memory..."
                                className="w-full h-40 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-all resize-none font-medium leading-relaxed"
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-neutral-800/50" />

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold opacity-70">Visibility</span>
                            <div className="flex items-center gap-2 text-sm text-neutral-200 bg-neutral-900/50 px-3 py-2.5 rounded-lg border border-neutral-800/50 font-medium">
                                {project.visibility === "team" ? "Team" : "Private"}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold opacity-70">Base Model</span>
                            <div className="flex items-center gap-2 text-sm text-neutral-200 bg-neutral-900/50 px-3 py-2.5 rounded-lg border border-neutral-800/50 truncate font-medium">
                                <span className="truncate">{project.default_model || "Default"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Model Status */}
                    <div className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-xl">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-white">Multi-Model</span>
                                <Tooltip content="When enabled, you can @mention 'Everyone' in the chat input to send your prompt to all AI models simultaneously.">
                                    <Info className="w-3.5 h-3.5 text-neutral-500 hover:text-neutral-300 transition-colors cursor-help" />
                                </Tooltip>
                            </div>
                            <span className="text-[11px] text-neutral-500">Cross-model collaboration</span>
                        </div>
                        <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${project.multi_model ? 'bg-green-500/10 text-green-500' : 'bg-neutral-800 text-neutral-500'}`}>
                            {project.multi_model ? 'Enabled' : 'Disabled'}
                        </div>
                    </div>

                </div>
            </motion.div>
        </>
    );
}
