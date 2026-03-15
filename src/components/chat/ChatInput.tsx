"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import React from "react";
import { ArrowUpIcon, X, Paperclip, AlertTriangle, File as FileIcon } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../ui/Tooltip";
import { AVAILABLE_MODELS } from "../../lib/models";
import { getModelLogoSrc } from "../../lib/modelLogos";
import { Attachment, FileAttachmentPill } from "./FileAttachmentPill";

interface ChatInputProps {
  onSend: (message: string, modelId: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  sendDisabled?: boolean;
  placeholder?: string;
  isNewChat?: boolean;
  isMultiModel?: boolean;
  value?: string;
  onChange?: (val: string) => void;

  defaultModel: string;
  pinnedModel: string | null;
  setPinnedModel: (model: string | null) => void;
  projectFiles?: any[];
}

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback((reset?: boolean) => {
    const el = textareaRef.current;
    if (!el) return;
    if (reset) { el.style.height = `${minHeight}px`; return; }
    el.style.height = `${minHeight}px`;
    el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, maxHeight ?? Infinity))}px`;
  }, [minHeight, maxHeight]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handler = () => adjustHeight();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

export const ChatInput = forwardRef(({
  onSend,
  disabled,
  sendDisabled,
  placeholder = "Message Meridian...",
  isNewChat = false,
  isMultiModel = false,
  value: controlledValue,
  onChange: controlledOnChange,
  defaultModel,
  pinnedModel,
  setPinnedModel,
  projectFiles = []
}: ChatInputProps, ref) => {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileMentionSearch, setFileMentionSearch] = useState("");
  const [showFileMentions, setShowFileMentions] = useState(false);
  const [fileSelectedIndex, setFileSelectedIndex] = useState(0);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: isNewChat ? 100 : 56,
    maxHeight: 200
  });

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  const setValue = (val: string) => {
    if (controlledOnChange) {
      controlledOnChange(val);
    } else {
      setInternalValue(val);
    }
  };
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const availableModels = isMultiModel
    ? [...AVAILABLE_MODELS, { id: "everyone", label: "Everyone", provider: "System" }]
    : AVAILABLE_MODELS;

  const filteredModels = availableModels.filter(m =>
    m.label.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    m.provider.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const filteredFiles = projectFiles.filter(f =>
    f.name.toLowerCase().includes(fileMentionSearch.toLowerCase())
  );

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || sendDisabled) return;

    let modelToUse = pinnedModel ?? defaultModel;

    console.log("[ChatInput Debug] pinnedModel:", pinnedModel, "| defaultModel:", defaultModel, "| modelToUse:", modelToUse);

    // Detect mention
    const mentionMatches = trimmed.match(/@([^\s]+)/g);

    if (mentionMatches && mentionMatches.length > 0) {
      const clean = mentionMatches[0]
        .replace("@", "")
        .toLowerCase();

      const match = availableModels.find(m =>
        m.id.toLowerCase().includes(clean) ||
        m.label.toLowerCase().includes(clean)
      );

      if (match) {
        modelToUse = match.id;

        if (pinnedModel !== match.id) {
          setPinnedModel(match.id);
        }
      }
    }

    console.log(`[ChatInput] User triggered send with Model: ${modelToUse} (Reason: ${pinnedModel ? 'Pinned' : 'Default'})`);
    onSend(trimmed, modelToUse, attachments);

    setValue("");
    setAttachments([]);
    adjustHeight(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substring(7),
          type: file.type || "application/octet-stream",
          name: file.name,
          data: base64String
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset input
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const insertMention = (modelLabel: string) => {
    const parts = value.split("@");
    parts.pop();
    const newValue = parts.join("@") + "@" + modelLabel + " ";
    setValue(newValue);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const insertFileMention = (file: any) => {
    const parts = value.split("#");
    parts.pop();
    const newValue = parts.join("#"); // Remove the #query part
    setValue(newValue);
    setShowFileMentions(false);

    // Add to attachments if not already there
    setAttachments(prev => {
      if (prev.find(a => a.id === file.id)) return prev;
      return [...prev, {
        id: file.id,
        type: file.type,
        name: file.name,
        data: file.data
      }];
    });

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredModels.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredModels.length) % filteredModels.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredModels[selectedIndex]) {
          insertMention(filteredModels[selectedIndex].label);
        }
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
      return;
    }

    if (showFileMentions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFileSelectedIndex((prev) => (prev + 1) % filteredFiles.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFileSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % filteredFiles.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredFiles[fileSelectedIndex]) {
          insertFileMention(filteredFiles[fileSelectedIndex]);
        }
      } else if (e.key === "Escape") {
        setShowFileMentions(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
    adjustHeight();

    const words = val.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setShowMentions(true);
      setShowFileMentions(false);
      setMentionSearch(lastWord.slice(1));
      setSelectedIndex(0);
    } else if (lastWord.startsWith("#")) {
      setShowFileMentions(true);
      setShowMentions(false);
      setFileMentionSearch(lastWord.slice(1));
      setFileSelectedIndex(0);
    } else {
      setShowMentions(false);
      setShowFileMentions(false);
    }
  };

  return (
    <div className={cn(
      "w-full transition-all duration-300",
      isNewChat ? "max-w-[768px]" : "max-w-3xl mx-auto"
    )}>

      {pinnedModel && (
        <div className="flex flex-col gap-2 mb-2 px-2">
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-full px-3 py-1 text-xs text-neutral-300">
              {(() => {
                const logo = getModelLogoSrc(pinnedModel);
                return logo ? <img src={logo} alt="" className="w-3.5 h-3.5 object-contain" /> : null;
              })()}
              <span>
                {
                  availableModels.find(m => m.id === pinnedModel)?.label
                }
              </span>
              <button
                type="button"
                onClick={() => setPinnedModel(null)}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {pinnedModel === "everyone" && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: -8 }}
              animate={{ opacity: 1, height: "auto", marginTop: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: -8 }}
              className="flex items-center gap-2 text-[11px] text-amber-500/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-1.5 self-start"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span><strong>Warning:</strong> Sending prompts to everyone uses <strong>3x more tokens</strong>. Use sparingly!</span>
            </motion.div>
          )}
        </div>
      )}

      <div className="relative">
        <AnimatePresence>
          {showMentions && filteredModels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-2 left-0 w-[220px] bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              {filteredModels.map((m, i) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => insertMention(m.label.split(' ')[0])}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between",
                    i === selectedIndex ? "bg-neutral-800 text-white" : "text-neutral-400"
                  )}
                >
                  <div className="flex items-center gap-2 text-xs">
                    {(() => {
                      const logo = getModelLogoSrc(m.id);
                      return logo ? <img src={logo} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" /> : null;
                    })()}
                    <span className="font-medium">{m.label}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {showFileMentions && filteredFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-2 left-0 w-[240px] bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto no-scrollbar"
            >
              <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-900/50">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Project Library</span>
              </div>
              {filteredFiles.map((f, i) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => insertFileMention(f)}
                  onMouseEnter={() => setFileSelectedIndex(i)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2",
                    i === fileSelectedIndex ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {f.type.startsWith("image/") ? (
                    <img src={f.data} alt="" className="w-5 h-5 rounded object-cover border border-neutral-700" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <FileIcon className="w-3 h-3" />
                    </div>
                  )}
                  <span className="text-xs truncate font-medium">{f.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending Attachments UI */}
        {attachments.length > 0 && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 flex flex-wrap gap-2 w-full max-h-[160px] overflow-y-auto no-scrollbar">
            <AnimatePresence>
              {attachments.map(att => (
                <FileAttachmentPill key={att.id} attachment={att} onRemove={removeAttachment} />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className={cn(
          "relative flex bg-neutral-900 border border-neutral-800 transition-all duration-300",
          isNewChat ? "rounded-[24px] items-end" : "rounded-[50px] items-center"
        )}>
          {/* Hidden File Input */}
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.txt,.pdf,.csv,.json,.md,.js,.ts,.tsx,.jsx"
          />
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full resize-none bg-transparent border-none text-white text-sm",
              "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-500",
              isNewChat ? "min-h-[100px] px-6 pt-4 pb-14 pr-16" : "min-h-[56px] px-6 py-4 pl-12 pr-16"
            )}
            style={{ overflow: "hidden" }}
          />
          <Tooltip content="Attach file" delay={300} className={cn(
            "absolute",
            isNewChat ? "left-3 bottom-3" : "left-3 top-1/2 -translate-y-1/2"
          )}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 -ml-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip
            content="Send Message"
            delay={300}
            className={cn(
              "absolute right-3",
              isNewChat ? "bottom-3" : "top-1/2 -translate-y-1/2"
            )}
          >
            <button
              type="button"
              onClick={handleSend}
              disabled={(!value.trim() && attachments.length === 0) || disabled || sendDisabled}
              className={cn(
                "w-9 h-9 rounded-[50px] flex items-center justify-center transition-all duration-200",
                (value.trim() || attachments.length > 0) && !disabled && !sendDisabled
                  ? "bg-white text-black hover:bg-neutral-200"
                  : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
              )}
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
