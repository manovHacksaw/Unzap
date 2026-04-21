"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Settings, X } from "lucide-react";
import { clsx } from "clsx";
import type { IDESettings } from "../types";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: IDESettings;
  updateSetting: <K extends keyof IDESettings>(key: K, value: IDESettings[K]) => void;
}

export function SettingsPanel({ isOpen, onClose, settings, updateSetting }: SettingsPanelProps) {
  const accentColor = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    azure: "text-sky-500",
    mono: "text-white",
  }[settings.theme];

  const accentBg = {
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    azure: "bg-sky-500",
    mono: "bg-white",
  }[settings.theme];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90]"
          />
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed right-0 top-0 bottom-0 w-[380px] bg-[#0d0d0d] border-l border-neutral-900 z-[100] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <Settings className={clsx("w-5 h-5", accentColor)} />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">IDE Settings</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            <div className="flex-1 space-y-12 overflow-y-auto no-scrollbar pb-10">
              {/* Theme Selection */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Interface Theme</span>
                <div className="grid grid-cols-2 gap-3">
                  {(["amber", "emerald", "azure", "mono"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSetting("theme", t)}
                      className={clsx(
                        "p-3 rounded-xl border transition-all text-left group",
                        settings.theme === t ? "border-white/20 bg-white/5" : "border-neutral-900 bg-black/20 hover:border-neutral-800"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={clsx(
                          "w-2 h-2 rounded-full",
                          t === "amber" ? "bg-amber-500" :
                            t === "emerald" ? "bg-emerald-500" :
                              t === "azure" ? "bg-sky-500" : "bg-white"
                        )} />
                        <span className={clsx("text-xs font-bold capitalize", settings.theme === t ? "text-white" : "text-neutral-500")}>{t}</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                        <div className={clsx("h-full w-1/2",
                          t === "amber" ? "bg-amber-500/30" :
                            t === "emerald" ? "bg-emerald-500/30" :
                              t === "azure" ? "bg-sky-500/30" : "bg-white/30"
                        )} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Preferences */}
              <div className="space-y-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Editor Configuration</span>

                <div className="p-5 rounded-2xl bg-black/20 border border-neutral-900 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-neutral-400">Font Size</label>
                      <span className="text-[11px] font-mono text-white">{settings.fontSize}px</span>
                    </div>
                    <input
                      type="range" min="10" max="24" step="1"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))}
                      className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400">Line Numbers</label>
                      <p className="text-[9px] text-neutral-600">Display gutter line count</p>
                    </div>
                    <button
                      onClick={() => updateSetting("showLineNumbers", !settings.showLineNumbers)}
                      className={clsx("w-9 h-5 rounded-full relative transition-colors", settings.showLineNumbers ? accentBg : "bg-neutral-800")}
                    >
                      <motion.div
                        animate={{ x: settings.showLineNumbers ? 18 : 2 }}
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400">Word Wrap</label>
                      <p className="text-[9px] text-neutral-600">Wrap long lines to viewport</p>
                    </div>
                    <button
                      onClick={() => updateSetting("lineWrapping", !settings.lineWrapping)}
                      className={clsx("w-9 h-5 rounded-full relative transition-colors", settings.lineWrapping ? accentBg : "bg-neutral-800")}
                    >
                      <motion.div
                        animate={{ x: settings.lineWrapping ? 18 : 2 }}
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Automation */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Automation</span>
                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-900 bg-black/20">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-neutral-600" />
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-neutral-400">Auto Save</div>
                      <p className="text-[9px] text-neutral-600">Sync drafts to browser local storage</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateSetting("autoSave", !settings.autoSave)}
                    className={clsx("w-8 h-4 rounded-full relative transition-colors", settings.autoSave ? accentBg : "bg-neutral-800")}
                  >
                    <motion.div
                      animate={{ x: settings.autoSave ? 18 : 2 }}
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-900">
              <button
                onClick={onClose}
                className={clsx("w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all text-black", accentBg)}
              >
                Apply Settings
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
