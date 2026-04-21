import { Zap } from "lucide-react";
import type { ContractHistoryItem } from "../types";

interface HistoryDeploymentCardProps {
  deployment: ContractHistoryItem;
  onInteract: () => void;
  onGenerateApp: () => void;
}

export const HistoryDeploymentCard = ({ deployment, onInteract, onGenerateApp }: HistoryDeploymentCardProps) => (
  <div className="w-full p-2.5 rounded border border-neutral-800 bg-[#0a0a0a] group hover:border-amber-500/20 transition-all">
    <div className="flex items-center justify-between mb-1">
      <button onClick={onInteract} className="flex-1 text-left">
        <span className="text-[10px] font-bold text-amber-500/80 uppercase">{deployment.name || "Contract"}</span>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-neutral-700">{new Date(deployment.createdAt).toLocaleDateString()}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onGenerateApp(); }}
          title="Generate starter app"
          className="p-1 rounded hover:bg-amber-500/10 text-neutral-700 hover:text-amber-400 transition-colors"
        >
          <Zap size={10} />
        </button>
      </div>
    </div>
    <button onClick={onInteract} className="w-full text-left">
      <div className="text-[9px] font-mono text-neutral-600 truncate">{deployment.contractAddress}</div>
    </button>
  </div>
);
