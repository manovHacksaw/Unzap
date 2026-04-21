import { clsx } from "clsx";
import { type LucideIcon } from "lucide-react";

export function ActivityIcon({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "group relative flex h-12 w-full items-center justify-center transition-colors",
        active ? "text-neutral-200" : "text-neutral-600 hover:text-neutral-400"
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
      <Icon className={clsx("w-5 h-5 transition-transform", active ? "scale-110" : "group-hover:scale-105")} strokeWidth={1.5} />
      <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 rounded-md border border-neutral-800 bg-[#0b0b0c]/95 px-2 py-1 text-[10px] font-semibold tracking-[0.16em] text-neutral-300 opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 xl:block">
        {label}
      </div>
    </button>
  );
}
