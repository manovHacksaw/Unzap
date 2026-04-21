"use client";

import { memo } from "react";
import { clsx } from "clsx";
import { Box, Activity, AlertCircle, Shield } from "lucide-react";

interface StatusBarProps {
  network: string;
  accentColor: string;
  problemCount: number;
  cursorLine: number;
  cursorCol: number;
  walletAddress?: string;
  walletType?: string | null;
  onNetworkSwitch: (n: any) => void;
  onShowProblems: () => void;
  onShowAccount: () => void;
  onShowAuth: () => void;
}

export const StatusBar = memo(function StatusBar({
  network,
  accentColor,
  problemCount,
  cursorLine,
  cursorCol,
  walletAddress,
  walletType,
  onNetworkSwitch,
  onShowProblems,
  onShowAccount,
  onShowAuth,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between h-7 px-3 text-[10px] border-t border-neutral-800 bg-black/40 backdrop-blur-xl text-muted-foreground select-none">
      <div className="flex items-center gap-4 h-full">
        <div 
          className="flex items-center gap-1.5 h-full px-2 hover:bg-white/5 cursor-pointer" 
          onClick={() => onNetworkSwitch(network === "mainnet" ? "sepolia" : "mainnet")}
        >
          <Box className={clsx("w-3 h-3", accentColor)} />
          <span className="font-medium">{network === "mainnet" ? "Mainnet" : "Sepolia"}</span>
        </div>
        <div className="flex items-center gap-1.5 h-full px-2">
          <Activity className="w-3 h-3 text-neutral-600" />
          <span className="font-medium">main*</span>
        </div>
        <div className="flex items-center gap-1.5 h-full px-2 cursor-pointer" onClick={onShowProblems}>
          <AlertCircle className={clsx("w-3 h-3", problemCount > 0 ? "text-red-500" : "text-neutral-700")} />
          <span className="font-medium">{problemCount}</span>
        </div>
        <div className="w-px h-3 bg-neutral-800/50" />
        <div className="font-mono text-neutral-500">Ln {cursorLine}, Col {cursorCol}</div>
      </div>
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-widest font-bold">UTF-8</span>
          <div className="w-px h-3 bg-neutral-800/50" />
          <span className={clsx("font-black uppercase tracking-[0.2em]", accentColor)}>Cairo</span>
        </div>
        <div className="w-px h-3 bg-neutral-800/50" />
        {walletAddress ? (
          <button 
            onClick={onShowAccount} 
            className={clsx(
              "flex items-center gap-1.5 font-bold hover:opacity-80 transition-opacity", 
              walletType === "privy" ? "text-amber-400/90" : "text-sky-400/90"
            )}
          >
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span>{walletType === "privy" ? "Privy" : "Extension"} · {walletAddress.slice(0, 8)}...</span>
          </button>
        ) : (
          <button 
            onClick={onShowAuth} 
            className="flex items-center gap-1.5 font-bold text-neutral-600 hover:text-amber-400 transition-colors"
          >
            <Shield className="w-3 h-3" />
            <span>No Wallet</span>
          </button>
        )}
      </div>
    </div>
  );
});
