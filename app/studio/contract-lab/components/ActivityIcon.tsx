import { clsx } from "clsx";
import { type LucideIcon } from "lucide-react";

export function ActivityIcon({ icon: Icon, active, onClick }: { icon: LucideIcon; active: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex items-center justify-center w-full h-12 transition-colors group",
        active ? "text-neutral-200" : "text-neutral-600 hover:text-neutral-400"
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
      <Icon className={clsx("w-5 h-5 transition-transform", active ? "scale-110" : "group-hover:scale-105")} strokeWidth={1.5} />
    </button>
  );
}
