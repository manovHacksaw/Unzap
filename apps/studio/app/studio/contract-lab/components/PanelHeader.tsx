import { clsx } from "clsx";
import { type LucideIcon } from "lucide-react";

interface PanelHeaderProps {
  title: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
}

export const PanelHeader = ({ title, children, icon: Icon }: PanelHeaderProps) => (
  <div className="flex items-center justify-between px-4 h-9 bg-[#0d0d0d] border-b border-neutral-900 flex-shrink-0 select-none">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-500" />}
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{title}</span>
    </div>
    <div className="flex items-center gap-1">{children}</div>
  </div>
);

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number | string;
  theme?: "amber" | "emerald" | "azure" | "mono";
}

export const TabButton = ({ active, onClick, label, badge, theme = "amber" }: TabButtonProps) => {
  const accentClass = {
    amber: "after:bg-amber-500",
    emerald: "after:bg-emerald-500",
    azure: "after:bg-sky-500",
    mono: "after:bg-white",
  }[theme];

  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative px-4 h-full text-[10px] font-bold uppercase tracking-widest transition-all duration-200 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-200",
        active
          ? clsx("text-neutral-100", accentClass, "after:opacity-100")
          : "text-neutral-500 hover:text-neutral-400 after:opacity-0"
      )}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {badge !== undefined && (
          <span className="bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full text-[9px]">
            {badge}
          </span>
        )}
      </div>
    </button>
  );
};
