"use client";

import React from "react";
import { X, FileText, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export interface Attachment {
    id: string;
    type: string;
    name: string;
    data: string;
}

interface FileAttachmentPillProps {
    attachment: Attachment;
    onRemove: (id: string) => void;
}

export function FileAttachmentPill({ attachment, onRemove }: FileAttachmentPillProps) {
    const isImage = attachment.type.startsWith("image/");

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg p-1.5 pr-8 min-w-[120px] max-w-[200px]"
        >
            <div className="w-8 h-8 rounded shrink-0 bg-neutral-900 flex items-center justify-center overflow-hidden">
                {isImage ? (
                    <img
                        src={attachment.data}
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <FileText className="w-4 h-4 text-neutral-400" />
                )}
            </div>
            <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-medium text-white truncate w-full">
                    {attachment.name}
                </span>
                <span className="text-[10px] text-neutral-400 uppercase">
                    {isImage ? "Image" : "Document"}
                </span>
            </div>
            <button
                onClick={() => onRemove(attachment.id)}
                className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-full bg-neutral-900/50 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
                <X className="w-3 h-3" />
            </button>
        </motion.div>
    );
}
