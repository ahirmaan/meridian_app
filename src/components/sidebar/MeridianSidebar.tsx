"use client";

import { supabase } from "../../lib/supabase";
import { useState, useRef, useEffect } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Popover } from "../ui/Popover";
import { AVAILABLE_MODELS } from "../../lib/models";
import { getModelLogoSrc } from "../../lib/modelLogos";
import {
  Plus,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Search,
  Lock,
  Unlock,
  Shield,
  ArrowRight,
  Info,
  ChevronDown,
  Check,
  Pin,
  PinOff,
  FolderGit2,
} from "lucide-react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "../ui/sidebar";
import { cn } from "../../lib/utils";
import { SettingsPanel } from "./SettingsPanel";
import { Tooltip } from "../ui/Tooltip";

interface Chat {
  id: string;
  title: string;
  type: "chat" | "project";
  is_pinned?: boolean;
}

interface MeridianSidebarProps {
  regularChats: Chat[];
  lockedChats: Chat[];
  isLockedFolderUnlocked: boolean;
  setIsLockedFolderUnlocked: (v: boolean) => void;
  passcodeExists: boolean;
  setPasscodeExists: (v: boolean) => void;
  viewingLockedFolder: boolean;
  setViewingLockedFolder: (v: boolean) => void;
  activeChatId?: string | null;
  onNewChat: () => void;
  onNewProject: (project: { name: string; description: string; model: string; multiModel: boolean }) => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChat: (id: string) => void;
  onMoveToLocked: (id: string) => void;
  defaultModel: string;
  setDefaultModel: (id: string) => void;
}

export function MeridianSidebar({
  regularChats,
  lockedChats,
  isLockedFolderUnlocked,
  setIsLockedFolderUnlocked,
  passcodeExists,
  setPasscodeExists,
  viewingLockedFolder,
  setViewingLockedFolder,
  activeChatId,
  onNewChat,
  onNewProject,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onMoveToLocked,
  defaultModel,
  setDefaultModel,
}: MeridianSidebarProps) {
  const [open, setOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [passcodeSetupModalOpen, setPasscodeSetupModalOpen] = useState(false);
  const [passcodeAuthModalOpen, setPasscodeAuthModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);

  // Shared modal states for chat items
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; chatId: string; chatTitle: string }>({ isOpen: false, chatId: "", chatTitle: "" });

  const handleLockedFolderClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!passcodeExists) {
      setPasscodeSetupModalOpen(true);
      return;
    }

    if (!isLockedFolderUnlocked) {
      setPasscodeAuthModalOpen(true);
      return;
    }

    setViewingLockedFolder(!viewingLockedFolder);
  };

  const handleMoveToLockedClick = (id: string) => {
    const chatToMove = [...regularChats, ...lockedChats].find(c => c.id === id);
    if (!chatToMove) return;

    // If it's already locked, we don't need to check passcode to move it back to regular?
    // Actually, for consistency, let's check if they are in the locked folder view.
    const isCurrentlyLocked = lockedChats.some(c => c.id === id);

    if (!isCurrentlyLocked) {
      if (!passcodeExists) {
        setPendingMoveId(id);
        setPasscodeSetupModalOpen(true);
        return;
      }

      if (!isLockedFolderUnlocked) {
        setPendingMoveId(id);
        setPasscodeAuthModalOpen(true);
        return;
      }
    }

    onMoveToLocked(id);
  };

  return (
    <>
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className={cn("justify-between gap-6 bg-neutral-950 border-r border-neutral-800 z-40 relative", !open && "items-center")}>
          <div className="flex flex-col flex-1 overflow-hidden w-full">
            <MeridianLogo open={open} />

            <div className={cn("mt-6 flex flex-col gap-1", !open && "items-center")}>
              <TopActionButton
                open={open}
                icon={<Plus className="w-4 h-4 flex-shrink-0" />}
                label="New Chat"
                onClick={onNewChat}
              />
              <TopActionButton
                open={open}
                icon={<FolderPlus className="w-4 h-4 flex-shrink-0" />}
                label="New Project"
                onClick={() => setNewProjectModalOpen(true)}
              />
              <TopActionButton
                open={open}
                icon={isLockedFolderUnlocked ? <Unlock className="w-4 h-4 flex-shrink-0" /> : <Lock className="w-4 h-4 flex-shrink-0" />}
                label="Locked Folder"
                onClick={handleLockedFolderClick}
              />
            </div>

            <div className={cn("mt-4", !open && "flex justify-center")}>
              <TopActionButton
                open={open}
                icon={<Search className="w-4 h-4 flex-shrink-0" />}
                label="Search Chats"
                onClick={() => setSearchModalOpen(true)}
              />
            </div>

            {open && (
              <div className="mt-6 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
                {viewingLockedFolder && isLockedFolderUnlocked ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between px-2 pb-1">
                      <p className="text-[11px] text-neutral-400 tracking-wider uppercase flex items-center gap-1.5 font-bold opacity-80">
                        Locked Chats
                      </p>
                      <button
                        onClick={() => setViewingLockedFolder(false)}
                        className="text-[10px] text-neutral-500 hover:text-white transition-colors"
                      >
                        Back
                      </button>
                    </div>
                    {lockedChats.length > 0 ? (
                      lockedChats.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === activeChatId}
                          onSelect={() => onSelectChat(chat.id)}
                          onRenameRequest={(title) => onRenameChat(chat.id, title)}
                          onDeleteRequest={(title) => {
                            console.log("Delete button clicked for locked chat!", title);
                            setDeleteModalState({ isOpen: true, chatId: chat.id, chatTitle: title });
                          }}
                          onMoveToLocked={() => handleMoveToLockedClick(chat.id)}
                          isLocked={true}
                        />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 opacity-60">
                        <span className="text-sm text-neutral-400">No Files in Locked Folder</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-neutral-400 px-2 pb-1 tracking-wider uppercase font-bold opacity-80">
                      Past Chats
                    </p>
                    {regularChats.length > 0 ? (
                      [...regularChats]
                        .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
                        .map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === activeChatId}
                            onSelect={() => onSelectChat(chat.id)}
                            onRenameRequest={(title) => onRenameChat(chat.id, title)}
                            onDeleteRequest={(title) => {
                              console.log("Delete button clicked for regular chat!", title);
                              setDeleteModalState({ isOpen: true, chatId: chat.id, chatTitle: title });
                            }}
                            onMoveToLocked={() => handleMoveToLockedClick(chat.id)}
                            isLocked={false}
                          />
                        ))
                    ) : (
                      <p className="text-[11px] text-neutral-500 px-2 py-4 text-center italic opacity-60">
                        No chats found
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <ProfileFooter open={open} defaultModel={defaultModel} setDefaultModel={setDefaultModel} setPasscodeExists={setPasscodeExists} />
        </SidebarBody>
      </Sidebar>

      {newProjectModalOpen && createPortal(
        <NewProjectModal
          onClose={() => {
            console.log("Closing NewProjectModal");
            setNewProjectModalOpen(false);
          }}
          onConfirm={(project) => {
            console.log("Confirming NewProjectModal:", project);
            onNewProject(project);
            setNewProjectModalOpen(false);
          }}
        />,
        document.body
      )}

      {passcodeSetupModalOpen && createPortal(
        <PasscodeSetupModal
          onClose={() => {
            setPasscodeSetupModalOpen(false);
            setPendingMoveId(null);
          }}
          onSuccess={() => {
            setPasscodeExists(true);
            setPasscodeSetupModalOpen(false);
            // After setup, we need to unlock
            setPasscodeAuthModalOpen(true);
          }}
        />,
        document.body
      )}
      {passcodeAuthModalOpen && createPortal(
        <PasscodeAuthModal
          onClose={() => {
            setPasscodeAuthModalOpen(false);
            setPendingMoveId(null);
          }}
          onSuccess={() => {
            setIsLockedFolderUnlocked(true);
            setPasscodeAuthModalOpen(false);
            if (pendingMoveId) {
              onMoveToLocked(pendingMoveId);
              setPendingMoveId(null);
            } else {
              setViewingLockedFolder(true);
            }
          }}
        />,
        document.body
      )}
      {searchModalOpen && createPortal(
        <SearchModal
          onClose={() => {
            console.log("Closing SearchModal");
            setSearchModalOpen(false);
          }}
          chats={[...regularChats, ...(isLockedFolderUnlocked ? lockedChats : [])]}
          onSelectChat={(id) => {
            console.log("Selecting chat from SearchModal:", id);
            onSelectChat(id);
            setSearchModalOpen(false);
          }}
        />,
        document.body
      )}

      {/* Always render the Portal, but conditionally render its children with AnimatePresence */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {deleteModalState.isOpen && (
            <DeleteConfirmModal
              chatTitle={deleteModalState.chatTitle}
              onCancel={() => {
                setDeleteModalState({ ...deleteModalState, isOpen: false });
              }}
              onConfirm={() => {
                onDeleteChat(deleteModalState.chatId);
                setDeleteModalState({ ...deleteModalState, isOpen: false });
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function MeridianLogo({ open }: { open: boolean }) {
  const content = (
    <div className={cn("flex items-center py-2", open ? "px-1 gap-2" : "justify-center")}>
      <img
        src="/logo.png"
        alt="Meridian Logo"
        className="h-5 w-5 object-contain flex-shrink-0"
      />

      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="font-semibold text-white text-sm whitespace-nowrap overflow-hidden"
          >
            Meridian
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  if (!open) {
    return (
      <Tooltip content="Meridian" delay={300}>
        {content}
      </Tooltip>
    );
  }

  return content;
}

function TopActionButton({
  open,
  icon,
  label,
  onClick,
  className,
}: {
  open: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all duration-200 group",
        open ? "px-2 py-2 gap-3 w-full text-left" : "w-10 h-10 justify-center mx-auto",
        className
      )}
    >
      {icon}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-sm whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  if (!open) {
    return (
      <Tooltip content={label} delay={300}>
        {content}
      </Tooltip>
    );
  }

  return content;
}

function ChatItem({
  chat,
  isActive,
  onSelect,
  onRenameRequest,
  onDeleteRequest,
  onMoveToLocked,
  isLocked,
}: {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onRenameRequest: (title: string) => void;
  onDeleteRequest: (title: string) => void;
  onMoveToLocked: () => void;
  isLocked: boolean;
  key?: string | number;
}) {
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameRequest(trimmed); // We use the prop to commit the rename directly, saving us from using a modal
    setRenaming(false);
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200",
          isActive
            ? "bg-neutral-800 text-white"
            : "hover:bg-neutral-900 text-neutral-400"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); }}
        onClick={() => { if (!renaming) onSelect(); }}
      >
        {isActive && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-neutral-500 rounded-full" />
        )}

        {renaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenameValue(chat.title);
                setRenaming(false);
              }
            }}
            onBlur={commitRename}
            className="flex-1 bg-transparent text-sm text-white outline-none border-b border-neutral-600 pb-0.5"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={cn(
            "flex-1 text-sm truncate flex items-center gap-2",
            isActive ? "text-neutral-100 font-medium ml-1" : "text-neutral-400"
          )}>
            {chat.type === "project" && <FolderGit2 className="w-3.5 h-3.5 text-neutral-400 opacity-70 flex-shrink-0" />}
            <span className="truncate">{chat.title}</span>
            {chat.is_pinned && <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-500/20" />}
          </span>
        )}

        {!renaming && (
          <div className="flex items-center gap-1">
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center"
                >
                  <Popover
                    align="right"
                    trigger={
                      <Tooltip content="Options" delay={300}>
                        <button
                          className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    }
                  >
                    {(close) => (
                      <div className="flex flex-col">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            close();
                            setRenaming(true);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors text-left"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            close();
                            onMoveToLocked();
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors text-left"
                        >
                          {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {isLocked ? "Remove from Locked Folder" : "Move to Locked Folder"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            close();
                            onDeleteRequest(chat.title);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 transition-colors text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </Popover>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}

function DeleteConfirmModal({
  chatTitle,
  onCancel,
  onConfirm,
}: {
  chatTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-[400px] shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>

        <h2 className="text-white font-semibold text-xl mb-2">
          Delete Chat
        </h2>
        <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
          Are you sure you want to delete &ldquo;{chatTitle}&rdquo;? This action cannot be undone and all messages will be lost.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-neutral-800 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NewProjectModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (project: { name: string; description: string; model: string; multiModel: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState(AVAILABLE_MODELS[0].id);
  const [multiModel, setMultiModel] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-[480px] shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">New Project</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-500 uppercase tracking-widest font-medium">Project Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 placeholder:text-neutral-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-500 uppercase tracking-widest font-medium">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 placeholder:text-neutral-700 h-20 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-500 uppercase tracking-widest font-medium">Project Model</label>
            <Popover
              align="left"
              className="w-[416px]"
              trigger={
                <button
                  className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white hover:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const logo = getModelLogoSrc(model);
                      return logo ? <img src={logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" /> : null;
                    })()}
                    <span className="text-sm">
                      {AVAILABLE_MODELS.find((m) => m.id === model)?.label || "Select model"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </button>
              }
            >
              {(close) => (
                <div className="flex flex-col max-h-[300px] overflow-y-auto no-scrollbar">
                  {AVAILABLE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModel(m.id);
                        close();
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-neutral-800",
                        model === m.id ? "bg-neutral-800" : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const logo = getModelLogoSrc(m.id);
                          return logo ? <img src={logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" /> : null;
                        })()}
                        <div className="flex flex-col">
                          <span className="text-sm text-white">{m.label}</span>
                          <span className="text-[10px] text-neutral-500">{m.provider}</span>
                        </div>
                      </div>
                      {model === m.id && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-300">Multi-model mode</span>
                <Tooltip content="When enabled, you can @mention 'Everyone' in the chat input to send your prompt to all AI models simultaneously.">
                  <Info className="w-3.5 h-3.5 text-neutral-500 hover:text-neutral-300 transition-colors cursor-help" />
                </Tooltip>
              </div>
              <span className="text-[10px] text-neutral-600">Enable collaboration across models</span>
            </div>
            <button
              onClick={() => setMultiModel(!multiModel)}
              className={cn(
                "w-10 h-5 rounded-full transition-colors relative",
                multiModel ? "bg-white" : "bg-neutral-800"
              )}
            >
              <div className={cn(
                "absolute top-1 w-3 h-3 rounded-full transition-all",
                multiModel ? "right-1 bg-black" : "left-1 bg-neutral-500"
              )} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-neutral-800 text-sm text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => onConfirm({ name, description, model, multiModel })}
            className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PasscodeSetupModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
      setError("Passcode must be exactly 4 digits.");
      return;
    }
    if (passcode !== confirm) {
      setError("Passcodes do not match.");
      return;
    }
    // TODO: Replace localStorage with encrypted secure storage in production
    localStorage.setItem("meridian_passcode", passcode);
    onSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-[360px] shadow-2xl flex flex-col items-center text-center"
      >
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-white font-bold text-xl mb-1">Set a Passcode</h2>
        <p className="text-neutral-500 text-sm mb-6">Create a 4-digit code to protect your private chats.</p>

        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">New Passcode</label>
            <input
              type="password"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-center text-xl tracking-[1em] text-white focus:outline-none focus:ring-1 focus:ring-neutral-700"
            />
          </div>
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">Confirm Passcode</label>
            <input
              type="password"
              maxLength={4}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-center text-xl tracking-[1em] text-white focus:outline-none focus:ring-1 focus:ring-neutral-700"
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        <button
          onClick={handleSave}
          disabled={passcode.length !== 4 || confirm.length !== 4}
          className="w-full mt-8 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          Save Passcode
        </button>
      </motion.div>
    </motion.div>
  );
}

function PasscodeAuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);
    setError(false);

    if (val && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  useEffect(() => {
    if (digits.every(d => d !== "")) {
      const entered = digits.join("");
      const stored = localStorage.getItem("meridian_passcode");
      if (entered === stored) {
        onSuccess();
      } else {
        setError(true);
        setDigits(["", "", "", ""]);
        inputRefs[0].current?.focus();
      }
    }
  }, [digits, onSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className={cn(
          "relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-[360px] shadow-2xl flex flex-col items-center text-center",
          error && "animate-shake border-red-500/50"
        )}
      >
        <h2 className="text-white font-bold text-xl mb-1">Enter Passcode</h2>
        <p className="text-neutral-500 text-sm mb-8">Unlock your private chats.</p>

        <div className="flex gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                "w-[50px] h-[50px] bg-neutral-950 border border-neutral-800 rounded-lg text-center text-xl text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all",
                error && "border-red-500"
              )}
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-xs mt-4">Incorrect passcode. Try again.</p>}
      </motion.div>
    </motion.div>
  );
}

function SearchModal({
  onClose,
  chats,
  onSelectChat,
}: {
  onClose: () => void;
  chats: Chat[];
  onSelectChat: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      if (filtered[selectedIndex]) onSelectChat(filtered[selectedIndex].id);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-[460px] shadow-2xl flex flex-col"
      >
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            autoFocus
            placeholder="Search chats..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 placeholder:text-neutral-700"
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto no-scrollbar flex flex-col gap-1">
          {filtered.length > 0 ? (
            filtered.map((chat, i) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left",
                  i === selectedIndex ? "bg-neutral-800" : "hover:bg-neutral-800/50"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-white font-medium">{chat.title}</span>
                  <span className="text-xs text-neutral-500 truncate max-w-[300px]">Last message preview...</span>
                </div>
                <span className="text-[10px] text-neutral-600">2m ago</span>
              </button>
            ))
          ) : (
            <p className="text-center py-8 text-neutral-600 text-sm italic">No chats found for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ProfileFooter({ open, defaultModel, setDefaultModel, setPasscodeExists }: { open: boolean; defaultModel: string; setDefaultModel: (id: string) => void; setPasscodeExists: (v: boolean) => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    // Listen for auth changes to keep user data fresh
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarUrl = user?.user_metadata?.avatar_url || null;

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<'General' | 'Personalization' | 'Knowledge' | 'Security' | 'Account'>('General');

  // Unified footer button rendering
  const footerButton = (
    <button
      onClick={() => setDropdownOpen(!dropdownOpen)}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-all group",
        dropdownOpen && "bg-neutral-800",
        !open && "w-10 h-10 justify-center mx-auto"
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-semibold">
          {initials}
        </div>
      )}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-neutral-200 whitespace-nowrap truncate"
          >
            {displayName}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  return (
    <div ref={ref} className={cn("relative", !open && "w-full flex justify-center")}>
      {!open ? (
        <Tooltip content={displayName} delay={300}>
          {footerButton}
        </Tooltip>
      ) : (
        footerButton
      )}

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-2 left-0 w-48 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 z-50"
          >
            <button
              onClick={() => {
                setDropdownOpen(false);
                setInitialSettingsTab('Account');
                setSettingsOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              Account
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false);
                setInitialSettingsTab('General');
                setSettingsOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              Settings
            </button>
            <div className="my-1 border-t border-neutral-800" />
            <button
              onClick={async () => {
                setDropdownOpen(false);

                const { error } = await supabase.auth.signOut();

                if (error) {
                  console.error("Logout failed:", error.message);
                  return;
                }

                window.location.href = "/";
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 transition-colors"
            >
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsPanel
            onClose={() => setSettingsOpen(false)}
            defaultModel={defaultModel}
            setDefaultModel={setDefaultModel}
            onPasscodeChange={() => setPasscodeExists(true)}
            initialTab={initialSettingsTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
