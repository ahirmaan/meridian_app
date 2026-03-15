"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Shield, Check, ChevronDown, Settings } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { AVAILABLE_MODELS } from "../../lib/models";
import { getModelLogoSrc } from "../../lib/modelLogos";
import { useSettings, StreamingSpeed, AutoLockTimer } from "../../lib/settingsStore";
import { Brain, Sparkles, Monitor, Info, Trash2, Zap, Clock, User, Palette, ShieldCheck, Type } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { CustomSelect } from "../ui/CustomSelect";
import { supabase } from "../../lib/supabase";

interface SettingsPanelProps {
  onClose: () => void;
  defaultModel: string;
  setDefaultModel: (id: string) => void;
  onPasscodeChange?: () => void;
  initialTab?: SettingsTab;
}

type SettingsTab = 'General' | 'Personalization' | 'Knowledge' | 'Security' | 'Account';

export function SettingsPanel({
  onClose,
  defaultModel,
  setDefaultModel,
  onPasscodeChange,
  initialTab = 'General',
}: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [draftSettings, setDraftSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [changePasscodeOpen, setChangePasscodeOpen] = useState(false);
  const passcodeExists = !!localStorage.getItem("meridian_passcode");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const updateDraft = (updates: Partial<typeof settings>) => {
    setDraftSettings(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    updateSettings(draftSettings);
    onClose();
  };

  const handleClearCache = () => {
    if (confirm("Are you sure? This will wipe all local chat history and settings.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const tabs: { id: SettingsTab; icon: React.ReactNode; label: string }[] = [
    { id: 'General', icon: <Settings className="w-4 h-4" />, label: 'General' },
    { id: 'Knowledge', icon: <Brain className="w-4 h-4" />, label: 'Knowledge' },
    { id: 'Security', icon: <ShieldCheck className="w-4 h-4" />, label: 'Security' },
    { id: 'Account', icon: <User className="w-4 h-4" />, label: 'Account' },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-neutral-900 border border-neutral-800 w-full max-w-[850px] h-full max-h-[600px] rounded-3xl overflow-hidden shadow-2xl flex pointer-events-auto"
        >
          {/* Sidebar */}
          <div className="w-64 bg-neutral-950/50 border-r border-neutral-800 p-6 flex flex-col gap-2">
            <h2 className="text-white font-bold text-lg mb-6 px-2 tracking-tight">Settings</h2>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                  ? "bg-neutral-800 text-white shadow-lg shadow-black/20"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col relative bg-neutral-900/50">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-y-auto p-10 pt-12 custom-scrollbar">
              <div className="max-w-[500px]">
                <h3 className="text-white font-bold text-xl mb-8 tracking-tight capitalize">{activeTab}</h3>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* GENERAL TAB */}
                    {activeTab === 'General' && (
                      <div className="space-y-8">
                        <section className="space-y-4">
                          <label className="text-sm font-semibold text-neutral-300 block">Default Model</label>
                          <CustomSelect
                            value={defaultModel}
                            options={AVAILABLE_MODELS.map(m => ({
                              value: m.id,
                              label: m.label,
                              icon: getModelLogoSrc(m.id) ? <img src={getModelLogoSrc(m.id)} alt="" className="w-5 h-5 object-contain flex-shrink-0" /> : null,
                              description: m.provider
                            }))}
                            onChange={setDefaultModel}
                          />
                        </section>

                        <section className="space-y-4 pt-4 border-t border-neutral-800/50">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-neutral-300">Streaming Speed</label>
                          </div>
                          <div className="grid grid-cols-3 gap-2 bg-neutral-950 border border-neutral-800 p-1 rounded-xl">
                            {(['Normal', 'Fast', 'Instant'] as StreamingSpeed[]).map((speed) => (
                              <button
                                key={speed}
                                onClick={() => updateDraft({ streamingSpeed: speed })}
                                className={`py-2 text-xs font-bold rounded-lg transition-all ${draftSettings.streamingSpeed === speed ? 'bg-white text-black shadow-lg shadow-black/40' : 'text-neutral-500 hover:text-neutral-300'}`}
                              >
                                {speed}
                              </button>
                            ))}
                          </div>
                        </section>
                      </div>
                    )}


                    {/* KNOWLEDGE TAB */}
                    {activeTab === 'Knowledge' && (
                      <div className="space-y-8">
                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-neutral-300">Universal Persona</label>
                            <Tooltip content="Instructions that apply to every AI model in every chat.">
                              <Info className="w-3.5 h-3.5 text-neutral-600" />
                            </Tooltip>
                          </div>
                          <p className="text-xs text-neutral-500 leading-relaxed">
                            These instructions are injected into the "System Prompt" of every AI model you talk to, across all chats and projects.
                          </p>
                          <textarea
                            value={draftSettings.globalPersona}
                            onChange={(e) => updateDraft({ globalPersona: e.target.value })}
                            placeholder="e.g. Always respond in Spanish, keep answers brief and professional..."
                            className="w-full h-40 bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-all resize-none font-medium leading-relaxed"
                          />
                        </section>
                      </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'Security' && (
                      <div className="space-y-10">
                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-neutral-300">Auto-Lock Timer</span>
                              <span className="text-[11px] text-neutral-500">Automatically lock folders after inactivity.</span>
                            </div>
                            <CustomSelect
                              value={draftSettings.autoLockTimer}
                              options={[
                                { value: 'Off', label: 'Off' },
                                { value: '1m', label: '1 minute' },
                                { value: '5m', label: '5 minutes' },
                                { value: '15m', label: '15 minutes' },
                              ]}
                              onChange={(val) => updateDraft({ autoLockTimer: val as AutoLockTimer })}
                              className="w-32"
                            />
                          </div>
                        </section>

                        <section className="space-y-4 pt-4 border-t border-neutral-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-neutral-300">Locked Folder</span>
                              <span className="text-[11px] text-neutral-500">
                                {passcodeExists ? "Passcode is set and active" : "Protect specific chats with a passcode"}
                              </span>
                            </div>
                            <button
                              onClick={() => setChangePasscodeOpen(true)}
                              className="px-4 py-2 rounded-xl border border-neutral-800 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-all"
                            >
                              {passcodeExists ? "Change Passcode" : "Set Passcode"}
                            </button>
                          </div>
                        </section>

                        <section className="space-y-4 pt-4 border-t border-neutral-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-red-500/80">Clear Local Cache</span>
                              <span className="text-[11px] text-neutral-500">Permanently delete all local data, chats, and settings.</span>
                            </div>
                            <button
                              onClick={handleClearCache}
                              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-all"
                            >
                              Reset Data
                            </button>
                          </div>
                        </section>
                      </div>
                    )}

                    {/* ACCOUNT TAB */}
                    {activeTab === 'Account' && (
                      <div className="flex flex-col items-center justify-center pt-8 text-center space-y-6">
                        <div className="relative group">
                          {user?.user_metadata?.avatar_url ? (
                            <img
                              src={user.user_metadata.avatar_url}
                              alt="Avatar"
                              className="w-24 h-24 rounded-full border-2 border-neutral-700 shadow-2xl object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border-2 border-neutral-700 shadow-xl">
                              <User className="w-10 h-10 text-neutral-500" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-white font-bold text-xl tracking-tight">
                            {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Guest"}
                          </h4>
                          <p className="text-neutral-500 text-sm font-medium">{user?.email}</p>
                        </div>

                        <div className="pt-4 w-full max-w-[340px]">
                          <div className="bg-neutral-950/60 border border-neutral-800/50 rounded-2xl p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-neutral-500 font-medium">Subscription</span>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/10">
                                <Sparkles className="w-3 h-3 text-white" />
                                <span className="text-white font-bold uppercase tracking-wider text-[10px]">Explorer</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-neutral-500 font-medium">Status</span>
                              <span className="text-green-500 font-semibold text-xs flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-6 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-sm flex justify-between items-center">
              <p className="text-[11px] text-neutral-500 font-medium">
                Changes will apply instantly upon saving.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all shadow-xl shadow-white/5 active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {changePasscodeOpen && (
          <ChangePasscodeModal
            onClose={() => setChangePasscodeOpen(false)}
            onSuccess={() => onPasscodeChange?.()}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- PASSCODE MODAL ---------- */

function ChangePasscodeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passcodeExists = !!localStorage.getItem("meridian_passcode");

  const handleSave = () => {
    if (passcodeExists) {
      const stored = localStorage.getItem("meridian_passcode");
      if (current !== stored) {
        setError("Current passcode is incorrect.");
        return;
      }
    }

    if (newPass.length !== 4 || !/^\d+$/.test(newPass)) {
      setError("Passcode must be exactly 4 digits.");
      return;
    }

    if (newPass !== confirm) {
      setError("Passcodes do not match.");
      return;
    }

    localStorage.setItem("meridian_passcode", newPass);
    setSuccess(true);
    onSuccess?.();

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-[360px] shadow-2xl"
      >
        {success ? (
          <div className="flex flex-col items-center text-center py-6">
            <Shield className="w-10 h-10 text-green-500 mb-3" />
            <h2 className="text-white font-semibold">
              Passcode Updated
            </h2>
          </div>
        ) : (
          <>
            <h2 className="text-white font-semibold mb-6">
              {passcodeExists ? "Change Passcode" : "Set Passcode"}
            </h2>

            <div className="flex flex-col gap-4">
              {passcodeExists && (
                <input
                  type="password"
                  maxLength={4}
                  value={current}
                  onChange={(e) =>
                    setCurrent(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Current Passcode"
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-center text-white"
                />
              )}

              <input
                type="password"
                maxLength={4}
                value={newPass}
                onChange={(e) =>
                  setNewPass(e.target.value.replace(/\D/g, ""))
                }
                placeholder="New Passcode"
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-center text-white"
              />

              <input
                type="password"
                maxLength={4}
                value={confirm}
                onChange={(e) =>
                  setConfirm(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Confirm Passcode"
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-center text-white"
              />

              {error && (
                <p className="text-red-500 text-xs">{error}</p>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-neutral-800 text-neutral-400 hover:bg-neutral-800"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200"
              >
                Save
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}