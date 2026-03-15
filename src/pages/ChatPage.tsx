"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import { X, Pencil, Lock, Unlock, Trash2, Settings, ClipboardList, ChevronDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages, Message, Attachment } from "../components/chat/ChatMessages";
import { ChatInput } from "../components/chat/ChatInput";
import { ChatSettingsPanel } from "../components/chat/ChatSettingsPanel";
import { ProjectDetailsPanel } from "../components/chat/ProjectDetailsPanel";
import { Popover } from "../components/ui/Popover";
import { Tooltip } from "../components/ui/Tooltip";
import { useSettings } from "../lib/settingsStore";
import { useAutoLock } from "../hooks/useAutoLock";
import { ThoughtParticles } from "../components/ui/ThoughtParticles";
import { ArtifactPreview } from "../components/chat/ArtifactPreview";
import { MeridianSidebar } from "../components/sidebar/MeridianSidebar";
import { AVAILABLE_MODELS } from "../lib/models";
import { supabase, supabaseEnabled } from "../lib/supabase";
import {
  loadChats,
  createChat,
  renameChat as dbRenameChat,
  deleteChat as dbDeleteChat,
  toggleChatLocked,
  loadMessages,
  saveMessage,
  updateChatTimestamp,
  deleteMessagesForChat,
  loadProjectFiles,
  type ProjectFile
} from "../lib/chatService";

let msgCounter = 0;
interface Chat {
  id: string;
  title: string;
  type: "chat" | "project";
  description?: string;
  visibility?: string;
  default_model?: string;
  multi_model?: boolean;
  project_rules?: string;
  is_pinned?: boolean;
  show_thought_trace?: boolean;
}

const GREETINGS = [
  "What are we building today?",
  "Ready to collaborate across models?",
  "Let's create something powerful.",
  "What problem are we solving?",
  "Start a new conversation.",
];

export default function ChatPage() {
  const { settings } = useSettings();

  const [regularChats, setRegularChats] = useState<Chat[]>([]);
  const [lockedChats, setLockedChats] = useState<Chat[]>([]);
  const [isLockedFolderUnlocked, setIsLockedFolderUnlocked] = useState(false);
  const [viewingLockedFolder, setViewingLockedFolder] = useState(false);

  useAutoLock(settings.autoLockTimer, () => {
    setIsLockedFolderUnlocked(false);
    setViewingLockedFolder(false);
    console.log("[ChatPage] Auto-locked due to inactivity");
  });

  const [passcodeExists, setPasscodeExists] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [storedPasscode, setStoredPasscode] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<{ focus: () => void }>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [defaultModel, setDefaultModel] = useState(
    AVAILABLE_MODELS[0].id
  );
  const [pinnedModel, setPinnedModel] = useState<string | null>(null);

  const handleSetDefaultModel = (model: string) => {
    setDefaultModel(model);
    setPinnedModel(null);
  };

  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [artifact, setArtifact] = useState<{ code: string; language: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenLimitReached, setTokenLimitReached] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load user, workspaces, and initial chats on mount
  useEffect(() => {
    setIsLockedFolderUnlocked(false);
    const savedPasscode = localStorage.getItem("meridian_passcode");
    setPasscodeExists(!!savedPasscode);
    setStoredPasscode(savedPasscode);
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);

  // Initialize User
  useEffect(() => {
    const initUser = async (retries = 3) => {
      if (!supabaseEnabled || !supabase) return;

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (!user) {
          // If no user, check session directly (sometimes getUser fails on skew)
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUserId(session.user.id);
            setAuthError(null);
            return;
          }

          if (retries > 0) {
            console.log(`[Auth] No user found, retrying in 1s... (${retries} left)`);
            setTimeout(() => initUser(retries - 1), 1000);
          } else {
            setAuthError("Authentication failed. Please refresh or check your system clock.");
          }
        } else {
          setUserId(user.id);
          setAuthError(null);
        }
      } catch (err: any) {
        console.error("[Auth] Initialization error:", err);
        if (err.message?.includes("future")) {
          setAuthError("Clock Sync Error: Your device clock is out of sync. Please update time settings and refresh.");
        } else if (retries > 0) {
          setTimeout(() => initUser(retries - 1), 1000);
        } else {
          setAuthError("Session error. Please log in again.");
        }
      }
    };
    initUser();
  }, []);

  // Fetch chats whenever user changes
  useEffect(() => {
    const fetchChats = async () => {
      if (!userId) return;

      const dbChats = await loadChats(userId);
      const regular: Chat[] = [];
      const locked: Chat[] = [];
      for (const c of dbChats) {
        const chat: Chat = {
          id: c.id,
          title: c.title,
          type: c.type,
          description: c.description,
          visibility: c.visibility,
          default_model: c.default_model,
          multi_model: c.multi_model,
          project_rules: c.project_rules,
          is_pinned: c.is_pinned,
          show_thought_trace: c.show_thought_trace !== false, // default true
        };
        console.log(`[ChatPage] Loaded chat ${c.id}`);
        if (c.is_locked) {
          locked.push(chat);
        } else {
          regular.push(chat);
        }
      }
      setRegularChats(regular);
      setLockedChats(locked);

      // If we switched workspaces, our active chat might not exist here anymore
      if (activeChatId) {
        const found = dbChats.find(c => c.id === activeChatId);
        if (!found) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    };

    fetchChats();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract artifacts from latest assistant message if in project
  useEffect(() => {
    const activeChat = [...regularChats, ...lockedChats].find(c => c.id === activeChatId);
    if (activeChat?.type !== "project") {
      setArtifact(null);
      return;
    }

    const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant" && m.content);

    if (lastAssistantMsg) {
      // Look for completed code blocks
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let match;
      let lastMatch = null;
      while ((match = codeBlockRegex.exec(lastAssistantMsg.content)) !== null) {
        lastMatch = match;
      }

      if (lastMatch) {
        const lang = (lastMatch[1] || "text").toLowerCase();
        if (["html", "javascript", "js", "jsx", "tsx", "ts", "css", "json"].includes(lang)) {
          setArtifact({ code: lastMatch[2], language: lang });
          return;
        }
      }

      // Handle streaming (partial) code blocks
      const partialRegex = /```(\w+)?\n([\s\S]*)$/;
      const partialMatch = partialRegex.exec(lastAssistantMsg.content);
      if (partialMatch && !partialMatch[2].includes("```")) {
        const lang = (partialMatch[1] || "text").toLowerCase();
        if (["html", "javascript", "js", "jsx", "tsx", "ts", "css", "json"].includes(lang)) {
          setArtifact({ code: partialMatch[2], language: lang });
          return;
        }
      }
    }
    setArtifact(null);
  }, [messages, activeChatId, regularChats, lockedChats]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setViewingLockedFolder(false);
    setMessages([]);
    setPinnedModel(null);
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  };

  const handleNewProject = async (project: { name: string; description: string; model: string; multiModel: boolean; visibility?: string }) => {
    if (!userId) return;
    const dbChat = await createChat(userId, project.name, "project", false, {
      description: project.description,
      default_model: project.model,
      multi_model: project.multiModel
    });
    if (!dbChat) return;
    const newChat: Chat = {
      id: dbChat.id,
      title: dbChat.title,
      type: "project",
      description: project.description,
      default_model: project.model,
      multi_model: project.multiModel,
      project_rules: ""
    };
    setRegularChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setViewingLockedFolder(false);
    setMessages([]);
    setPinnedModel(null);
  };

  const handleRenameChat = async (id: string, title: string) => {
    setRegularChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    setLockedChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    await dbRenameChat(id, title);
  };

  const handleDeleteChat = async (id: string) => {
    setRegularChats((prev) => prev.filter((c) => c.id !== id));
    setLockedChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
      setPinnedModel(null);
    }
    await dbDeleteChat(id);
  };

  const handleMoveToLocked = async (id: string) => {
    const inRegular = regularChats.find(c => c.id === id);
    const inLocked = lockedChats.find(c => c.id === id);

    if (inRegular) {
      setRegularChats(prev => prev.filter(c => c.id !== id));
      setLockedChats(prev => [...prev, inRegular]);
      await toggleChatLocked(id, true);
      if (activeChatId === id) {
        setActiveChatId(null);
        setMessages([]);
      }
    } else if (inLocked) {
      setLockedChats(prev => prev.filter(c => c.id !== id));
      setRegularChats(prev => [...prev, inLocked]);
      await toggleChatLocked(id, false);
      if (activeChatId === id) {
        setActiveChatId(null);
        setMessages([]);
      }
    }
  };

  const handleSend = async (content: string, modelId: string, attachments?: Attachment[]) => {
    let currentChatId = activeChatId;

    console.log("[ChatPage] handleSend started. activeChatId:", activeChatId, "userId:", userId, "selectedModelId:", modelId);

    // If in New Chat State, create a new chat first
    let isFirstMessage = false;
    if (!currentChatId) {
      if (!userId) {
        console.error("[ChatPage] Cannot create chat: userId is null");
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "❌ **Authentication Error:** Could not initialize session. Please check your system clock and refresh the page.",
        }]);
        setLoading(false);
        return;
      }
      console.log("[ChatPage] Creating new chat for user:", userId);
      const dbChat = await createChat(userId, "New Chat", "chat", false);
      if (!dbChat) {
        console.error("[ChatPage] createChat failed");
        setLoading(false);
        return;
      }
      currentChatId = dbChat.id;
      isFirstMessage = true;
      const newChat: Chat = {
        id: currentChatId,
        title: dbChat.title,
        type: "chat",
      };
      setRegularChats((prev) => [newChat, ...prev]);
      setActiveChatId(currentChatId);
      setViewingLockedFolder(false);

      console.log("[ChatPage] New chat created:", currentChatId);
    }

    // Create user message
    msgCounter++;
    const userMsg: Message = {
      id: `u-${msgCounter}`,
      role: "user",
      content,
      attachments,
    };

    // Determine target models
    const targetModelIds = modelId === "everyone"
      ? AVAILABLE_MODELS.map(m => m.id)
      : [modelId];

    // Create a loading message for EACH target model
    const loadingMessages = targetModelIds.map(id => {
      msgCounter++;
      // Get a short model prefix for context if doing multi-model
      const mName = AVAILABLE_MODELS.find(m => m.id === id)?.label.split(' ')[0] || "Assistant";
      return {
        id: `a-${msgCounter}-${id}`,
        role: "assistant" as const,
        content: modelId === "everyone" ? `**${mName}:** ` : "",
        loading: true,
        modelId: id // Custom prop to track who is who
      };
    });

    // Add user msg + all loading messages to UI
    setMessages((prev) => [...prev, userMsg, ...loadingMessages]);
    setLoading(true);

    // Save user message to DB
    await saveMessage(currentChatId, "user", content, attachments);
    await updateChatTimestamp(currentChatId);

    try {
      // Build recent conversation history for context (last 8 messages to save tokens)
      const MAX_HISTORY = 8;
      const history = [...messages, userMsg]
        .filter((m) => !m.loading && (m.content || (m.attachments && m.attachments.length > 0)))
        .slice(-MAX_HISTORY)
        .map((m) => {
          // Only include attachments for the LATEST user message (not older context)
          const isLatestUserMsg = m.id === userMsg.id;

          if (!isLatestUserMsg || !m.attachments || m.attachments.length === 0) {
            // For text-only messages or older messages, just send text content
            const textContent = m.content || "";
            return { role: m.role, content: textContent };
          }

          // Multimodal format — only for the newest user message
          const formattedContent: any[] = [];

          if (m.content) {
            formattedContent.push({ type: "text", text: m.content });
          }

          m.attachments.forEach(att => {
            if (att.type.startsWith("image/")) {
              formattedContent.push({
                type: "image_url",
                image_url: { url: att.data }
              });
            } else {
              try {
                const base64Content = att.data.split(',')[1];
                if (base64Content) {
                  const decodedText = atob(base64Content);
                  formattedContent.push({
                    type: "text",
                    text: `\n\n--- Attached File: ${att.name} ---\n${decodedText}\n--- End of File ---\n\n`
                  });
                }
              } catch (e) {
                console.error("Failed to decode attachment", e);
              }
            }
          });

          return { role: m.role, content: formattedContent };
        });

      const baseApiMessages: any[] = [];

      // Global Persona injection (Highest priority)
      if (settings.globalPersona) {
        baseApiMessages.push({
          role: "system",
          content: `CRITICAL INSTRUCTIONS (Global Persona): ${settings.globalPersona}\n\nYou MUST follow these rules for every response.`
        });
      }

      // Inject Project Context if applicable
      const activeChat = [...regularChats, ...lockedChats].find(c => c.id === currentChatId);
      if (activeChat?.type === "project" && activeChat.description) {
        baseApiMessages.push({
          role: "system",
          content: `You are working on a Project called "${activeChat.title}". Project Context/Goal: ${activeChat.description} \n\nPlease keep this overarching goal in mind for all responses within this project.`
        });
      }

      baseApiMessages.push(...history);

      // Dispatch an API call for every target model
      await Promise.allSettled(
        targetModelIds.map(async (targetId) => {
          console.log(`[ChatPage] DISPATCHING to model: ${targetId} (Base modelId was: ${modelId})`);
          const lMsg = loadingMessages.find(m => m.modelId === targetId)!;
          const targetModelConfig = AVAILABLE_MODELS.find((m) => m.id === targetId);
          const mNameForPrompt = targetModelConfig?.label || "AI Assistant";
          let mPrefix = `**${mNameForPrompt}**\n\n`;

          const modelApiMessages = [...baseApiMessages];
          const activeChat = [...regularChats, ...lockedChats].find(c => c.id === activeChatId);

          let systemPrompt = "Respond as a helpful AI assistant. ";
          if (activeChat?.type === "project" && activeChat.project_rules) {
            systemPrompt += `\n\nPROJECT GUIDELINES:\n${activeChat.project_rules}\n\n`;
          }
          modelApiMessages.unshift({ role: "system", content: systemPrompt.trim() });

          console.log(`[ChatPage] Final Messages for ${targetId}:`, JSON.stringify(modelApiMessages, null, 2));

          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || "";

            const response = await fetch("/api/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                model: targetId,
                messages: modelApiMessages,
              }),
            });

            if (!response.ok) {
              if (response.status === 429) {
                setTokenLimitReached(true);
                const errorBlock = {
                  type: 'limit_reached',
                  text: "🔴 **Daily Limit Reached**\n\n*You have consumed your 40,000 free tokens for today. Please wait until tomorrow to continue chatting.*"
                };
                setMessages((prev) => prev.map((m) => m.id === lMsg.id ? { ...m, loading: false, content: mPrefix + errorBlock.text } : m));
                return;
              }

              const errorData = await response.json().catch(() => ({}));
              const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: Failed to get response from ${targetId}`;
              setMessages((prev) => prev.map((m) => m.id === lMsg.id ? { ...m, loading: false, content: mPrefix + "**Error:**\n" + errorMessage } : m));
              return;
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let fullReasoning = "";

            setMessages((prev) => prev.map((m) => m.id === lMsg.id ? { ...m, loading: false } : m));

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if ((fullText || fullReasoning) && currentChatId) {
                  const finalContent = fullReasoning ? `<thought>${fullReasoning}</thought>${fullText}` : fullText;
                  await saveMessage(currentChatId, "assistant", mPrefix + finalContent);
                }
                break;
              }

              const chunk = decoder.decode(value);
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const jsonStr = line.replace("data: ", "").trim();
                  if (jsonStr === "[DONE]") {
                    // No need to save here, the outer 'if (done)' handles the final save
                    break;
                  }
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const delta = parsed.choices?.[0]?.delta;
                    if (delta) {
                      const content = delta.content || "";
                      const reasoning = delta.reasoning || "";
                      if (content || reasoning) {
                        fullText += content;
                        fullReasoning += reasoning;
                        setMessages((prev) => prev.map((m) =>
                          m.id === lMsg.id
                            ? { ...m, content: mPrefix + fullText, reasoning: fullReasoning }
                            : m
                        ));
                      }
                    }
                  } catch { }
                }
              }
            }
          } catch (error) {
            setMessages((prev) => prev.map((m) => m.id === lMsg.id ? { ...m, loading: false, content: mPrefix + "Failed to get response." } : m));
          }
        })
      );

    } catch (error) {
      console.error(error);
    }

    // Generate AI title for new chats (fire-and-forget)
    if (isFirstMessage && currentChatId) {
      const chatIdForTitle = currentChatId;
      const messageForTitle = content;

      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token || "";

        fetch("/api/generate-title", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ message: messageForTitle }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log("AI generated title:", data.title);
            if (data.title && data.title !== "New Chat") {
              handleRenameChat(chatIdForTitle, data.title);
            }
          })
          .catch((e) => console.error("Title generation failed:", e));
      });
    }

    setLoading(false);
  };


  return (
    <div className="flex h-screen w-full bg-neutral-950 overflow-hidden">
      <MeridianSidebar
        regularChats={regularChats}
        lockedChats={lockedChats}
        isLockedFolderUnlocked={isLockedFolderUnlocked}
        setIsLockedFolderUnlocked={setIsLockedFolderUnlocked}
        passcodeExists={passcodeExists}
        setPasscodeExists={setPasscodeExists}
        viewingLockedFolder={viewingLockedFolder}
        setViewingLockedFolder={(v) => {
          setActiveChatId(null);
          setMessages([]);
          setPinnedModel(null);
          setViewingLockedFolder(v);
        }}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onNewProject={handleNewProject}
        onSelectChat={async (id) => {
          console.log("onSelectChat called for:", id);
          const isLocked = lockedChats.some(c => c.id === id);
          setActiveChatId(id);
          setViewingLockedFolder(isLocked);
          setPinnedModel(null);

          // Load messages from DB
          const dbMessages = await loadMessages(id);
          const mapped: Message[] = dbMessages.map((m, i) => {
            let content = m.content;
            let reasoning = undefined;

            // Extract <thought>...</thought> if it exists
            const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/);
            if (thoughtMatch) {
              reasoning = thoughtMatch[1];
              content = content.replace(thoughtMatch[0], "");
            }

            return {
              id: m.id,
              role: m.role as "user" | "assistant",
              content: content,
              reasoning: reasoning,
              attachments: m.attachments,
            };
          });
          setMessages(mapped);

          // If project, load project files for ChatInput mentions
          const chatDetails = [...regularChats, ...lockedChats].find(c => c.id === id);
          if (chatDetails?.type === "project") {
            const files = await loadProjectFiles(id);
            setProjectFiles(files);
          } else {
            setProjectFiles([]);
          }
        }}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onMoveToLocked={handleMoveToLocked}
        defaultModel={defaultModel}
        setDefaultModel={setDefaultModel}
      />

      {chatSettingsOpen && (
        <ChatSettingsPanel
          onClose={() => setChatSettingsOpen(false)}
          chat={([...regularChats, ...lockedChats].find(c => c.id === activeChatId) as any) || { id: "", is_pinned: false, show_thought_trace: true }}
          onUpdate={(id, updates) => {
            const updater = (prev: Chat[]) => prev.map(c => c.id === id ? { ...c, ...updates } : c);
            setRegularChats(updater);
            setLockedChats(updater);
          }}
          onClearHistory={async () => {
            if (!userId || !activeChatId) return;
            setMessages([]);
            setChatSettingsOpen(false);
            await deleteMessagesForChat(activeChatId);
          }}
        />
      )}
      <main className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Header */}
          <AnimatePresence>
            {activeChatId && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-14 flex items-center justify-between px-6 bg-transparent absolute top-0 left-0 right-0 z-20"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-medium text-neutral-200">
                    {[...regularChats, ...lockedChats]
                      .find((c) => c.id === activeChatId)?.title || "Chat"}
                  </h2>
                  {[...regularChats, ...lockedChats]
                    .find(c => c.id === activeChatId)?.type === "project" && (
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">Project</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  {[...regularChats, ...lockedChats].find(c => c.id === activeChatId)?.type === "project" && (
                    <Tooltip content="Project Details" delay={300}>
                      <button
                        onClick={() => setProjectDetailsOpen(true)}
                        className="p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="Chat Settings" delay={300}>
                    <button
                      onClick={() => {
                        setChatSettingsOpen(true);
                        setSaveError(null);
                      }}
                      className="p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white relative"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {saveError && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              {saveError}
              <button onClick={() => setSaveError(null)} className="ml-2 hover:opacity-70">✕</button>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {viewingLockedFolder && !activeChatId ? (
                <motion.div
                  key="locked-folder-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 flex flex-col items-center justify-center px-4 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-neutral-500" />
                  </div>
                  <h2 className="text-lg font-medium text-neutral-300 mb-2">
                    Locked Folder
                  </h2>
                  <p className="text-neutral-400 max-w-md">
                    Your private chats are visible in the sidebar.
                  </p>
                </motion.div>
              ) : !activeChatId ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col items-center justify-center px-4 relative"
                >
                  {/* Particles Background */}
                  <ThoughtParticles
                    density={settings.particleDensity}
                    sensitivity={settings.motionSensitivity}
                    color={settings.particleColor}
                    speedMultiplier={settings.particleSpeed}
                    sizeMultiplier={settings.particleSize}
                  />
                  <div className="w-full max-w-[800px] flex flex-col items-center relative z-10">
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center w-full max-w-md flex items-center gap-3"
                      >
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>{authError}</p>
                      </motion.div>
                    )}
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 text-center">
                      {greeting}
                    </h1>
                    <p className="text-neutral-500 mb-8 text-center">
                      How can I help you today?
                    </p>


                    <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-2xl">
                      {[
                        "Build a landing page",
                        "Design a SaaS dashboard",
                        "Generate API structure",
                        "Brainstorm startup ideas"
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInputValue(suggestion);
                            chatInputRef.current?.focus();
                          }}
                          className="rounded-full bg-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition-all cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>

                    <div className="w-[60%] h-px bg-neutral-800 opacity-30 mb-10" />

                    <div className="w-full">
                      <ChatInput
                        ref={chatInputRef}
                        onSend={(msg, model, attachments) => {
                          console.log("[ChatInput] onSend triggered with:", { msg, model, attachments });
                          handleSend(msg, model, attachments);
                        }}
                        disabled={tokenLimitReached}
                        sendDisabled={loading || tokenLimitReached}
                        isNewChat={!activeChatId}
                        isMultiModel={activeChatId ? [...regularChats, ...lockedChats].find(c => c.id === activeChatId)?.multi_model : false}
                        value={inputValue}
                        onChange={setInputValue}
                        defaultModel={defaultModel}
                        pinnedModel={pinnedModel}
                        setPinnedModel={setPinnedModel}
                        projectFiles={projectFiles}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chat-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 relative overflow-hidden"
                >
                  {/* Scrollable messages — extends full height, padded at bottom for input */}
                  <div
                    ref={scrollContainerRef}
                    className="absolute inset-0 overflow-y-auto px-4 pt-14 pb-36"
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                      setShowScrollDown(distanceFromBottom > 150);
                    }}
                  >
                    <div className="max-w-3xl mx-auto w-full">
                      <ChatMessages
                        messages={messages}
                        showThoughtTrace={[...regularChats, ...lockedChats].find(c => c.id === activeChatId)?.show_thought_trace !== false}
                      />
                      <div ref={bottomRef} className="h-4" />
                    </div>
                  </div>

                  {/* Scroll to bottom button */}
                  <AnimatePresence>
                    {showScrollDown && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => {
                          scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
                        }}
                        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors shadow-lg cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Floating input — with bottom fade */}
                  <div className="absolute bottom-0 left-0 right-0 pointer-events-none pb-2 pt-10 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent">
                    <div className="pointer-events-auto max-w-3xl mx-auto w-full">
                      <ChatInput
                        ref={chatInputRef}
                        onSend={handleSend}
                        disabled={tokenLimitReached}
                        sendDisabled={loading || tokenLimitReached}
                        isNewChat={false}
                        isMultiModel={[...regularChats, ...lockedChats].find(c => c.id === activeChatId)?.multi_model}
                        value={inputValue}
                        onChange={setInputValue}
                        defaultModel={defaultModel}
                        pinnedModel={pinnedModel}
                        setPinnedModel={setPinnedModel}
                        projectFiles={projectFiles}
                      />
                      <p className="text-[11px] text-neutral-400 text-center mt-3 mb-1 pointer-events-none opacity-80">
                        AI can make mistakes. Double-check the information.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Artifact Sandbox Split Pane */}
        <AnimatePresence>
          {artifact && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "45%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full border-l border-neutral-800"
            >
              <ArtifactPreview
                code={artifact.code}
                language={artifact.language}
                onClose={() => setArtifact(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>



      <AnimatePresence>
        {projectDetailsOpen && (
          <ProjectDetailsPanel
            onClose={() => setProjectDetailsOpen(false)}
            project={([...regularChats, ...lockedChats].find(c => c.id === activeChatId) as any) || { id: "", title: "Project" }}
            onUpdateRules={(id, rules) => {
              const updater = (prev: Chat[]) => prev.map(c => c.id === id ? { ...c, project_rules: rules } : c);
              setRegularChats(updater);
              setLockedChats(updater);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
