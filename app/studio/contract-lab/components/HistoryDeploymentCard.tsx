import type { ContractHistoryItem } from "../types";

interface HistoryDeploymentCardProps {
  deployment: ContractHistoryItem;
  onInteract: () => void;
}

export const HistoryDeploymentCard = ({ deployment, onInteract }: HistoryDeploymentCardProps) => (
  <button
    onClick={onInteract}
    className="w-full p-2.5 rounded border border-neutral-800 bg-[#0a0a0a] group hover:border-amber-500/20 transition-all text-left"
  >
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-bold text-amber-500/80 uppercase">{deployment.name || "Contract"}</span>
      <span className="text-[9px] text-neutral-700">{new Date(deployment.createdAt).toLocaleDateString()}</span>
    </div>
    <div className="text-[9px] font-mono text-neutral-600 truncate">{deployment.contractAddress}</div>
  </button>
);
