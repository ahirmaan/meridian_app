"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileUp, Trash2, Library, File, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { ProjectFile, loadProjectFiles, addProjectFile, deleteProjectFile } from "../../lib/chatService";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface FileLibraryProps {
    projectId: string;
    onSelect?: (file: ProjectFile) => void;
    className?: string;
}

export function FileLibrary({ projectId, onSelect, className }: FileLibraryProps) {
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchFiles = async () => {
            setLoading(true);
            const data = await loadProjectFiles(projectId);
            setFiles(data);
            setLoading(false);
        };
        fetchFiles();
    }, [projectId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (!selectedFiles.length) return;

        setUploading(true);
        for (const file of selectedFiles) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const newFile = await addProjectFile(projectId, file.name, file.type, base64String);
                if (newFile) {
                    setFiles(prev => [newFile, ...prev]);
                }
            };
            reader.readAsDataURL(file);
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = async (e: React.MouseEvent, fileId: string) => {
        e.stopPropagation();
        if (confirm("Delete this file from library?")) {
            await deleteProjectFile(fileId);
            setFiles(prev => prev.filter(f => f.id !== fileId));
        }
    };

    return (
        <div className={cn("flex flex-col gap-4", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-neutral-400" />
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">File Library</h4>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg hover:bg-neutral-700 hover:text-white transition-all border border-neutral-700/50"
                >
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
                    Upload
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    multiple
                    className="hidden"
                    accept="image/*,.txt,.pdf,.csv,.json,.md"
                />
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="col-span-2 py-8 flex flex-col items-center justify-center gap-2 opacity-50">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                            <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Syncing Library...</span>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="col-span-2 py-10 border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-3">
                            <Library className="w-6 h-6 text-neutral-700" />
                            <div className="text-center px-6">
                                <p className="text-xs text-neutral-500 font-medium">Your library is empty</p>
                                <p className="text-[10px] text-neutral-600 mt-1">Upload files to use them in this project</p>
                            </div>
                        </div>
                    ) : (
                        files.map((file) => (
                            <motion.div
                                key={file.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => onSelect?.(file)}
                                className={cn(
                                    "group relative aspect-square bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden cursor-pointer hover:border-neutral-600 transition-all",
                                    onSelect && "hover:ring-1 hover:ring-white/10"
                                )}
                            >
                                {file.type.startsWith("image/") ? (
                                    <img src={file.data} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                        <File className="w-8 h-8 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
                                        <span className="text-[10px] text-neutral-500 mt-2 text-center line-clamp-2 px-2 font-medium break-all">
                                            {file.name}
                                        </span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-between p-2">
                                    <span className="text-[9px] text-neutral-300 font-medium truncate max-w-[70%]">{file.name}</span>
                                    <button
                                        onClick={(e) => handleDelete(e, file.id)}
                                        className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
