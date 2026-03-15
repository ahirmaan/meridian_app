"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Shield, Check, ChevronDown } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { AVAILABLE_MODELS } from "../../lib/models";
import { getModelLogoSrc } from "../../lib/modelLogos";
import { useSettings, StreamingSpeed, AutoLockTimer } from "../../lib/settingsStore";
import { Brain, Sparkles, Monitor, Info, Trash2, Zap, Clock } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

interface SettingsPanelProps {
  onClose: () => void;
  defaultModel: string;
  setDefaultModel: (id: string) => void;
  onPasscodeChange?: () => void;
}

export function SettingsPanel({
  onClose,
  defaultModel,
  setDefaultModel,
  onPasscodeChange,
}: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [changePasscodeOpen, setChangePasscodeOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const passcodeExists = !!localStorage.getItem("meridian_passcode");

  const handleClearCache = () => {
    if (confirm("Are you sure? This will wipe all local chat history and settings.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
        className="fixed right-0 top-0 h-full w-96 bg-neutral-950 border-l border-neutral-800 z-[160] flex flex-col p-8 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-white font-semibold text-lg tracking-tight">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DEFAULT MODEL */}
        <div className="mb-12">
          <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-2 font-bold opacity-70">
            Default Model
          </h3>
          <p className="text-xs text-neutral-400 mb-4 opacity-80">
            Used when no specific model is selected for a chat.
          </p>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setModelDropdownOpen((p) => !p)}
              className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white hover:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                {(() => {
                  const logo = getModelLogoSrc(AVAILABLE_MODELS.find((m) => m.id === defaultModel)?.id || "");
                  return logo ? <img src={logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" /> : null;
                })()}
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">
                    {AVAILABLE_MODELS.find((m) => m.id === defaultModel)?.label || "Select model"}
                  </span>
                  <span className="text-[11px] text-neutral-400 opacity-80">
                    {AVAILABLE_MODELS.find((m) => m.id === defaultModel)?.provider}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${modelDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {modelDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setDefaultModel(model.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${defaultModel === model.id
                        ? "bg-neutral-800"
                        : "hover:bg-neutral-800/60"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const logo = getModelLogoSrc(model.id);
                          return logo ? <img src={logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" /> : null;
                        })()}
                        <div className="flex flex-col">
                          <span className="text-sm text-white">{model.label}</span>
                          <span className="text-[11px] text-neutral-500">{model.provider}</span>
                        </div>
                      </div>
                      {defaultModel === model.id && (
                        <Check className="w-4 h-4 text-white flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* VISUAL ATMOSPHERE */}
        <div className="mb-12">
          <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-6 font-bold opacity-70 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Atmosphere
          </h3>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-300 font-medium">Particle Density</span>
                <span className="text-[11px] text-neutral-500 font-mono tracking-tighter">{(settings.particleDensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0.1" max="2.0" step="0.1"
                value={settings.particleDensity}
                onChange={(e) => updateSettings({ particleDensity: parseFloat(e.target.value) })}
                className="w-full accent-white h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-300 font-medium">Motion Sensitivity</span>
                <span className="text-[11px] text-neutral-500 font-mono tracking-tighter">{settings.motionSensitivity}px</span>
              </div>
              <input
                type="range" min="1" max="50" step="1"
                value={settings.motionSensitivity}
                onChange={(e) => updateSettings({ motionSensitivity: parseInt(e.target.value) })}
                className="w-full accent-white h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-neutral-300 font-medium">Glassmorphism</span>
                <span className="text-[10px] text-neutral-500">Enable frosted glass effects</span>
              </div>
              <button
                onClick={() => updateSettings({ glassmorphismEnabled: !settings.glassmorphismEnabled })}
                className={`w-10 h-5 rounded-full transition-colors relative flex items-center ${settings.glassmorphismEnabled ? 'bg-white' : 'bg-neutral-800'}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full transition-transform ${settings.glassmorphismEnabled ? 'translate-x-5.5 bg-black' : 'translate-x-1 bg-neutral-500'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-neutral-800/50 mb-12" />

        {/* GLOBAL KNOWLEDGE */}
        <div className="mb-12">
          <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-6 font-bold opacity-70 flex items-center gap-2">
            <Brain className="w-3.5 h-3.5" /> Global Knowledge
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-neutral-300 font-medium">Universal Persona</span>
              <Tooltip content="Instructions that apply to every AI model in every chat.">
                <Info className="w-3.5 h-3.5 text-neutral-600" />
              </Tooltip>
            </div>
            <textarea
              value={settings.globalPersona}
              onChange={(e) => updateSettings({ globalPersona: e.target.value })}
              placeholder="e.g. Always respond in Spanish, keep answers brief..."
              className="w-full h-28 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-all resize-none font-medium leading-relaxed"
            />
          </div>
        </div>

        <div className="w-full h-px bg-neutral-800/50 mb-12" />

        {/* INTELLIGENCE & SPEED */}
        <div className="mb-12">
          <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-6 font-bold opacity-70 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Intelligence
          </h3>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-sm text-neutral-300 font-medium">Streaming Speed</span>
              <div className="grid grid-cols-3 gap-2 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                {(['Normal', 'Fast', 'Instant'] as StreamingSpeed[]).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => updateSettings({ streamingSpeed: speed })}
                    className={`py-2 text-[11px] font-bold rounded-lg transition-all ${settings.streamingSpeed === speed ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-neutral-800/50 mb-12" />

        {/* PRIVACY */}
        <div className="mb-12">
          <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-6 font-bold opacity-70 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Privacy & Security
          </h3>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-300 font-medium">Auto-Lock Timer</span>
                <select
                  value={settings.autoLockTimer}
                  onChange={(e) => updateSettings({ autoLockTimer: e.target.value as AutoLockTimer })}
                  className="bg-neutral-900 border border-neutral-800 text-[11px] text-white rounded-lg px-2 py-1 outline-none"
                >
                  <option value="Off">Off</option>
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                </select>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-300 font-medium">
                    Locked Folder
                  </span>
                  <span className="text-xs text-neutral-400 opacity-80">
                    {passcodeExists ? "Configured" : "Not set"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setChangePasscodeOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-neutral-800 text-sm text-neutral-300 hover:bg-neutral-900 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    {passcodeExists ? "Change" : "Set"}
                  </button>
                  <button
                    onClick={handleClearCache}
                    className="flex items-center justify-center px-4 py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Clear All Cache"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

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